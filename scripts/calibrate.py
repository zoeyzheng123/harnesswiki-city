"""
calibrate.py — Stage 1 calibrator: recover the TRUE engagement weights from outcomes.

Fits a pure-Python ordinary-least-squares model predicting y = log1p(views) from the
23-dim ACOE criterion-satisfaction vector (with an intercept). The fitted weights are
then compared against:
  * the ACOE 'proxy weights' (per-criterion max_points), and
  * the hidden TRUE_WEIGHTS the synthetic generator used.

The headline results: (a) Spearman rank correlation between fitted and TRUE weights
(does calibration recover the latent ranking?), and (b) held-out predictive accuracy
of the fitted weights vs the raw ACOE proxy (does calibration beat the rubric?).

NO third-party numerics: the normal equations (X^T X + lambda*I) w = X^T y are solved
with a small in-module Gaussian-elimination routine. No numpy / scipy / sklearn / pandas.
"""

from __future__ import annotations

import json
import math
import pathlib
import sys
from typing import Any, Optional

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from harness.contracts import GenerationRecord  # noqa: E402

from scripts.synth_outcomes import (  # noqa: E402
    CRITERION_ORDER,
    SEED,
    TRUE_WEIGHTS,
    acoe_points,
    generate,
)

DATA_PATH = ROOT / "data" / "synthetic" / "generations.json"
RIDGE_LAMBDA = 1e-6  # tiny Tikhonov regularization for numerical stability


# ─────────────────────────── data extraction ───────────────────────────
def _records() -> list[GenerationRecord]:
    """Self-contained: rebuild the deterministic corpus in-memory.

    No silent file fallback — a generator regression should surface, not be masked by a
    stale (gitignored) data/synthetic/generations.json. Use load_from_json() explicitly
    if you want to calibrate an on-disk dataset instead.
    """
    return generate()


def load_from_json() -> list[GenerationRecord]:
    """Explicit on-disk loader (the build-verifier round-trips this separately)."""
    raw = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    return [GenerationRecord.model_validate(row) for row in raw]


def extract_samples(records: list[GenerationRecord]) -> tuple[list[list[float]], list[float]]:
    """Flatten every candidate -> (criterion_vector X-row, y=log1p(views)).

    Pulls the 23-dim vector stashed in score.rubric_breakdown and the candidate's
    own Outcome.views, so each of the M*K candidates is one training sample.
    """
    rows: list[list[float]] = []
    ys: list[float] = []
    for rec in records:
        candidates = rec.candidates or []
        for cand in candidates:
            rb = cand.score.rubric_breakdown or {}
            cv = rb.get("criterion_vector")
            if not cv:
                continue
            outcome = cand.outcome
            if outcome is None or outcome.views is None:
                continue
            rows.append([float(cv[c]) for c in CRITERION_ORDER])
            ys.append(math.log1p(float(outcome.views)))
    return rows, ys


# ─────────────────────────── linear algebra ───────────────────────────
def _solve(matrix: list[list[float]], rhs: list[float]) -> list[float]:
    """Solve A x = b via Gaussian elimination with partial pivoting. A is modified in place."""
    n = len(rhs)
    aug = [row[:] + [rhs[i]] for i, row in enumerate(matrix)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(aug[r][col]))
        if abs(aug[pivot][col]) < 1e-15:
            raise ValueError("singular matrix in OLS normal equations")
        aug[col], aug[pivot] = aug[pivot], aug[col]
        pinv = 1.0 / aug[col][col]
        for r in range(n):
            if r == col:
                continue
            factor = aug[r][col] * pinv
            if factor == 0.0:
                continue
            for c in range(col, n + 1):
                aug[r][c] -= factor * aug[col][c]
    return [aug[i][n] / aug[i][i] for i in range(n)]


def _ols(x: list[list[float]], y: list[float], ridge: float = RIDGE_LAMBDA) -> tuple[list[float], float]:
    """Ordinary least squares with an intercept via ridge-stabilized normal equations.

    Returns (weights over the feature columns, intercept). The design matrix is
    augmented with a leading constant column; ridge is applied only to the slopes.
    """
    n_features = len(x[0])
    # design = [1, f0, f1, ...]; p = n_features + 1
    p = n_features + 1
    xtx = [[0.0] * p for _ in range(p)]
    xty = [0.0] * p
    for row, target in zip(x, y):
        aug_row = [1.0] + row
        for i in range(p):
            xty[i] += aug_row[i] * target
            ai = aug_row[i]
            xtx_i = xtx[i]
            for j in range(p):
                xtx_i[j] += ai * aug_row[j]
    # ridge on the slope diagonal (skip the intercept at index 0)
    for i in range(1, p):
        xtx[i][i] += ridge
    coefs = _solve(xtx, xty)
    intercept = coefs[0]
    weights = coefs[1:]
    return weights, intercept


