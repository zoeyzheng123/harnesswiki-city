from __future__ import annotations

import json
import unittest

from harness.contracts import Audio, ContentConcept
from harness.critic import CRITERION_IDS, judge_concept, score_concept


def dance_concept(prompt: str, *, duration: int = 15) -> ContentConcept:
    return ContentConcept(
        id="cc_dance_01",
        generation_number=1,
        trend_context_id="tc_dance_01",
        harness_state_version="v0",
        hook="Rate this choreography 1-10?",
        format="dance_short",
        angle="A loopable, beat-synchronized solo dance.",
        script="Rate this choreography 1-10?",
        visual_prompt=prompt,
        seedance_prompt=prompt,
        duration_sec=duration,
        dance_style="hip-hop",
        audio=Audio(
            name="Demo Track",
            bpm=124,
            sound_recency="rising",
            is_rising_sound=True,
        ),
        elements=["peak_motion_start", "beat_sync", "seamless_loop"],
        element_weights={
            "peak_motion_start": 0.8,
            "beat_sync": 0.7,
            "seamless_loop": 0.6,
        },
    )


class CriticTests(unittest.TestCase):
    def test_deterministic_preflight_is_projected_not_verified(self) -> None:
        prompt = (
            "At 0:00, frame 1 opens mid-jump with peak dance motion. "
            "A single centered dancer performs continuous hip-hop choreography "
            "against a solid neon high-contrast background. Bold on-screen text "
            "'Rate this choreography 1-10?' appears immediately and remains for "
            "the full duration. Every movement peak lands on a beat hit. The "
            "metallic reflective outfit catches the light. Use crisp 4K detail, "
            "anatomically stable limbs, and a consistent face. End by returning "
            "to the opening pose for a seamless loop with no dead zones."
        )
        result = judge_concept(dance_concept(prompt))

        self.assertEqual(result.score_type, "projected")
        self.assertIsNotNone(result.projected_score)
        self.assertIsNone(result.verified_score)
        self.assertFalse(result.policy_update_allowed)
        self.assertGreater(result.headline_score, 70)

    def test_static_start_triggers_full_auto_fail(self) -> None:
        prompt = (
            "The dancer starts standing in a static pose, then begins dancing "
            "after a title card. Use a clean background and loop the ending."
        )
        result = judge_concept(dance_concept(prompt))

        self.assertIn("AF-01", result.auto_fails_triggered)
        self.assertEqual(result.headline_score, 0)

    def test_rendered_llm_result_carries_policy_learning(self) -> None:
        prompt = (
            "Frame 1 opens mid-spin. Keep a locked full-body camera and align "
            "three movement peaks to beat hits, then return to the opening pose."
        )
        concept = dance_concept(prompt)
        criteria = [
            {
                "id": criterion_id,
                "status": "pass",
                "evidence_type": "observed",
                "evidence": f"Observed evidence for {criterion_id}.",
                "reason": "Criterion satisfied.",
            }
            for criterion_id in CRITERION_IDS
        ]
        response = {
            "criteria": criteria,
            "general_quality": {
                "prompt_detail": 0.82,
                "prompt_clarity": 0.88,
                "sequence_flow": 0.84,
                "choreography_coherence": 0.86,
                "music_motion_alignment": 0.91,
                "vibe_coherence": 0.83,
                "visual_direction": 0.79,
                "video_model_feasibility": 0.87,
                "originality": 0.72,
                "viewer_satisfaction_potential": 0.85,
            },
            "cringe_risk": 0.08,
            "policy_risk": 0.03,
            "confidence": 0.86,
            "strengths": ["Three observed movement peaks land on beat hits."],
            "weaknesses": [],
            "missing_evidence": [],
            "contradictions": [],
            "predicted_generation_failures": [],
            "recommended_fix_priority": [],
            "revised_generation_prompt": prompt,
            "policy_learning": {
                "confidence": 0.86,
                "winning_elements": ["beat_sync", "seamless_loop"],
                "weak_elements": [],
                "policy_deltas": {
                    "beat_sync": 0.06,
                    "seamless_loop": 0.04,
                    "not_sampled": 0.10,
                },
                "new_candidate_elements": ["locked_full_body_camera"],
                "evidence": ["Two seeds preserved beat sync and loop continuity."],
            },
            "needs_human_review": False,
        }

        def judge(_system: str, _user: str) -> str:
            return f"```json\n{json.dumps(response)}\n```"

        score = score_concept(
            concept,
            evaluation_mode="rendered_video",
            judge=judge,
        )

        self.assertAlmostEqual(score.weighted_total, 0.986)
        self.assertEqual(score.winning_elements, ["beat_sync", "seamless_loop"])
        self.assertEqual(
            score.suggested_policy_updates,
            {"beat_sync": 0.06, "seamless_loop": 0.04},
        )
        self.assertNotIn("not_sampled", score.suggested_policy_updates)
        self.assertEqual(score.rubric_breakdown["score_type"], "verified")


if __name__ == "__main__":
    unittest.main()
