from __future__ import annotations

import unittest

from scripts.synth_prompt_outcomes import generate


class SyntheticPromptOutcomeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.records = generate(m=10, k=5)
        self.candidates = [
            candidate
            for record in self.records
            for candidate in (record.candidates or [])
        ]

    def test_balanced_prompt_quality_bands(self) -> None:
        scores = [candidate.score.total_score or 0 for candidate in self.candidates]
        self.assertEqual(len(self.candidates), 50)
        self.assertLessEqual(min(scores), 10)
        self.assertTrue(any(40 <= score < 65 for score in scores))
        self.assertTrue(any(65 <= score < 85 for score in scores))
        self.assertGreaterEqual(max(scores), 95)

    def test_prompt_text_varies_with_quality(self) -> None:
        prompts = {
            candidate.concept.seedance_prompt
            for candidate in self.candidates
        }
        creators = {candidate.concept.created_by for candidate in self.candidates}
        self.assertGreater(len(prompts), 20)
        self.assertEqual(
            creators,
            {
                "synthetic_auto_fail",
                "synthetic_weak",
                "synthetic_partial",
                "synthetic_growing",
                "synthetic_viral",
            },
        )

    def test_views_match_score_tiers(self) -> None:
        for candidate in self.candidates:
            score = candidate.score.total_score or 0
            views = candidate.outcome.views if candidate.outcome else None
            self.assertIsNotNone(views)
            if score < 65:
                self.assertLessEqual(views or 0, 199)
            elif score < 85:
                self.assertGreaterEqual(views or 0, 200)
                self.assertLessEqual(views or 0, 13_999)
            else:
                self.assertGreaterEqual(views or 0, 14_000)


if __name__ == "__main__":
    unittest.main()
