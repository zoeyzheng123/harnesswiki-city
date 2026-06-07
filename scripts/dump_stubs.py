"""
Generate data/stubs/*.json from the canonical Pydantic contracts and validate
them, themed to the short-form-video (YouTube Shorts dance) vertical scored by
ACOE-YT-SHORTS-v1.0. Running this is both the regen step AND the integrity check:

  - validates the ACOE policy JSON (weights/points sum to 100, ids unique, tiers),
  - constructs the canonical (deterministic) demo instances,
  - round-trips each through model_dump_json()/model_validate_json() (asserts equal),
  - checks the score's category_breakdown matches the policy categories and
    weighted_total == total_score / 100,
  - writes the stubs with exclude_none=True (None fields omitted).

Deterministic by design: explicit ids + fixed timestamps, no diff churn.

Usage:  python scripts/dump_stubs.py
"""

from __future__ import annotations

import json
import pathlib
import sys
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from harness.contracts import (  # noqa: E402
    Audio,
    ContentConcept,
    GenerationRecord,
    HarnessDiff,
    HarnessState,
    Lesson,
    RewardDimensions,
    RewardScore,
    TrendContext,
    TrendSignal,
)

POLICY_PATH = ROOT / "data" / "policies" / "ACOE-YT-SHORTS-v1.0.json"


def t(hour: int, minute: int) -> datetime:
    """Fixed 2026-06-06 UTC timestamp (determinism)."""
    return datetime(2026, 6, 6, hour, minute, tzinfo=timezone.utc)


def check_policy() -> list[str]:
    """Validate ACOE-YT-SHORTS-v1.0 integrity; return the category keys."""
    policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    cats = policy["categories"]
    assert sum(c["weight_percent"] for c in cats.values()) == 100, "category weights must sum to 100"
    assert sum(c["max_points"] for c in cats.values()) == 100, "category max_points must sum to 100"
    af_ids = [af["id"] for af in policy["auto_fail_conditions"]]
    assert len(af_ids) == len(set(af_ids)), "auto-fail ids must be unique"
    assert set(policy["distribution_tiers"]) == {"viral", "growing", "seed_jail"}, "unexpected tiers"
    return list(cats.keys())


TRENDS = [
    TrendContext(
        id="tc_0001",
        captured_at=t(9, 0),
        platform="youtube_shorts",
        audience="gen-z-dance",
        trend_summary="A high-energy dance challenge set to Bruno Mars' 'I Just Might' is surging; single-color-background loops with on-screen comment bait are outperforming.",
        signals=[
            TrendSignal(label="format: peak-motion loop", strength=0.85, note="frame-1 motion + seamless loop drives rewatch above 100%"),
            TrendSignal(label="sound: I Just Might (rising)", strength=0.8),
            TrendSignal(label="bait: 'name a song harder' comments", strength=0.7),
        ],
        source="stub",
        audio="Bruno Mars - I Just Might",
        topic="dance challenge",
        format="peak_motion_loop",
        region="US",
        source_urls=["https://example.com/shorts/trending"],
    ),
]

INITIAL_HARNESS = HarnessState(
    id="hs_0001",
    version="v0",
    element_weights={
        "peak_motion_frame1": 0.6,
        "high_contrast_bg": 0.55,
        "seamless_loop": 0.55,
        "trending_audio": 0.6,
        "beat_sync": 0.5,
        "comment_bait_question": 0.4,
        "polarizing_angle": 0.3,
        "reflective_outfit": 0.35,
        "hashtag_mix": 0.4,
    },
    script_prompt="Generate an 8-15s AI dance Short. Open ON peak motion in frame 1 against a stark single-color background - no fade-in or title card. Burn a large, polarizing typed-answer question on-screen for the full duration. Engineer a seamless loop (final frame ~= frame 1). Sync motion peaks to the beat drops of an approved trending track.",
    seedance_prompt_template="A single dancer, {{dance_style}}, mid-peak motion, isolated on a {{background}} background, reflective outfit catching light, 4K, no artifacts. On-screen text: \"{{on_screen_text}}\". Loop-ready.",
    judge_rubric="Score with ACOE-YT-SHORTS-v1.0 (data/policies/ACOE-YT-SHORTS-v1.0.json): hook_quality 30, retention_and_loop 25, engagement_bait 20, visual_production 15, audio_alignment 5, metadata 5; map the total to viral/growing/seed_jail and apply the auto-fail conditions. See docs/JUDGE_RUBRIC.md.",
    policy_rules=[
        "AF-01 Standing Start: frame 1 must show peak motion, never a static pose.",
        "AF-02 No On-Screen Text: a text overlay must appear within the first 2 seconds.",
        "AF-03 Duration Violation: keep duration between 13 and 20 seconds.",
        "AF-04 No Trending Audio: use only the approved trending audio pool.",
    ],
    element_taxonomy=[
        "peak_motion_frame1", "high_contrast_bg", "seamless_loop", "trending_audio",
        "beat_sync", "comment_bait_question", "polarizing_angle", "reflective_outfit", "hashtag_mix",
    ],
    rubric_version="ACOE-YT-SHORTS-v1.0",
    generation=0,
)