# ─────────────────────────── public fit API ───────────────────────────
def fit_weights(
    records: list[GenerationRecord],
    ridge: float = RIDGE_LAMBDA,
) -> dict[str, float]:
    """Fit OLS weights predicting log1p(views) from the 23-dim criterion vector.

    Returns {criterion_id: fitted_weight}. The intercept is fit but not returned here
    (use fit_weights_with_intercept for the full model).
    """
    weights, _ = fit_weights_with_intercept(records, ridge=ridge)
    return weights


def fit_weights_with_intercept(
    records: list[GenerationRecord],
    ridge: float = RIDGE_LAMBDA,
) -> tuple[dict[str, float], float]:
    """Like fit_weights but also returns the fitted intercept."""
    x, y = extract_samples(records)
    if not x:
        raise ValueError("no samples extracted from records")
    weights, intercept = _ols(x, y, ridge=ridge)
    return {c: weights[i] for i, c in enumerate(CRITERION_ORDER)}, intercept


# ─────────────────────────── metrics ───────────────────────────
def _ranks(values: list[float]) -> list[float]:
    """Average ('fractional') ranks, handling ties."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        avg_rank = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[order[k]] = avg_rank
        i = j + 1
    return ranks


def _pearson(a: list[float], b: list[float]) -> float:
    n = len(a)
    if n == 0:
        return 0.0
    ma = sum(a) / n
    mb = sum(b) / n
    cov = sum((a[i] - ma) * (b[i] - mb) for i in range(n))
    va = math.sqrt(sum((a[i] - ma) ** 2 for i in range(n)))
    vb = math.sqrt(sum((b[i] - mb) ** 2 for i in range(n)))
    if va == 0 or vb == 0:
        return 0.0
    return cov / (va * vb)


def spearman(a: list[float], b: list[float]) -> float:
    """Spearman rank correlation = Pearson correlation of the ranks."""
    return _pearson(_ranks(a), _ranks(b))


def spearman_vs_true(fitted: dict[str, float]) -> float:
    """Spearman between fitted weights and TRUE_WEIGHTS over the 23 criteria."""
    f = [fitted[c] for c in CRITERION_ORDER]
    t = [TRUE_WEIGHTS[c] for c in CRITERION_ORDER]
    return spearman(f, t)


def _predict(x_row: list[float], weights: list[float], intercept: float) -> float:
    return intercept + sum(w * v for w, v in zip(weights, x_row))


def _r2(actual: list[float], predicted: list[float]) -> float:
    n = len(actual)
    mean = sum(actual) / n
    ss_tot = sum((a - mean) ** 2 for a in actual)
    ss_res = sum((a - p) ** 2 for a, p in zip(actual, predicted))
    if ss_tot == 0:
        return 0.0
    return 1.0 - ss_res / ss_tot


def _mse(actual: list[float], predicted: list[float]) -> float:
    return sum((a - p) ** 2 for a, p in zip(actual, predicted)) / len(actual)


def _best_scale_intercept(scores: list[float], y: list[float]) -> tuple[float, float]:
    """Best linear (1-feature OLS) mapping of a scalar predictor `scores` onto y.

    Gives the ACOE proxy its fairest shot as a predictor: fit slope+intercept so the
    comparison is about RANKING power (the weights), not units/offset.
    """
    n = len(scores)
    ms = sum(scores) / n
    my = sum(y) / n
    cov = sum((scores[i] - ms) * (y[i] - my) for i in range(n))
    var = sum((scores[i] - ms) ** 2 for i in range(n))
    if var == 0:
        return 0.0, my
    slope = cov / var
    intercept = my - slope * ms
    return slope, intercept


def held_out_comparison(
    records: list[GenerationRecord],
    test_fraction: float = 0.3,
    ridge: float = RIDGE_LAMBDA,
) -> dict[str, float]:
    """Train/test split: compare fitted-weights vs raw-ACOE-proxy as predictors of y.

    Deterministic split by GENERATION (every Nth record to test) so candidates from one
    generation never straddle the train/test boundary — a genuine out-of-generation
    estimate, not a leaky per-candidate stride. Both predictors are given an intercept;
    the ACOE proxy additionally gets a best-fit scale so the comparison is purely about
    which WEIGHTS rank outcomes better.
    """
    points = acoe_points()
    acoe_vec = [points[c] for c in CRITERION_ORDER]

    stride = max(2, round(1.0 / test_fraction))
    train_recs = [r for i, r in enumerate(records) if i % stride != 0]
    test_recs = [r for i, r in enumerate(records) if i % stride == 0]
    train_x, train_y = extract_samples(train_recs)
    test_x, test_y = extract_samples(test_recs)

    # fitted model on train
    weights, intercept = _ols(train_x, train_y, ridge=ridge)
    fitted_pred = [_predict(row, weights, intercept) for row in test_x]

    # ACOE proxy: raw dot(points, v), then best train-fit scale+intercept
    train_proxy = [sum(a * b for a, b in zip(row, acoe_vec)) for row in train_x]
    test_proxy = [sum(a * b for a, b in zip(row, acoe_vec)) for row in test_x]
    slope, b0 = _best_scale_intercept(train_proxy, train_y)
    acoe_pred = [slope * p + b0 for p in test_proxy]

    return {
        "r2_fitted": _r2(test_y, fitted_pred),
        "r2_acoe": _r2(test_y, acoe_pred),
        "mse_fitted": _mse(test_y, fitted_pred),
        "mse_acoe": _mse(test_y, acoe_pred),
        "n_train": float(len(train_x)),
        "n_test": float(len(test_x)),
    }


# ─────────────────── Bradley-Terry preference reward ───────────────────
# A feature-based Bradley-Terry model: P(A ≻ B) = sigmoid(w · (x_A − x_B)), fit from
# PAIRWISE outcome comparisons (which candidate actually got more views). This is the
# representation that suits a learning signal better than an absolute 0–100 score —
# rankings are what judges/outcomes give reliably; the scale is "A vs B", not points.
# Pure-Python logistic regression on feature differences; no intercept (it's a difference).

def build_pairs(records: list[GenerationRecord]) -> list[tuple[list[float], int]]:
    """Within-generation pairs: (x_A − x_B, label=1 if A's real views beat B's).

    Uses the contrastive batch the loop already generates (`rec.candidates`). Skips ties
    and candidates lacking a stashed criterion vector or a real outcome.
    """
    pairs: list[tuple[list[float], int]] = []
    for rec in records:
        items: list[tuple[list[float], float]] = []
        for cand in (rec.candidates or []):
            rb = cand.score.rubric_breakdown or {}
            cv = rb.get("criterion_vector")
            outcome = cand.outcome
            if cv and outcome is not None and outcome.views is not None:
                items.append(([float(cv[c]) for c in CRITERION_ORDER], float(outcome.views)))
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                (xi, vi), (xj, vj) = items[i], items[j]
                if vi == vj:
                    continue
                pairs.append(([a - b for a, b in zip(xi, xj)], 1 if vi > vj else 0))
    return pairs


def fit_bradley_terry(
    pairs: list[tuple[list[float], int]],
    ridge: float = 1e-4,
    iters: int = 3000,
    lr: float = 0.5,
) -> dict[str, float]:
    """Logistic regression on the feature differences (no intercept) via batch gradient
    descent. Deterministic (weights start at 0, no randomness). Returns {criterion: weight}."""
    if not pairs:
        raise ValueError("no pairs to fit")
    n_features = len(pairs[0][0])
    w = [0.0] * n_features
    n = len(pairs)
    for _ in range(iters):
        grad = [0.0] * n_features
        for x, y in pairs:
            z = max(-30.0, min(30.0, sum(w[k] * x[k] for k in range(n_features))))
            err = 1.0 / (1.0 + math.exp(-z)) - y
            for k in range(n_features):
                grad[k] += err * x[k]
        for k in range(n_features):
            w[k] -= lr * (grad[k] / n + ridge * w[k])
    return {c: w[i] for i, c in enumerate(CRITERION_ORDER)}


def pairwise_accuracy(weights: dict[str, float], pairs: list[tuple[list[float], int]]) -> float:
    """Fraction of pairs whose real winner is correctly predicted by sign(w · x_diff)."""
    if not pairs:
        return 0.0
    w = [weights[c] for c in CRITERION_ORDER]
    correct = sum(1 for x, y in pairs if (1 if sum(w[k] * x[k] for k in range(len(w))) > 0 else 0) == y)
    return correct / len(pairs)


def benchmark_preference(
    records: list[GenerationRecord],
    test_fraction: float = 0.3,
    bt_ridge: float = 1e-4,
) -> dict[str, Any]:
    """Held-out (grouped-by-generation) comparison of three rankers on real pairwise
    winners: the Bradley-Terry model (fit on train pairs), the OLS-on-log-views
    calibrator (fit on the same split), and the raw ACOE proxy (the absolute 0–100
    scoring baseline). Reports test pairwise accuracy + Spearman vs the hidden TRUE_WEIGHTS."""
    stride = max(2, round(1.0 / test_fraction))
    train_recs = [r for i, r in enumerate(records) if i % stride != 0]
    test_recs = [r for i, r in enumerate(records) if i % stride == 0]
    train_pairs = build_pairs(train_recs)
    test_pairs = build_pairs(test_recs)

    bt = fit_bradley_terry(train_pairs, ridge=bt_ridge)
    ols = fit_weights(train_recs)      # OLS on log1p(views), same split
    acoe = acoe_points()               # the absolute 0–100 proxy, used as a ranker

    return {
        "bt":   {"acc": pairwise_accuracy(bt, test_pairs),   "spearman": spearman_vs_true(bt)},
        "ols":  {"acc": pairwise_accuracy(ols, test_pairs),  "spearman": spearman_vs_true(ols)},
        "acoe": {"acc": pairwise_accuracy(acoe, test_pairs), "spearman": spearman_vs_true(acoe)},
        "n_train_pairs": len(train_pairs),
        "n_test_pairs": len(test_pairs),
    }


# ─────────────────────────── reporting ───────────────────────────
def _fmt_table(fitted: dict[str, float]) -> str:
    points = acoe_points()
    lines = [f"{'id':<7}{'ACOE_pts':>10}{'TRUE_wt':>10}{'fitted_wt':>12}"]
    for c in CRITERION_ORDER:
        lines.append(f"{c:<7}{points[c]:>10.2f}{TRUE_WEIGHTS[c]:>10.2f}{fitted[c]:>12.3f}")
    return "\n".join(lines)


def main() -> None:
    records = _records()
    fitted, intercept = fit_weights_with_intercept(records)
    rho = spearman_vs_true(fitted)
    comp = held_out_comparison(records)

    print("=== ACOE proxy weights vs TRUE weights vs fitted weights ===")
    print(_fmt_table(fitted))
    print(f"\nfitted intercept: {intercept:.4f}")
    print(f"\nSpearman(fitted, TRUE_WEIGHTS) = {rho:.4f}")
    print(
        "\nHeld-out (predicting log1p(views)):\n"
        f"  fitted weights : R^2 = {comp['r2_fitted']:.4f}  MSE = {comp['mse_fitted']:.4f}\n"
        f"  raw ACOE proxy : R^2 = {comp['r2_acoe']:.4f}  MSE = {comp['mse_acoe']:.4f}\n"
        f"  (n_train={int(comp['n_train'])}, n_test={int(comp['n_test'])})"
    )
    # For a fixed test set R^2 = 1 - MSE/var(y), so r2_fitted > r2_acoe and
    # mse_fitted < mse_acoe are equivalent — report the single condition.
    beats = comp["r2_fitted"] > comp["r2_acoe"]
    print(f"\nCalibration beats raw ACOE proxy: {beats}")
    print(f"Recovers latent ranking (Spearman >= 0.70): {rho >= 0.70}")

    # Preference (Bradley-Terry) reward vs the absolute proxy, on held-out pairwise winners.
    pref = benchmark_preference(records)
    print(
        "\n=== Preference reward: held-out pairwise-winner accuracy (grouped split) ===\n"
        f"  bradley-terry : acc = {pref['bt']['acc']:.3f}  spearman(TRUE) = {pref['bt']['spearman']:.3f}\n"
        f"  OLS log-views : acc = {pref['ols']['acc']:.3f}  spearman(TRUE) = {pref['ols']['spearman']:.3f}\n"
        f"  raw ACOE 0-100: acc = {pref['acoe']['acc']:.3f}  spearman(TRUE) = {pref['acoe']['spearman']:.3f}\n"
        f"  (n_train_pairs={pref['n_train_pairs']}, n_test_pairs={pref['n_test_pairs']})\n"
        f"  -> preference learning beats the absolute proxy at predicting real winners: "
        f"{pref['bt']['acc'] > pref['acoe']['acc']}"
    )


if __name__ == "__main__":
    main()
