"""
contracts.py — CANONICAL data contracts for HarnessWiki City.

Single source of truth for the objects that flow between the four workstreams.
Import these everywhere on the Python side. The TypeScript file
`src/contracts/index.ts` is a hand-kept MIRROR of these models (it exists so the
dashboard has types); if the two disagree, THIS file wins and the mirror +
`docs/DATA_CONTRACTS.md` must be updated in the same change (AGENTS.md #1).

MERGE NOTE (see DECISIONS.md D8): these shapes are a SUPERSET that reconciles
Eng 1's lean Pydantic proposal with Eng 4's already-built dashboard. The "core"
fields are render-ready and consumed by the UI today. The fields under each
"Eng 1 additions" block are optional backend/short-form-video fields pending a
prune once Eng 1 and Eng 4 align (some are renames of a core field — the
equivalence is noted inline).

FLOW:
  TrendContext --(C: Generator, reads HarnessState)--> ContentConcept
  ContentConcept + HarnessState --(B: Critic)--------> RewardScore
  RewardScore   --(A: Loop core, inner-loop policy)--> updated element weights
  per generation: A writes GenerationRecord (persisted as JSON by loop.py)
  HarnessState  --(A: Meta-agent rewrites it each gen)-> new HarnessState

Conventions:
  - Timestamps UTC, ISO-8601 on the wire.
  - Persist with .model_dump_json(); load with .model_validate_json().
  - Stubs are written with exclude_none=True (None fields are omitted).
  - Storage is plain JSON files today (see loop.py, planned). Redis is a stretch.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

import uuid
from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


class TrendSignal(BaseModel):
    label: str
    strength: float  # 0..1 relative prevalence / momentum
    note: Optional[str] = None


# 1. TrendContext — produced by C (Trend Scout / Tavily), consumed by C (Generator)
class TrendContext(BaseModel):
    # ── core (render-ready) ──
    id: str = Field(default_factory=lambda: _id("tc"))
    captured_at: datetime = Field(default_factory=_now)
    platform: str
    audience: str
    trend_summary: str
    signals: list[TrendSignal] = []
    source: str = "stub"  # "stub" | "live"
    # ── Eng 1 additions (short-form-video trend fields; optional) ──
    trend_id: Optional[str] = None  # ≡ id
    topic: Optional[str] = None
    hook: Optional[str] = None
    format: Optional[str] = None
    audio: Optional[str] = None
    region: Optional[str] = None
    source_urls: list[str] = []
    raw_signals: dict = {}


# the chosen sound for a short-form concept (Eng 1's "audio (BPM, sound recency,
# is-it-a-rising-sound)"). Distinct from TrendContext.audio, which just names a
# sound the trend is using.
class Audio(BaseModel):
    name: Optional[str] = None
    bpm: Optional[float] = None
    sound_recency: Optional[str] = None  # e.g. "new" | "rising" | "established"
    is_rising_sound: Optional[bool] = None


# 2. ContentConcept — produced by C (Generator + inner-loop policy), consumed by B & C
class ContentConcept(BaseModel):
    # ── core (render-ready) ──
    id: str = Field(default_factory=lambda: _id("cc"))
    generation_number: int
    trend_context_id: str
    harness_state_version: str
    hook: str
    format: str  # the leading element; a key into HarnessState.element_weights
    angle: str
    script: str
    visual_prompt: str
    elements: list[str] = []  # element tags used (keys into element_weights)
    created_by: str = "content-generator"
    # ── Eng 1 additions (optional) ──
    concept_id: Optional[str] = None  # ≡ id
    generation: Optional[int] = None  # ≡ generation_number
    trend_id: Optional[str] = None  # ≡ trend_context_id
    element_weights: dict = {}  # inner-loop policy weight snapshot for this concept
    storyboard: list[str] = []
    seedance_prompt: Optional[str] = None  # ≡ visual_prompt
    duration_sec: Optional[int] = None  # ≡ length
    created_at: Optional[datetime] = None
    # ── short-form-video attributes (Eng 1's TikTok feature set; optional) ──
    dance_style: Optional[str] = None
    audio: Optional[Audio] = None
    cut_frequency: Optional[float] = None  # cuts per second
    hashtag_set: Optional[list[str]] = None
    posting_time: Optional[datetime] = None  # recommended/planned post time


# the judge rubric, as numbers. Keys MUST equal the dimensions in docs/JUDGE_RUBRIC.md.
class RewardDimensions(BaseModel):
    hook_strength: float
    trend_fit: float
    brand_fit: float
    novelty: float
    clarity: float
    cringe_risk: float  # higher = worse
    policy_risk: float  # higher = worse
    visual_feasibility: float


# 3. RewardScore — produced by B (Critic), consumed by A (Loop core)
class RewardScore(BaseModel):
    # ── core (render-ready) ──
    id: str = Field(default_factory=lambda: _id("rs"))
    concept_id: str
    generation_number: int
    harness_state_version: str
    dimensions: RewardDimensions
    weighted_total: float  # aggregate; risk dims penalize
    predicted_win_prob: Optional[float] = None  # pairwise win prob vs baseline, 0..1
    policy_flag: bool = False  # policy_risk over threshold
    judge_rationale: str
    # ── Eng 1 additions (optional) ──
    predicted_score: Optional[float] = None  # ≡ normalized weighted_total, 0..1
    pairwise_winprob: Optional[float] = None  # ≡ predicted_win_prob
    confidence: Optional[float] = None
    scored_by: Optional[str] = None
    rationale: Optional[str] = None  # ≡ judge_rationale
    scored_at: Optional[datetime] = None


# 4. HarnessState — the mutable scaffold. Read by C (Generator). Rewritten by A (Meta-agent).
#    The Critic's rubric is NOT stored here (separate generation from evaluation); we only
#    reference its version via rubric_version for traceability (DECISIONS.md D8/JUDGE_RUBRIC).
class HarnessState(BaseModel):
    # ── core (render-ready) ──
    id: str = Field(default_factory=lambda: _id("hs"))
    version: str
    element_weights: dict  # Record<string, number> — generation biases (the action space, weighted)
    script_prompt: str
    seedance_prompt_template: str
    judge_rubric: str
    policy_rules: list[str] = []
    updated_from_generation_id: Optional[str] = None
    # ── Eng 1 additions (scaffold + lineage; optional) ──
    generation: Optional[int] = None  # ≡ version index
    system_prompt: Optional[str] = None  # ≡ script_prompt
    tools: list[str] = []
    element_taxonomy: list[str] = []  # the action space the meta-agent can expand
    few_shot_examples: list[dict] = []
    rubric_version: Optional[str] = None  # which critic rubric scored this gen
    parent_harness_id: Optional[str] = None
    diff_summary: Optional[str] = None  # what the meta-agent changed this gen


# a proposed change to HarnessState, produced by the Meta-Agent (rendered by the dashboard)
class HarnessDiff(BaseModel):
    id: str = Field(default_factory=lambda: _id("hd"))
    from_version: str
    to_version: str
    element_weight_changes: dict  # per-element deltas
    script_prompt_change: Optional[str] = None
    seedance_prompt_template_change: Optional[str] = None
    judge_rubric_change: Optional[str] = None
    policy_rule_changes: Optional[list[str]] = None
    rationale: str
    accepted: bool  # whether the loop applied this diff


# a distilled living-memory lesson. See docs/HARNESS_MEMORY.md.
class Lesson(BaseModel):
    id: str = Field(default_factory=lambda: _id("ls"))
    generation_number: int
    observation: str
    rule: str
    evidence: str
    harness_change: str
    expected_effect: str


# 5. GenerationRecord — produced by A (Loop core), persisted as JSON (the "wiki" row).
#    Render-ready: embeds the concept + score + diff + lesson so the dashboard needs no joins.
class GenerationRecord(BaseModel):
    # ── core (render-ready) ──
    id: str = Field(default_factory=lambda: _id("gr"))
    generation_number: int
    created_at: datetime = Field(default_factory=_now)
    trend_context_id: str
    concept: ContentConcept
    score: RewardScore
    harness_state_version_before: str
    harness_state_version_after: Optional[str] = None
    harness_diff: Optional[HarnessDiff] = None
    lesson: Optional[Lesson] = None
    # ── Eng 1 additions (lean refs + posting; optional) ──
    record_id: Optional[str] = None  # ≡ id
    generation: Optional[int] = None  # ≡ generation_number
    trend_id: Optional[str] = None  # ≡ trend_context_id
    concept_id: Optional[str] = None  # ≡ concept.id
    harness_id: Optional[str] = None
    predicted_score: Optional[float] = None  # ≡ score.weighted_total
    actual_engagement: Optional[dict] = None  # {views, likes}; None until posted
    rubric_version: Optional[str] = None
    diff_summary: Optional[str] = None
    selected: bool = True
    post_url: Optional[str] = None


# ---- STUB FACTORIES: unblock yourself before the real producer exists ----
# Themed to match the dashboard's AI-founder demo narrative (see scripts/dump_stubs.py
# for the canonical, deterministic stub content written to data/stubs/).
def stub_trend() -> TrendContext:
    return TrendContext(
        id="tc_0001",
        platform="x",
        audience="ai-founders",
        trend_summary="Founders push back on 'AI wrapper' criticism; distribution and taste are the real moats.",
        signals=[TrendSignal(label="format: contrarian take", strength=0.8)],
        source="stub",
    )


def stub_harness(generation: int = 0) -> HarnessState:
    return HarnessState(
        id="hs_0001",
        version=f"v{generation}",
        element_weights={"contrarian_hook": 0.5, "diagnostic_hook": 0.4, "generic_listicle": 0.2},
        script_prompt="Write a 30-second short-form video script for a founder-facing AI audience. Lead with a strong hook.",
        seedance_prompt_template="A clean, modern talking-head explainer for {{audience}}. Scene reflects: {{angle}}.",
        judge_rubric="Score the 8 dimensions in docs/JUDGE_RUBRIC.md; penalize risk dimensions.",
        policy_rules=["No unverifiable claims about named companies."],
        element_taxonomy=["contrarian_hook", "diagnostic_hook", "founder_story", "data_drop", "generic_listicle"],
        rubric_version="v1",
        generation=generation,
    )


def stub_concept(trend_id: str, generation: int = 1) -> ContentConcept:
    return ContentConcept(
        generation_number=generation,
        trend_context_id=trend_id,
        harness_state_version="v0",
        hook="Your AI startup isn't a wrapper problem. It's a taste problem.",
        format="contrarian_hook",
        angle="Distribution and taste are the real moats, not the model.",
        script="Everyone says you're just a GPT wrapper...",
        visual_prompt="A clean, modern talking-head explainer for ai-founders. Scene reflects: taste as a moat.",
        elements=["contrarian_hook"],
        element_weights={"contrarian_hook": 0.5},
    )


def stub_reward(concept_id: str) -> RewardScore:
    return RewardScore(
        concept_id=concept_id,
        generation_number=1,
        harness_state_version="v0",
        dimensions=RewardDimensions(
            hook_strength=0.82, trend_fit=0.78, brand_fit=0.7, novelty=0.68,
            clarity=0.74, cringe_risk=0.18, policy_risk=0.05, visual_feasibility=0.8,
        ),
        weighted_total=0.71,
        predicted_win_prob=0.5,
        policy_flag=False,
        judge_rationale="Strong contrarian hook; baseline win probability anchored at 0.5.",
        predicted_score=0.71,
        pairwise_winprob=0.5,
        confidence=0.6,
        scored_by="stub-critic",
    )
