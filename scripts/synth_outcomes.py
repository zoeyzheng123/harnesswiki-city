"""
synth_outcomes.py — Stage 1 deterministic synthetic (concept -> ACOE-proxy -> Outcome) dataset.

WHY: Stages 2-3 (calibration / preference learning) need ground-truth outcomes to
build against, but no videos are posted yet. This module fabricates a deterministic
corpus where the TRUE engagement model is DELIBERATELY DIFFERENT from the ACOE rubric
weights. A calibrator fed only the outcomes should then be able to recover the truth
and demonstrably beat the raw ACOE proxy — the whole point of Stage 1 (DECISIONS.md D17).

DETERMINISM: a single random.Random(SEED) drives every draw; a fixed BASE_DT constant
stands in for "now". No datetime.now(), no unseeded randomness. Re-running produces
byte-identical data/synthetic/generations.json.

SHAPE (per the canonical contracts in harness/contracts.py):
  - M generations x K candidates.
  - Each candidate carries a 23-dim criterion-satisfaction vector v in [0,1] (one entry
    per ACOE criterion id). proxy_total = sum(ACOE_points[c] * v[c]) in 0..100 -> the
    RewardScore (score_type='projected'). The vector + proxy are stashed in
    score.rubric_breakdown so the calibrator is self-contained.
  - The REAL latent quality is q = sum(TRUE_WEIGHTS[c] * v[c]) + gaussian noise. Views are
    a heavy-tailed exp(q) * lognormal draw; APV is a logistic of q; likes/comments/shares/
    follows scale off views. Auto-fail proxies (dead frame-1 / off-pool audio) crater to
    seed-jail.
  - The argmax-proxy candidate is marked selected and embedded as the record concept+score;
    all K candidates live in record.candidates; record.outcome is the selected Outcome.

Run as a script to (re)write data/synthetic/generations.json. Import generate() for tests.
"""

from __future__ import annotations

import json
import math
import pathlib
import random
import sys
from datetime import datetime, timedelta, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from harness.contracts import (  # noqa: E402
    Audio,
    Candidate,
    ContentConcept,
    GenerationRecord,
    Outcome,
    RewardScore,
)
from harness.critic import ACOE_RUBRIC, CRITERION_IDS  # noqa: E402

SEED = 20260607
# Fixed stand-in for "now" — NEVER datetime.now() for data values (determinism).
BASE_DT = datetime(2026, 6, 7, 12, 0, 0, tzinfo=timezone.utc)

# Canonical ordering of the 23 criterion ids (HQ-01..05, RL-01..05, EB-01..03,
# VP-01..04, AA-01..03, MD-01..03). Mirrors harness.critic.CRITERION_IDS exactly.
CRITERION_ORDER: tuple[str, ...] = tuple(CRITERION_IDS)

# Map each criterion id back to its ACOE category (for category_breakdown rollups).
_CATEGORY_OF: dict[str, str] = {
    cid: cat
    for cat, body in ACOE_RUBRIC.items()
    for cid in body["criteria"]
}


def acoe_points() -> dict[str, float]:
    """The ACOE 'proxy weights': per-criterion max_points from the rubric (sum == 100)."""
    return {
        cid: float(ACOE_RUBRIC[cat]["criteria"][cid]["max_points"])
        for cat, body in ACOE_RUBRIC.items()
        for cid in body["criteria"]
    }


# ── TRUE_WEIGHTS — the REAL engagement drivers, deliberately != ACOE points. ──
# Rationale (per the task spec):
#   * audio_alignment (AA-*) HIGH: on-pool, beat-locked, rising sound is what the Shorts
#     algorithm actually rewards; ACOE under-weights it (15/100).
#   * retention_and_loop (RL-*) HIGH, esp. RL-04 (delayed resolution / payoff withheld) —
#     the single strongest real retention lever; ACOE gives RL-04 only 4 points.
#   * engagement_bait (EB-*) ~0 or slightly NEGATIVE: overt "rate 1-10 / comment below"
#     bait is penalized by real viewers and de-prioritized by the platform, even though
#     ACOE still pays 10 points for it.
#   * hook_quality (HQ-*) MODERATE: a strong opening helps but is not the dominant driver
#     the 30/100 ACOE weight implies.
#   * visual_production (VP-*) and metadata (MD-*) SMALL: marginal real lift.
TRUE_WEIGHTS: dict[str, float] = {
    # hook_quality — moderate (ACOE: 9/6/5/5/5)
    "HQ-01": 4.0,   # peak motion frame 1 — still matters (anti-static-start), but modest
    "HQ-02": 2.0,
    "HQ-03": 2.0,
    "HQ-04": 3.0,
    "HQ-05": 1.5,
    # retention_and_loop — HIGH (ACOE: 5/9/4/4/3)
    "RL-01": 5.0,
    "RL-02": 9.0,   # seamless loop — drives rewatch/APV
    "RL-03": 6.0,
    "RL-04": 14.0,  # delayed resolution — ACOE badly under-weights this (only 4)
    "RL-05": 4.0,
    # engagement_bait — ~0 / slightly NEGATIVE (ACOE: 5/3/2)
    "EB-01": -2.5,  # overt typed-response bait is penalized in reality
    "EB-02": -1.0,
    "EB-03": -1.5,
    # visual_production — SMALL (ACOE: 4/3/4/4)
    "VP-01": 1.5,
    "VP-02": 1.0,
    "VP-03": 2.0,   # artifact-free render — a small real floor
    "VP-04": 1.0,
    # audio_alignment — HIGH (ACOE: 7/5/3)
    "AA-01": 11.0,  # on approved pool — the gateway to distribution
    "AA-02": 7.0,   # beat-locked peaks
    "AA-03": 6.0,   # rising / early-adopter sound
    # metadata — SMALL (ACOE: 2/2/1)
    "MD-01": 0.5,
    "MD-02": 0.5,
    "MD-03": 0.5,
}

