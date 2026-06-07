"""
Stage 1 calibration tests — deterministic, fast.

Asserts the synthetic generator + pure-Python OLS calibrator together demonstrate:
  (a) the fitted weights RECOVER the latent ranking of the hidden TRUE_WEIGHTS
      (Spearman >= 0.70 AND clearly above the ~0.53 ACOE-echo baseline — so recovery is
      genuinely learning the truth, not just re-deriving the proxy), and
  (b) the fitted weights BEAT the raw ACOE proxy at held-out prediction of outcomes
      (higher R^2 or lower MSE on a deterministic train/test split).

Also guards the core invariants: TRUE_WEIGHTS really differ from the ACOE rubric points,
and every candidate round-trips with a stashed criterion vector + outcome.
"""

from __future__ import annotations

import math
import unittest

from scripts.synth_outcomes import (
    CRITERION_ORDER,
    SEED,
    TRUE_WEIGHTS,
    _cosine,
    acoe_points,
    generate,
)
from scripts.calibrate import (
    extract_samples,
    fit_weights,
    held_out_comparison,
    spearman,
    spearman_vs_true,
)

# The fitted weights recover Spearman ~0.76 vs TRUE; a degenerate calibrator that merely
# ECHOED the ACOE rubric points (learning nothing) scores only ~0.53 (the baseline asserted
# against in test_recovers_latent_ranking). 0.70 sits clearly above that echo baseline and
# far above chance (Spearman of 23 random weights ~ 0 +/- 0.21).
SPEARMAN_THRESHOLD = 0.70


class CalibrateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.records = generate(seed=SEED, m=80, k=5)

    def test_dataset_shape_and_self_containment(self) -> None:
        self.assertEqual(len(self.records), 80)
        x, y = extract_samples(self.records)
        self.assertEqual(len(x), 80 * 5)
        self.assertEqual(len(y), 80 * 5)
        # every feature row is the full 23-dim criterion vector in [0, 1]
        self.assertTrue(all(len(row) == 23 for row in x))
        self.assertTrue(all(0.0 <= v <= 1.0 for row in x for v in row))
        # y = log1p(views) is finite and non-negative
        self.assertTrue(all(math.isfinite(v) and v >= 0.0 for v in y))

    def test_true_weights_differ_from_acoe(self) -> None:
        cos = _cosine(TRUE_WEIGHTS, acoe_points())
        self.assertLess(cos, 0.97, f"TRUE_WEIGHTS too aligned with ACOE points (cos={cos:.4f})")

    def test_recovers_latent_ranking(self) -> None:
        fitted = fit_weights(self.records)
        rho = spearman_vs_true(fitted)
        self.assertGreaterEqual(
            rho,
            SPEARMAN_THRESHOLD,
            f"Spearman(fitted, TRUE) = {rho:.4f} < {SPEARMAN_THRESHOLD}",
        )
        # Anti-vacuity: a degenerate "calibrator" that simply echoed the ACOE rubric points
        # (learning nothing from outcomes) already scores this baseline. The fitted weights
        # must recover MORE than that by a clear margin, or the recovery claim is circular.
        acoe_echo_rho = spearman(
            [acoe_points()[c] for c in CRITERION_ORDER],
            [TRUE_WEIGHTS[c] for c in CRITERION_ORDER],
        )
        self.assertGreater(
            rho,
            acoe_echo_rho + 0.10,
            f"fitted Spearman ({rho:.4f}) must beat the ACOE-echo baseline "
            f"({acoe_echo_rho:.4f}) by a clear margin — else it just re-derived the proxy",
        )

    def test_beats_acoe_on_held_out(self) -> None:
        comp = held_out_comparison(self.records, test_fraction=0.3)
        self.assertGreater(comp["n_train"], 0)
        self.assertGreater(comp["n_test"], 0)
        # R^2 = 1 - MSE/var(y) on a fixed test set, so r2_fitted > r2_acoe is equivalent to
        # mse_fitted < mse_acoe — assert the single (out-of-generation) condition.
        self.assertGreater(
            comp["r2_fitted"],
            comp["r2_acoe"],
            "fitted weights must beat raw ACOE proxy on held-out outcomes: "
            f"R^2 fitted={comp['r2_fitted']:.4f} vs acoe={comp['r2_acoe']:.4f} "
            f"(MSE fitted={comp['mse_fitted']:.4f} vs acoe={comp['mse_acoe']:.4f})",
        )

    def test_generation_is_deterministic(self) -> None:
        again = generate(seed=SEED, m=80, k=5)
        x1, y1 = extract_samples(self.records)
        x2, y2 = extract_samples(again)
        self.assertEqual(x1, x2)
        self.assertEqual(y1, y2)


if __name__ == "__main__":
    unittest.main()
