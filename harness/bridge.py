"""
bridge.py — one-way adapter: loop_core (lean) → canonical GenerationRecord[].

Maps the loop's internal lean output (loop_core/contracts.py) to the render-ready
canonical GenerationRecord[] (harness/contracts.py) the dashboard reads. Applies
the field table from docs/LOOP_CORE_BRIDGE.md — no refactor of the tested loop.

Also provides make_acoe_critic() — wraps harness.critic.score_concept() so the
loop can call it with lean types and get a canonical RewardScore back.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Callable, Optional

import loop_core.contracts as lean
from harness.contracts import (
    ContentConcept,
    GenerationRecord,
    HarnessDiff,
    HarnessState,
    RewardScore,
)


# ---------------------------------------------------------------------------
# Field-level translators
# ---------------------------------------------------------------------------

def _tier_from_score(total_score: float) -> str:
    if total_score >= 85:
        return "viral"
    if total_score >= 65:
        return "growing"
    return "seed_jail"


def lean_concept_to_canonical(
    c: lean.ContentConcept,
    generation: int,
    harness_version: str,
) -> ContentConcept:
    """Map a lean ContentConcept to the canonical (render-ready) shape."""
    element_keys = list(c.elements.keys())
    return ContentConcept(
        id=c.concept_id,
        concept_id=c.concept_id,  # ≡ id
        generation_number=generation,
        generation=generation,  # ≡ generation_number
        trend_context_id=c.trend_id,
        trend_id=c.trend_id,  # ≡ trend_context_id
        harness_state_version=harness_version,
        hook=c.script or (c.storyboard[0] if c.storyboard else ""),
        angle="; ".join(c.storyboard) if c.storyboard else c.script or "",
        format=element_keys[0] if element_keys else "",
        script=c.script,
        visual_prompt=c.seedance_prompt or "",
        seedance_prompt=c.seedance_prompt,
        elements=element_keys,
        element_weights=dict(c.elements),
        storyboard=list(c.storyboard),
        duration_sec=c.duration_sec,
        created_at=c.created_at,
    )


def map_reward_to_canonical(
    reward: Any,  # lean.RewardScore | canonical RewardScore
    concept_id: str,
    generation: int,
    harness_version: str,
) -> RewardScore:
    """Accept either a lean stub reward or a canonical ACOE reward; produce canonical.

    If the reward is already canonical (has total_score / distribution_tier),
    pass ACOE fields through. Otherwise derive them from predicted_score.
    """
    ps = getattr(reward, "predicted_score", 0.5)
    pw = getattr(reward, "pairwise_winprob", None)

    # Already canonical?  Pass through ACOE fields.
    if hasattr(reward, "total_score") and reward.total_score is not None:
        return RewardScore(
            concept_id=concept_id,
            generation_number=generation,
            harness_state_version=harness_version,
            weighted_total=ps,
            predicted_score=ps,
            predicted_win_prob=pw,
            pairwise_winprob=pw,
            confidence=getattr(reward, "confidence", 0.5),
            scored_by=getattr(reward, "scored_by", "acoe-dance-judge"),
            rationale=getattr(reward, "rationale", None),
            judge_rationale=getattr(reward, "rationale", None)
            or getattr(reward, "judge_rationale", ""),
            policy_flag=getattr(reward, "policy_flag", False),
            scored_at=getattr(reward, "scored_at", None),
            total_score=reward.total_score,
            distribution_tier=reward.distribution_tier,
            auto_fails_triggered=getattr(reward, "auto_fails_triggered", None),
            category_breakdown=getattr(reward, "category_breakdown", None),
            lowest_scoring_category=getattr(reward, "lowest_scoring_category", None),
            recommended_fix_priority=getattr(reward, "recommended_fix_priority", None),
            winning_elements=getattr(reward, "winning_elements", None),
            weak_elements=getattr(reward, "weak_elements", None),
            suggested_policy_updates=getattr(reward, "suggested_policy_updates", None),
            rubric_breakdown=getattr(reward, "rubric_breakdown", None),
        )

    # Stub reward: derive what we can.
    total = round(ps * 100)
    tier = _tier_from_score(total)
    return RewardScore(
        concept_id=concept_id,
        generation_number=generation,
        harness_state_version=harness_version,
        weighted_total=ps,
        predicted_score=ps,
        predicted_win_prob=pw,
        pairwise_winprob=pw,
        confidence=getattr(reward, "confidence", 0.5),
        scored_by=getattr(reward, "scored_by", "stub-critic"),
        rationale=getattr(reward, "rationale", None),
        judge_rationale=getattr(reward, "rationale", "")
        or getattr(reward, "judge_rationale", ""),
        policy_flag=False,
        scored_at=getattr(reward, "scored_at", None),
        total_score=total,
        distribution_tier=tier,
    )


def build_minimal_harness_diff(
    from_ver: str,
    to_ver: str,
    diff_summary: Optional[str],
    accepted: bool = True,
) -> Optional[HarnessDiff]:
    if not diff_summary:
        return None
    return HarnessDiff(
        from_version=from_ver,
        to_version=to_ver,
        element_weight_changes={},
        rationale=diff_summary,
        accepted=accepted,
    )


def build_canonical_record(
    lean_record: lean.GenerationRecord,
    concept: ContentConcept,
    score: RewardScore,
    harness_before: HarnessState,
    harness_after: HarnessState,
) -> GenerationRecord:
    """Build a full render-ready GenerationRecord embedding concept + score."""
    ver_before = f"v{lean_record.generation}"
    ver_after = f"v{lean_record.generation + 1}"
    diff = build_minimal_harness_diff(
        ver_before, ver_after,
        lean_record.harness_diff or harness_after.diff_summary,
    )
    return GenerationRecord(
        id=lean_record.record_id,
        record_id=lean_record.record_id,
        generation_number=lean_record.generation,
        generation=lean_record.generation,
        trend_context_id=lean_record.trend_id,
        trend_id=lean_record.trend_id,
        concept_id=concept.id,
        harness_id=lean_record.harness_id,
        concept=concept,
        score=score,
        harness_state_version_before=ver_before,
        harness_state_version_after=ver_after,
        harness_diff=diff,
        predicted_score=score.weighted_total,
        actual_engagement=lean_record.actual_engagement,
        rubric_version=lean_record.rubric_version,
        selected=lean_record.selected,
        post_url=lean_record.post_url,
        created_at=lean_record.created_at,
    )


# ---------------------------------------------------------------------------
# BridgeCollector — accumulates records across generations
# ---------------------------------------------------------------------------

class BridgeCollector:
    """Collects canonical GenerationRecords as the loop runs."""

    def __init__(self):
        self.records: list[GenerationRecord] = []
        self._prev_harness: Optional[HarnessState] = None

    def on_generation(
        self,
        concept: lean.ContentConcept,
        reward: Any,
        lean_harness: lean.HarnessState,
        lean_record: lean.GenerationRecord,
    ) -> None:
        gen = lean_harness.generation
        ver = f"v{gen}"

        canonical_concept = lean_concept_to_canonical(concept, gen, ver)
        canonical_score = map_reward_to_canonical(
            reward, canonical_concept.id, gen, ver,
        )

        # Build minimal canonical harness states
        harness_before = HarnessState(
            id=lean_harness.harness_id,
            version=ver,
            generation=gen,
            element_weights=dict(concept.elements),
            script_prompt=lean_harness.system_prompt,
            seedance_prompt_template="",
            judge_rubric=lean_harness.rubric_version or "v1",
            element_taxonomy=list(lean_harness.element_taxonomy),
            rubric_version=lean_harness.rubric_version,
            diff_summary=lean_harness.diff_summary,
        )

        harness_after = HarnessState(
            id=lean_harness.harness_id,
            version=f"v{gen + 1}",
            generation=gen + 1,
            element_weights=dict(concept.elements),
            script_prompt=lean_harness.system_prompt,
            seedance_prompt_template="",
            judge_rubric=lean_harness.rubric_version or "v1",
            element_taxonomy=list(lean_harness.element_taxonomy),
            rubric_version=lean_harness.rubric_version,
            diff_summary=lean_harness.diff_summary,
        )

        rec = build_canonical_record(
            lean_record, canonical_concept, canonical_score,
            harness_before, harness_after,
        )
        self.records.append(rec)

    def write(self, path: str = "data/generations.latest.json") -> None:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        data = [r.model_dump(mode="json", exclude_none=True) for r in self.records]
        p.write_text(json.dumps(data, indent=2))


def make_bridge_hook() -> tuple[Callable, BridgeCollector]:
    """Return an on_generation hook and its collector."""
    collector = BridgeCollector()
    return collector.on_generation, collector


# ---------------------------------------------------------------------------
# ACOE critic adapter — wraps harness.critic.score_concept for the loop
# ---------------------------------------------------------------------------

def make_acoe_critic(
    evaluation_mode="prompt_preflight",
) -> Callable[[lean.ContentConcept, lean.HarnessState], RewardScore]:
    """Return a critic(lean_concept, lean_harness) -> canonical RewardScore.

    Translates the loop's lean types to canonical, calls harness.critic.score_concept(),
    and returns the canonical RewardScore (with ACOE fields filled). Uses deterministic
    preflight by default so no API key is required.
    """
    from harness.critic import score_concept

    def acoe_critic(
        concept: lean.ContentConcept,
        harness: lean.HarnessState,
    ) -> RewardScore:
        canonical_concept = lean_concept_to_canonical(
            concept, concept.generation, f"v{concept.generation}",
        )
        canonical_harness = HarnessState(
            id=harness.harness_id,
            version=f"v{harness.generation}",
            generation=harness.generation,
            element_weights={},
            script_prompt=harness.system_prompt,
            seedance_prompt_template="",
            judge_rubric=harness.rubric_version or "v1",
            policy_rules=[],
            element_taxonomy=list(harness.element_taxonomy),
            rubric_version=harness.rubric_version,
            diff_summary=harness.diff_summary,
        )
        return score_concept(
            canonical_concept,
            harness_state=canonical_harness,
            evaluation_mode=evaluation_mode,
        )

    return acoe_critic
