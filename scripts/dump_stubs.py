"""
Generate data/stubs/*.json from the canonical Pydantic contracts and validate
them, themed to the short-form-video (YouTube Shorts dance) vertical scored by
ACOE-YT-SHORTS-v2.0. Running this is both the regen step AND the integrity check:

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
    ExecutionMetadata,
    GenerationRecord,
    HarnessDiff,
    HarnessState,
    Lesson,
    RewardScore,
    TrendContext,
    TrendSignal,
)

POLICY_PATH = ROOT / "data" / "policies" / "ACOE-YT-SHORTS-v2.0.json"


def t(hour: int, minute: int) -> datetime:
    """Fixed 2026-06-06 UTC timestamp (determinism)."""
    return datetime(2026, 6, 6, hour, minute, tzinfo=timezone.utc)


def check_policy() -> list[str]:
    """Validate ACOE-YT-SHORTS-v2.0 integrity; return the category keys."""
    policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    cats = policy["categories"]
    assert sum(c["weight_percent"] for c in cats.values()) == 100, "category weights must sum to 100"
    assert sum(c["max_points"] for c in cats.values()) == 100, "category max_points must sum to 100"
    af_ids = [af["id"] for af in policy["auto_fail_conditions"]]
    assert len(af_ids) == len(set(af_ids)), "auto-fail ids must be unique"
    assert set(policy["distribution_tiers"]) == {"viral", "growing", "seed_jail"}, "unexpected tiers"
    # Guard: the critic's hardcoded ACOE_RUBRIC must match the policy's points
    # (until the critic loads the table from this JSON — see docs/JUDGE_RUBRIC.md).
    from harness.critic import ACOE_RUBRIC

    policy_max = {name: c["max_points"] for name, c in cats.items()}
    critic_max = {name: cat["max_points"] for name, cat in ACOE_RUBRIC.items()}
    assert critic_max == policy_max, f"critic ACOE_RUBRIC != policy max_points: {critic_max} vs {policy_max}"
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
        "you_hook": 0.5,
        "high_contrast_bg": 0.55,
        "seamless_loop": 0.55,
        "delayed_resolution": 0.5,
        "conflict_phrasing": 0.45,
        "fast_cuts": 0.5,
        "trending_audio": 0.6,
        "rising_audio": 0.55,
        "beat_sync": 0.5,
        "comment_bait_question": 0.3,
        "polarizing_angle": 0.25,
        "reflective_outfit": 0.35,
        "hashtag_mix": 0.4,
    },
    script_prompt="Generate a 13-15s AI dance Short. Open ON peak motion in frame 1 (no fade-in or title card) against a stark single-color background, with bold second-person on-screen text ('You'/'Your') in the first 2s. Set up a micro-curiosity gap at 0:00 and withhold the payoff until ~0:13. Phrase multi-part text with conflict transitions (But/However/Suddenly), not additive ones (And/Also). Change the visual at least every 2.5s (cut/zoom/pan/light shift). Sync motion peaks to the beat drops of a RISING approved trending track. Engineer a seamless loop (final frame ~= frame 1).",
    seedance_prompt_template="A single dancer, {{dance_style}}, mid-peak motion, isolated on a {{background}} background, reflective outfit catching light, 4K, no artifacts. On-screen text: \"{{on_screen_text}}\". Loop-ready.",
    judge_rubric="Score with ACOE-YT-SHORTS-v2.0 (data/policies/ACOE-YT-SHORTS-v2.0.json): hook_quality 30, retention_and_loop 25, engagement_bait 10, visual_production 15, audio_alignment 15, metadata 5; map the total to viral/growing/seed_jail and apply auto-fails AF-01..05. See docs/JUDGE_RUBRIC.md.",
    policy_rules=[
        "AF-01 Standing Start: frame 1 must show peak motion, never a static pose.",
        "AF-02 No On-Screen Text: a text overlay must appear within the first 2 seconds.",
        "AF-03 Duration Violation: keep duration between 13 and 20 seconds.",
        "AF-04 No Trending Audio: use only the approved trending audio pool.",
        "AF-05 Brand Safety: no explicit content, hate speech, or brand-safety violations.",
    ],
    element_taxonomy=[
        "peak_motion_frame1", "you_hook", "high_contrast_bg", "seamless_loop",
        "delayed_resolution", "conflict_phrasing", "fast_cuts", "trending_audio",
        "rising_audio", "beat_sync", "comment_bait_question", "polarizing_angle",
        "reflective_outfit", "hashtag_mix",
    ],
    rubric_version="ACOE-YT-SHORTS-v2.0",
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
        hook="Frame 1: a mid-air freeze — but you haven't seen the drop yet.",
        format="peak_motion_loop",
        angle="A hip-hop power-move combo with the signature move withheld until the final beat, looped invisibly.",
        script="0:00 hard cut into a mid-air freeze, but the signature move is held back; power moves build on the beat, then suddenly the payoff pose lands at 0:13 and loops back to frame 1.",
        visual_prompt="A single dancer, hip-hop power moves, mid-peak motion, isolated on a solid neon-magenta background, metallic reflective outfit catching light, a hard cut or light shift roughly every 2s, 4K, no artifacts. Loop-ready.",
        elements=["peak_motion_frame1", "you_hook", "high_contrast_bg", "delayed_resolution", "conflict_phrasing", "fast_cuts", "seamless_loop", "trending_audio", "rising_audio", "beat_sync"],
        created_by="content-generator",
        dance_style="hip-hop power moves",
        audio=Audio(name="Bruno Mars - I Just Might", bpm=110, sound_recency="rising", is_rising_sound=True),
        cut_frequency=0.5,  # a visual change ~every 2s (passes VP-04)
        execution=ExecutionMetadata(
            hashtag_set=["#aidance", "#aiart", "#aianimation", "#shorts", "#viral", "#fyp", "#trending", "#brunomars"],
            posting_time=t(17, 0),
        ),
        comment_bait_question="Name a song harder than this",
        on_screen_text="You won't guess the final pose",
        title="You won't guess the final pose #aidance #shorts",
        description="AI dance to Bruno Mars - I Just Might. But wait for the final pose — drop the song you want next below.",
        duration_sec=14,
    ),
    score=RewardScore(
        id="rs_0001",
        concept_id="cc_0001",
        generation_number=1,
        harness_state_version="v0",
        # `dimensions` retired (deprecated/optional) — DECISIONS.md D14
        weighted_total=0.84,  # == total_score / 100
        predicted_win_prob=0.70,
        policy_flag=False,
        judge_rationale="v2: strong rising-audio (13/15) and a second-person hook with a delayed payoff. The comment bait is present but overt bait is de-weighted in v2. Growing tier (84); marginal gains are in retention and audio, not more bait.",
        predicted_score=0.84,
        pairwise_winprob=0.70,
        confidence=0.7,
        scored_by="stub-critic-ACOE",
        rationale="engagement_bait is the lowest category (6/10) but only 10% of v2; see category_breakdown.",
        total_score=84,
        distribution_tier="growing",
        auto_fails_triggered=[],
        category_breakdown={
            "hook_quality": 27,
            "retention_and_loop": 21,
            "engagement_bait": 6,
            "visual_production": 12,
            "audio_alignment": 13,
            "metadata": 5,
        },
        lowest_scoring_category="engagement_bait",
        recommended_fix_priority="engagement_bait is the lowest category (6/10) but only 10% of v2 — the higher-marginal levers are retention_and_loop (tighten the delayed-resolution gap, RL-04) and audio_alignment (rising sound, AA-03). Balance overt bait with organic intrigue.",
    ),
    harness_state_version_before="v0",
    harness_state_version_after="v1",
    harness_diff=HarnessDiff(
        id="hd_0001",
        from_version="v0",
        to_version="v1",
        element_weight_changes={"delayed_resolution": 0.1, "rising_audio": 0.1, "comment_bait_question": -0.05},
        script_prompt_change="Tighten the micro-curiosity gap (withhold the signature move to ~0:13) and prefer a rising approved sound; ease off overt comment bait.",
        rationale="Under v2 weights, retention (25%) and audio (15%) outweigh engagement bait (10%). Reinforce delayed_resolution + rising_audio rather than chasing the lowest raw category.",
        accepted=True,
    ),
    lesson=Lesson(
        id="ls_0001",
        generation_number=1,
        observation="engagement_bait was the lowest category (6/10), but under v2 it is only 10% weight; audio (13/15) and retention (21/25) carry far more of the total.",
        rule="Prioritize fixes by category weight x gap, not by lowest raw category. v2 rewards rising audio and delayed-resolution retention over overt comment bait.",
        evidence="Generation 1 (v2): total 84 -> growing; engagement_bait 6/10 (10% weight) vs retention 21/25 (25%) and audio 13/15 (15%).",
        harness_change="Raise delayed_resolution (+0.10) and rising_audio (+0.10); ease comment_bait_question (-0.05); tighten the micro-curiosity gap in script_prompt.",
        expected_effect="Total crosses 85 (viral) via retention + audio gains, not more bait; overt-bait penalty risk drops.",
    ),
    harness_id="hs_0001",
    predicted_score=0.84,
    rubric_version="ACOE-YT-SHORTS-v2.0",
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
