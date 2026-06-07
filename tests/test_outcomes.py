from __future__ import annotations

import unittest
from datetime import datetime, timezone

from harness.contracts import ContentConcept, RewardScore
from harness.outcomes import synthetic_week_one_outcome


def concept() -> ContentConcept:
    return ContentConcept(
        id="cc_outcome",
        generation_number=1,
        trend_context_id="tc_outcome",
        harness_state_version="v1",
        hook="You have not seen the final move.",
        format="dance_short",
        angle="A delayed-payoff dance loop.",
        script="Open mid-jump, build tension, reveal on the final beat.",
        visual_prompt="Mid-jump dancer, beat-synced cuts, seamless loop.",
        seedance_prompt="Mid-jump dancer, beat-synced cuts, seamless loop.",
        elements=["peak_motion_frame1", "seamless_loop"],
        created_at=datetime(2026, 6, 7, tzinfo=timezone.utc),
    )


def score(total: float) -> RewardScore:
    return RewardScore(
        concept_id="cc_outcome",
        generation_number=1,
        harness_state_version="v1",
        weighted_total=total / 100.0,
        predicted_score=total / 100.0,
        policy_flag=False,
        judge_rationale="test",
        total_score=total,
    )


class SyntheticOutcomeTests(unittest.TestCase):
    def test_is_deterministic_and_seven_day_mature(self) -> None:
        first = synthetic_week_one_outcome(concept(), score(78))
        second = synthetic_week_one_outcome(concept(), score(78))
        self.assertEqual(first, second)
        self.assertEqual(first.source, "synthetic")
        self.assertEqual(first.maturity_hours, 168.0)
        self.assertEqual(
            first.collected_at,
            datetime(2026, 6, 14, tzinfo=timezone.utc),
        )

    def test_views_follow_acoe_tier_bands(self) -> None:
        seed = synthetic_week_one_outcome(concept(), score(40))
        growing = synthetic_week_one_outcome(concept(), score(75))
        viral = synthetic_week_one_outcome(concept(), score(90))
        self.assertLessEqual(seed.views or 0, 199)
        self.assertGreaterEqual(growing.views or 0, 200)
        self.assertLessEqual(growing.views or 0, 13_999)
        self.assertGreaterEqual(viral.views or 0, 14_000)
        self.assertLess(seed.views or 0, growing.views or 0)
        self.assertLess(growing.views or 0, viral.views or 0)


if __name__ == "__main__":
    unittest.main()