GENERATION_ONE = GenerationRecord(
    id="gr_0001",
    generation_number=1,
    created_at=t(9, 10),
    trend_context_id="tc_0001",
    concept=ContentConcept(
        id="cc_0001",
        generation_number=1,
        trend_context_id="tc_0001",
        harness_state_version="v0",
        hook="Frame 1: a mid-air freeze on the beat against a neon-magenta void.",
        format="peak_motion_loop",
        angle="A hip-hop power-move combo locked to the drop, looped invisibly.",
        script="0:00 hard cut into a mid-air freeze, then a power-move combo locked to the beat; the final pose returns to the opening frame for an invisible loop.",
        visual_prompt="A single dancer, hip-hop power moves, mid-peak motion, isolated on a solid neon-magenta background, metallic reflective outfit catching light, 4K, no artifacts. Loop-ready.",
        elements=["peak_motion_frame1", "high_contrast_bg", "seamless_loop", "trending_audio", "beat_sync"],
        created_by="content-generator",
        dance_style="hip-hop power moves",
        audio=Audio(name="Bruno Mars - I Just Might", bpm=110, sound_recency="rising", is_rising_sound=True),
        cut_frequency=2.0,
        hashtag_set=["#aidance", "#aiart", "#aianimation", "#shorts", "#viral", "#fyp", "#trending", "#brunomars"],
        posting_time=t(17, 0),
        comment_bait_question="Name a song harder than this",
        on_screen_text="Name a song harder than this",
        title="Name a song harder than this #aidance #shorts",
        description="AI dance to Bruno Mars - I Just Might. Drop the song you want next below.",
        duration_sec=14,
    ),
    score=RewardScore(
        id="rs_0001",
        concept_id="cc_0001",
        generation_number=1,
        harness_state_version="v0",
        # Legacy 0..1 dimensions, mapped from the ACOE categories (transitional; the
        # dashboard still renders these until it migrates to ACOE — DECISIONS.md D11).
        dimensions=RewardDimensions(
            hook_strength=0.87, trend_fit=0.85, brand_fit=0.7, novelty=0.6,
            clarity=0.78, cringe_risk=0.25, policy_risk=0.05, visual_feasibility=0.8,
        ),
        weighted_total=0.76,  # == total_score / 100
        predicted_win_prob=0.62,
        policy_flag=False,
        judge_rationale="Strong frame-1 peak motion, stark background, and a smooth loop. Weakest on engagement bait - the comment-bait question is present but not polarizing enough to force typed replies. Growing tier; one fix from viral.",
        predicted_score=0.76,
        pairwise_winprob=0.62,
        confidence=0.7,
        scored_by="stub-critic-ACOE",
        rationale="engagement_bait is the ceiling at 11/20; see category_breakdown.",
        total_score=76,
        distribution_tier="growing",
        auto_fails_triggered=[],
        category_breakdown={
            "hook_quality": 26,
            "retention_and_loop": 18,
            "engagement_bait": 11,
            "visual_production": 12,
            "audio_alignment": 4,
            "metadata": 5,
        },
        lowest_scoring_category="engagement_bait",
        recommended_fix_priority="Sharpen the comment-bait question into a polarizing, typed-answer prompt and keep it on-screen the full duration (EB-01/EB-02/EB-03).",
    ),
    harness_state_version_before="v0",
    harness_state_version_after="v1",
    harness_diff=HarnessDiff(
        id="hd_0001",
        from_version="v0",
        to_version="v1",
        element_weight_changes={"comment_bait_question": 0.15, "polarizing_angle": 0.1},
        script_prompt_change="Require a polarizing, ranked/comparison typed-answer question burned on-screen for the full duration.",
        rationale="engagement_bait was the lowest category (11/20); reinforce comment bait + polarization to lift the total toward the viral threshold.",
        accepted=True,
    ),
    lesson=Lesson(
        id="ls_0001",
        generation_number=1,
        observation="The video scored well on hook and loop but engagement_bait capped the total at 76 (growing) - the question was answerable with an emoji.",
        rule="Use polarizing, typed-answer comment bait (ranking/comparison) kept on-screen the full duration.",
        evidence="Generation 1 ACOE: hook_quality 26/30, engagement_bait 11/20, total 76 -> growing tier.",
        harness_change="Raise comment_bait_question (+0.15) and polarizing_angle (+0.10); update script_prompt to demand a polarizing typed-answer question.",
        expected_effect="engagement_bait climbs toward 18-20/20, pushing the total past 85 into the viral tier.",
    ),
    harness_id="hs_0001",
    predicted_score=0.76,
    rubric_version="ACOE-YT-SHORTS-v1.0",
    selected=True,
)


def round_trip(model) -> None:
    cls = type(model)
    restored = cls.model_validate_json(model.model_dump_json())
    assert restored == model, f"round-trip mismatch for {cls.__name__}"


def write(name: str, payload: str) -> None:
    (ROOT / "data" / "stubs" / name).write_text(payload + "\n", encoding="utf-8")


def main() -> None:
    category_keys = check_policy()

    everything = [*TRENDS, INITIAL_HARNESS, GENERATION_ONE]
    for m in everything:
        round_trip(m)

    score = GENERATION_ONE.score
    assert set(score.category_breakdown or {}) == set(category_keys), "category_breakdown keys must match the policy categories"
    assert abs(score.weighted_total - (score.total_score or 0) / 100) < 1e-9, "weighted_total must equal total_score / 100"
    assert (score.total_score or 0) >= 65 and score.distribution_tier == "growing", "stub tier must match its total_score"

    write("trend-contexts.json", json.dumps([m.model_dump(mode="json", exclude_none=True) for m in TRENDS], indent=2))
    write("harness-state.initial.json", INITIAL_HARNESS.model_dump_json(exclude_none=True, indent=2))
    write("generation-records.sample.json", json.dumps([GENERATION_ONE.model_dump(mode="json", exclude_none=True)], indent=2))

    print(f"policy OK ({len(category_keys)} categories, weights sum 100); round-trip OK for {len(everything)} models; wrote 3 stub files")


if __name__ == "__main__":
    main()
