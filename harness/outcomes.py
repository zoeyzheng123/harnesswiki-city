"""Outcome producers for prompt-engagement training data.

The real producer will eventually poll YouTube after a post matures. Until then,
this module creates deterministic seven-day synthetic outcomes whose view bands
match the ACOE distribution tiers. Synthetic labels are deliberately marked as
such so they can never be confused with observed platform outcomes.
"""

from __future__ import annotations

import hashlib
import math
from datetime import datetime, timedelta, timezone

from harness.contracts import ContentConcept, GenerationRecord, Outcome, RewardScore
from harness.weave_trace import op

WEEK_HOURS = 168.0


def _score_100(score: RewardScore) -> float:
    value = score.total_score
    if value is None:
        value = score.weighted_total * 100.0
    return max(0.0, min(100.0, float(value)))


def _stable_multiplier(concept: ContentConcept) -> float:
    """Return a small deterministic prompt-specific multiplier in [0.97, 1.03]."""
    payload = "|".join(
        [
            concept.seedance_prompt or concept.visual_prompt,
            concept.script,
            concept.hook,
            ",".join(concept.elements),
        ]
    )
    digest = hashlib.sha256(payload.encode("utf-8")).digest()
    unit = int.from_bytes(digest[:8], "big") / float(2**64 - 1)
    return 0.97 + 0.06 * unit


def _views_from_score(score_100: float, multiplier: float) -> int:
    """Map ACOE score to a tier-consistent, heavy-tailed seven-day view count."""
    if score_100 < 65.0:
        progress = score_100 / 65.0
        views = 20.0 + 179.0 * progress**2
        return max(20, min(199, round(views * multiplier)))

    if score_100 < 85.0:
        progress = (score_100 - 65.0) / 20.0
        views = 200.0 * math.exp(math.log(14000.0 / 200.0) * progress)
        return max(200, min(13_999, round(views * multiplier)))

    progress = (score_100 - 85.0) / 15.0
    views = 14_000.0 * math.exp(math.log(500_000.0 / 14_000.0) * progress)
    return max(14_000, min(500_000, round(views * multiplier)))


@op
def synthetic_week_one_outcome(
    concept: ContentConcept,
    score: RewardScore,
) -> Outcome:
    """Create a deterministic synthetic seven-day outcome for one scored prompt."""
    score_100 = _score_100(score)
    views = _views_from_score(score_100, _stable_multiplier(concept))
    quality = score_100 / 100.0
    apv = max(0.18, min(1.35, 0.20 + 1.15 * quality**1.35))

    created_at = concept.created_at or score.scored_at or datetime.now(timezone.utc)
    collected_at = created_at + timedelta(hours=WEEK_HOURS)

    return Outcome(
        collected_at=collected_at,
        maturity_hours=WEEK_HOURS,
        platform="youtube_shorts",
        source="synthetic",
        impressions=max(views, round(views * (1.85 - 0.55 * quality))),
        views=views,
        avg_percent_viewed=round(apv, 4),
        likes=round(views * (0.018 + 0.045 * quality)),
        comments=round(views * (0.0015 + 0.006 * quality)),
        shares=round(views * (0.001 + 0.009 * quality)),
        follows=round(views * (0.0003 + 0.0022 * quality)),
    )


def attach_synthetic_week_one_outcomes(
    records: list[GenerationRecord],
) -> list[GenerationRecord]:
    """Replace candidate labels with tier-consistent bootstrap outcomes.

    The calibration benchmark in ``scripts/synth_outcomes.py`` intentionally
    makes outcome truth disagree with the rubric proxy. W&B bootstrap data has a
    different purpose: exercise prompt-to-view training plumbing with labels
    that are explicitly consistent with the current critic result.
    """
    for record in records:
        selected_outcome = None
        for candidate in record.candidates or []:
            candidate.outcome = synthetic_week_one_outcome(
                candidate.concept,
                candidate.score,
            )
            if candidate.selected:
                selected_outcome = candidate.outcome
        if selected_outcome is not None:
            record.outcome = selected_outcome
    return records