# ── per-criterion satisfaction priors (Beta(a,b) shapes) ──
# Varied so the design matrix has independent per-criterion variance (good conditioning
# for OLS). A couple of criteria are "auto-fail gates": HQ-01 (static start) and AA-01
# (off-pool audio) occasionally draw very low and crater the outcome to seed-jail.
_BETA_SHAPES: dict[str, tuple[float, float]] = {
    "HQ-01": (3.0, 2.0),
    "HQ-02": (2.5, 2.5),
    "HQ-03": (2.0, 2.5),
    "HQ-04": (3.0, 2.0),
    "HQ-05": (2.0, 3.0),
    "RL-01": (3.0, 2.0),
    "RL-02": (2.5, 2.5),
    "RL-03": (2.5, 2.0),
    "RL-04": (2.0, 2.5),
    "RL-05": (2.0, 2.5),
    "EB-01": (2.5, 2.5),
    "EB-02": (2.5, 2.0),
    "EB-03": (2.0, 2.5),
    "VP-01": (3.0, 1.8),
    "VP-02": (2.2, 2.4),
    "VP-03": (3.0, 1.6),
    "VP-04": (2.4, 2.2),
    "AA-01": (3.2, 1.8),
    "AA-02": (2.6, 2.0),
    "AA-03": (2.0, 2.6),
    "MD-01": (2.2, 2.4),
    "MD-02": (2.4, 2.2),
    "MD-03": (2.2, 2.4),
}

# A few illustrative content tokens to make concepts look real (cosmetic only).
_DANCE_STYLES = ("hip-hop power moves", "afrobeats", "contemporary", "breakdance", "jazz-funk")
_BACKGROUNDS = ("neon-magenta void", "stark white", "deep black", "electric blue")
_AUDIO_POOL = (
    ("I Just Might", True, "rising"),
    ("Shabang", True, "rising"),
    ("The Cure", True, "established"),
    ("Janice STFU", False, "saturated"),  # off-pool / avoid (cosmetic label)
    ("The Fate of Ophelia", True, "rising"),
)


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    keys = CRITERION_ORDER
    dot = sum(a[k] * b[k] for k in keys)
    na = math.sqrt(sum(a[k] * a[k] for k in keys))
    nb = math.sqrt(sum(b[k] * b[k] for k in keys))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _assert_weights_differ() -> float:
    """Guard: TRUE_WEIGHTS must be materially different from ACOE points (cos < 0.97)."""
    cos = _cosine(TRUE_WEIGHTS, acoe_points())
    if not (cos < 0.97):
        raise AssertionError(
            f"TRUE_WEIGHTS cosine-sim to ACOE points is {cos:.4f} (>= 0.97); "
            "calibration would have no signal. Make the weightings more distinct."
        )
    return cos


def _sample_vector(rng: random.Random) -> dict[str, float]:
    """Sample a 23-dim criterion-satisfaction vector v in [0,1], one Beta draw per id."""
    return {cid: rng.betavariate(*_BETA_SHAPES[cid]) for cid in CRITERION_ORDER}


def _proxy_total(v: dict[str, float], points: dict[str, float]) -> float:
    """ACOE proxy score in 0..100: sum of per-criterion max_points * satisfaction."""
    return sum(points[c] * v[c] for c in CRITERION_ORDER)


def _category_breakdown(v: dict[str, float], points: dict[str, float]) -> dict[str, float]:
    """Sum proxy points within each ACOE category (mirrors the critic's breakdown shape)."""
    out: dict[str, float] = {cat: 0.0 for cat in ACOE_RUBRIC}
    for c in CRITERION_ORDER:
        out[_CATEGORY_OF[c]] += points[c] * v[c]
    return {k: round(val, 4) for k, val in out.items()}


