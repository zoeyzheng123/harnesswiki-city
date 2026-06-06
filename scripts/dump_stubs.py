"""
Generate data/stubs/*.json from the canonical Pydantic contracts and validate
them. Running this is both the regen step AND the Python-side consistency check:

  - constructs the canonical (deterministic) demo instances,
  - round-trips each through model_dump_json()/model_validate_json() (asserts equal),
  - writes the stubs with exclude_none=True (None fields omitted),
  - the TS mirror then validates the written JSON via src/contracts/_stub-check.ts.

Deterministic by design: explicit ids + fixed timestamps, so re-running produces
no diff churn. Content matches the dashboard's AI-founder demo narrative.

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


def t(hour: int, minute: int) -> datetime:
    """Fixed 2026-06-06 UTC timestamp (determinism)."""
    return datetime(2026, 6, 6, hour, minute, tzinfo=timezone.utc)


TRENDS = [
    TrendContext(
        id="tc_0001",
        captured_at=t(9, 0),
        platform="x",
        audience="ai-founders",
        trend_summary="Founders are pushing back on 'AI wrapper' criticism, arguing distribution and taste are the real moats.",
        signals=[
            TrendSignal(label="format: contrarian take", strength=0.8, note="high engagement on threads challenging the consensus"),
            TrendSignal(label="topic: moats vs wrappers", strength=0.7),
            TrendSignal(label="tone: confident, first-person", strength=0.6),
        ],
        source="stub",
    ),
    TrendContext(
        id="tc_0002",
        captured_at=t(9, 5),
        platform="linkedin",
        audience="ai-founders",
        trend_summary="Diagnostic 'why your launch flopped' posts are outperforming celebratory launch announcements.",
        signals=[
            TrendSignal(label="format: diagnostic teardown", strength=0.75),
            TrendSignal(label="emotion: useful discomfort", strength=0.65),
        ],
        source="stub",
    ),
]

INITIAL_HARNESS = HarnessState(
    id="hs_0001",
    version="v0",
    element_weights={
        "contrarian_hook": 0.5,
        "diagnostic_hook": 0.4,
        "founder_story": 0.35,
        "data_drop": 0.3,
        "generic_listicle": 0.2,
    },
    script_prompt="Write a 30-second short-form video script for a founder-facing AI audience. Open with a scroll-stopping hook, deliver one sharp insight, and close with a memorable takeaway. Avoid generic listicles and hype.",
    seedance_prompt_template="A clean, modern talking-head explainer for {{audience}}. Visual style: minimal, high-contrast, on-screen captions. Scene reflects: {{angle}}.",
    judge_rubric="Score hook_strength, trend_fit, brand_fit, novelty, and clarity (higher is better), plus cringe_risk and policy_risk (higher is worse) and visual_feasibility. Penalize the risk dimensions in the weighted total. See docs/JUDGE_RUBRIC.md.",
    policy_rules=[
        "No medical, legal, or financial advice presented as fact.",
        "Do not target or identify private individuals.",
        "No unverifiable claims about named companies.",
    ],
    # Eng 1 additions
    generation=0,
    element_taxonomy=["contrarian_hook", "diagnostic_hook", "founder_story", "data_drop", "generic_listicle"],
    rubric_version="v1",
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
        hook="Your AI startup isn't a wrapper problem. It's a taste problem.",
        format="contrarian_hook",
        angle="Distribution and taste are the real moats, not the model.",
        script="Everyone says you're just a GPT wrapper. Cool - so was every SaaS a 'database wrapper.' The moat was never the model. It's taste, distribution, and the thousand product decisions nobody screenshots. Here's how to tell if yours is real...",
        visual_prompt="A clean, modern talking-head explainer for ai-founders. Visual style: minimal, high-contrast, on-screen captions. Scene reflects: distribution and taste as moats.",
        elements=["contrarian_hook"],
        created_by="content-generator",
        # Eng 1 additions
        element_weights={"contrarian_hook": 0.5},
        duration_sec=30,
    ),
    score=RewardScore(
        id="rs_0001",
        concept_id="cc_0001",
        generation_number=1,
        harness_state_version="v0",
        dimensions=RewardDimensions(
            hook_strength=0.82, trend_fit=0.78, brand_fit=0.7, novelty=0.68,
            clarity=0.74, cringe_risk=0.18, policy_risk=0.05, visual_feasibility=0.8,
        ),
        weighted_total=0.71,
        predicted_win_prob=0.5,
        policy_flag=False,
        judge_rationale="Strong contrarian hook with clear trend fit and good clarity; novelty is moderate. Low cringe and policy risk. Baseline generation, so the win probability is anchored at 0.5.",
        # Eng 1 additions
        predicted_score=0.71,
        pairwise_winprob=0.5,
        confidence=0.6,
        scored_by="stub-critic",
    ),
    harness_state_version_before="v0",
    harness_state_version_after="v1",
    harness_diff=HarnessDiff(
        id="hd_0001",
        from_version="v0",
        to_version="v1",
        element_weight_changes={"contrarian_hook": 0.1, "generic_listicle": -0.1},
        script_prompt_change="Add an explicit instruction to name the consensus view before subverting it.",
        rationale="The contrarian hook scored highest on hook_strength and trend_fit; reinforce it and suppress generic listicles.",
        accepted=True,
    ),
    lesson=Lesson(
        id="ls_0001",
        generation_number=1,
        observation="The contrarian hook outscored generic framings on hook_strength and trend_fit for the AI-founder audience.",
        rule="For founder-facing AI content, prefer contrarian or diagnostic hooks over generic listicles.",
        evidence="Generation 1: contrarian_hook concept scored 0.82 hook_strength and 0.78 trend_fit, weighted_total 0.71.",
        harness_change="Increase contrarian_hook weight (+0.1) and decrease generic_listicle (-0.1); reinforce in script_prompt.",
        expected_effect="Later generations open with sharper, consensus-subverting hooks and avoid generic listicles, lifting the predicted win probability.",
    ),
    # Eng 1 additions
    harness_id="hs_0001",
    predicted_score=0.71,
    rubric_version="v1",
    selected=True,
)


def round_trip(model) -> None:
    """A model survives serialize -> parse unchanged."""
    cls = type(model)
    restored = cls.model_validate_json(model.model_dump_json())
    assert restored == model, f"round-trip mismatch for {cls.__name__}"


def write(name: str, payload: str) -> None:
    (ROOT / "data" / "stubs" / name).write_text(payload + "\n", encoding="utf-8")


def main() -> None:
    everything = [*TRENDS, INITIAL_HARNESS, GENERATION_ONE]
    for m in everything:
        round_trip(m)

    write(
        "trend-contexts.json",
        json.dumps([m.model_dump(mode="json", exclude_none=True) for m in TRENDS], indent=2),
    )
    write(
        "harness-state.initial.json",
        INITIAL_HARNESS.model_dump_json(exclude_none=True, indent=2),
    )
    write(
        "generation-records.sample.json",
        json.dumps([GENERATION_ONE.model_dump(mode="json", exclude_none=True)], indent=2),
    )
    print(f"round-trip OK for {len(everything)} models; wrote 3 stub files to data/stubs/")


if __name__ == "__main__":
    main()