def _latent_quality(v: dict[str, float], rng: random.Random) -> float:
    """Real latent quality q = <TRUE_WEIGHTS, v> + small gaussian noise."""
    base = sum(TRUE_WEIGHTS[c] * v[c] for c in CRITERION_ORDER)
    return base + rng.gauss(0.0, 1.0)


def _make_outcome(
    v: dict[str, float],
    q: float,
    rng: random.Random,
    collected_at: datetime,
) -> Outcome:
    """Map latent quality -> heavy-tailed views + APV + downstream engagement counts.

    Auto-fail proxies crater to seed-jail (<200 views):
      * v['HQ-01'] very low  => standing/static start (dead frame 1)
      * v['AA-01'] very low  => off approved-audio pool
    """
    seed_jail = v["HQ-01"] < 0.08 or v["AA-01"] < 0.08

    # q ranges roughly 0..~80 (sum of TRUE_WEIGHTS ~= 86 at v=1). Scale into a sane
    # exponent, then multiply by a heavy-tailed lognormal multiplier.
    scaled = q / 12.0  # ~0..7 exponent band
    lognormal_mult = math.exp(rng.gauss(0.0, 0.6))  # heavy-tailed view dispersion
    raw_views = math.exp(scaled) * 60.0 * lognormal_mult

    if seed_jail:
        views = rng.randint(20, 199)
    else:
        views = max(1, round(raw_views))

    # impressions slightly exceed views (not every impression -> view).
    impressions = max(views, round(views * (1.0 + 0.3 + 0.5 * rng.random())))

    # APV via logistic of q, scaled into [0, 1.4] (>1 == rewatch loops).
    apv = 1.4 / (1.0 + math.exp(-(q - 30.0) / 9.0))
    apv = max(0.0, min(1.4, apv + rng.gauss(0.0, 0.03)))
    if seed_jail:
        apv = min(apv, 0.35)

    # engagement counts proportional to views with multiplicative noise.
    def _rate(base: float) -> int:
        return max(0, round(views * base * (0.6 + 0.8 * rng.random())))

    likes = _rate(0.045)
    comments = _rate(0.004)
    shares = _rate(0.006)
    follows = _rate(0.0015)

    maturity_hours = round(24.0 + 24.0 * rng.random(), 2)

    return Outcome(
        source="synthetic",
        collected_at=collected_at,
        maturity_hours=maturity_hours,
        platform="youtube_shorts",
        impressions=impressions,
        views=views,
        avg_percent_viewed=round(apv, 4),
        likes=likes,
        comments=comments,
        shares=shares,
        follows=follows,
    )


def _make_concept(
    gen_number: int,
    variant_idx: int,
    v: dict[str, float],
    rng: random.Random,
) -> ContentConcept:
    """A minimal-but-valid ContentConcept; elements = the well-satisfied criterion ids."""
    style = _DANCE_STYLES[rng.randrange(len(_DANCE_STYLES))]
    bg = _BACKGROUNDS[rng.randrange(len(_BACKGROUNDS))]
    audio_name, is_rising, recency = _AUDIO_POOL[rng.randrange(len(_AUDIO_POOL))]
    bpm = float(rng.randrange(96, 132))
    # satisfied criteria (v >= 0.6) double as element tags / storyboard anchors.
    satisfied = [c for c in CRITERION_ORDER if v[c] >= 0.6]
    return ContentConcept(
        id=f"cc_synth_{gen_number:03d}_{variant_idx}",  # deterministic (contracts default is uuid4)
        generation_number=gen_number,
        trend_context_id=f"tc_synth_{gen_number:03d}",
        harness_state_version="v0-synth",
        hook=f"Frame 1: a mid-air freeze on the beat against a {bg}.",
        format="peak_motion_loop",
        angle=f"A {style} combo locked to the drop, payoff withheld to the final beat.",
        script=(
            "Hard cut into a mid-air freeze; build the combo, "
            "but hold the signature move until the very end, then loop to frame 1."
        ),
        visual_prompt=(
            f"A single dancer, {style}, isolated on a {bg}, reflective outfit, "
            "4K, anatomically stable, loop-ready."
        ),
        elements=satisfied or ["peak_motion_frame1"],
        dance_style=style,
        audio=Audio(name=audio_name, bpm=bpm, sound_recency=recency, is_rising_sound=is_rising),
        cut_frequency=round(0.25 + 0.45 * rng.random(), 3),
        duration_sec=rng.randrange(13, 19),
    )


def _make_score(
    concept_id: str,
    gen_number: int,
    variant_idx: int,
    v: dict[str, float],
    points: dict[str, float],
) -> RewardScore:
    """RewardScore carrying the ACOE proxy total + the stashed criterion vector."""
    proxy_total = _proxy_total(v, points)
    breakdown = _category_breakdown(v, points)
    return RewardScore(
        id=f"rs_synth_{gen_number:03d}_{variant_idx}",  # deterministic (contracts default is uuid4)
        concept_id=concept_id,
        generation_number=gen_number,
        harness_state_version="v0-synth",
        weighted_total=round(proxy_total / 100.0, 6),
        policy_flag=False,
        judge_rationale=f"Synthetic ACOE proxy projection: {proxy_total:.1f}/100.",
        predicted_score=round(proxy_total / 100.0, 6),
        scored_by="synth-acoe-proxy",
        total_score=round(proxy_total, 4),
        category_breakdown=breakdown,
        score_type="projected",
        evidence_coverage=0.0,
        rubric_breakdown={
            "criterion_vector": {c: round(v[c], 6) for c in CRITERION_ORDER},
            "proxy_total": round(proxy_total, 6),
        },
    )


def generate(seed: int = SEED, m: int = 80, k: int = 5) -> list[GenerationRecord]:
    """Build the deterministic synthetic corpus in-memory (M generations x K candidates)."""
    _assert_weights_differ()
    rng = random.Random(seed)
    points = acoe_points()
    records: list[GenerationRecord] = []

    for gen in range(1, m + 1):
        created_at = BASE_DT + timedelta(hours=gen)
        collected_at = created_at + timedelta(hours=48)
        candidates: list[Candidate] = []
        best_idx = 0
        best_proxy = float("-inf")

        for j in range(k):
            v = _sample_vector(rng)
            # ~5% of candidates are auto-fail duds (dead frame-1 or off-pool audio): force a
            # gate criterion below the seed-jail threshold so the auto-fail path actually fires
            # (otherwise the Beta priors almost never dip under 0.08 and the branch is dead).
            if rng.random() < 0.05:
                v["HQ-01" if rng.random() < 0.5 else "AA-01"] = rng.uniform(0.0, 0.07)
            concept = _make_concept(gen, j, v, rng)
            score = _make_score(concept.id, gen, j, v, points)
            q = _latent_quality(v, rng)
            outcome = _make_outcome(v, q, rng, collected_at)
            candidates.append(
                Candidate(
                    variant_id=f"g{gen:03d}_c{j}",
                    concept=concept,
                    score=score,
                    selected=False,
                    outcome=outcome,
                )
            )
            proxy = score.total_score or 0.0
            if proxy > best_proxy:
                best_proxy = proxy
                best_idx = j

        candidates[best_idx].selected = True
        chosen = candidates[best_idx]

        records.append(
            GenerationRecord(
                id=f"gr_synth_{gen:03d}",  # deterministic (contracts default is uuid4)
                generation_number=gen,
                created_at=created_at,
                trend_context_id=chosen.concept.trend_context_id,
                concept=chosen.concept,
                score=chosen.score,
                harness_state_version_before="v0-synth",
                harness_state_version_after="v0-synth",
                outcome=chosen.outcome,
                candidates=candidates,
                rubric_version="ACOE-YT-SHORTS-v2.0",
                selected=True,
            )
        )

    return records


def _write(records: list[GenerationRecord], out_path: pathlib.Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = [r.model_dump(mode="json", exclude_none=True) for r in records]
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _reload_and_validate(out_path: pathlib.Path, expected: int, k: int) -> None:
    raw = json.loads(out_path.read_text(encoding="utf-8"))
    assert len(raw) == expected, f"expected {expected} records, got {len(raw)}"
    for row in raw:
        rec = GenerationRecord.model_validate(row)
        assert rec.outcome is not None, "record.outcome must be populated"
        assert rec.candidates is not None and len(rec.candidates) == k, "candidates must be populated"
        assert any(c.selected for c in rec.candidates), "exactly one candidate must be selected"
        for cand in rec.candidates:
            assert cand.outcome is not None, "every candidate must carry an outcome"
            rb = cand.score.rubric_breakdown or {}
            assert "criterion_vector" in rb and len(rb["criterion_vector"]) == 23, "criterion vector must be stashed"
            assert "proxy_total" in rb, "proxy_total must be stashed"


if __name__ == "__main__":
    M, K = 80, 5
    cos = _assert_weights_differ()
    recs = generate(SEED, M, K)
    out = ROOT / "data" / "synthetic" / "generations.json"
    _write(recs, out)
    _reload_and_validate(out, M, K)
    total_candidates = sum(len(r.candidates or []) for r in recs)
    print(f"TRUE_WEIGHTS vs ACOE points cosine-sim = {cos:.4f} (< 0.97 OK)")
    print(f"Wrote {len(recs)} generations x {K} candidates = {total_candidates} samples -> {out}")
    print("Round-trip validation: every record + all candidates + outcomes OK.")
