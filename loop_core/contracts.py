"""
contracts.py — the loop core's INTERNAL data model (lean / flat). NOT the
cross-workstream source of truth: that is the canonical `harness/contracts.py`
(render-ready + ACOE), which the dashboard and the other workstreams import.
Only loop_core imports this module; the loop's lean output is mapped to the
canonical GenerationRecord[] by a one-way bridge adapter (see
docs/LOOP_CORE_BRIDGE.md, DECISIONS.md D12). Build against the stubs until the
real producers land.

FLOW:
  TrendContext   --(C: Generator, reads HarnessState)-->  ContentConcept
  ContentConcept + HarnessState --(B: Critic)---------->  RewardScore
  RewardScore    --(A: Loop core, inner-loop policy)--->  updated element weights
  per generation: A writes GenerationRecord (persisted as JSON by loop.py)
  HarnessState   --(A: Meta-agent rewrites it each gen)-> new HarnessState

Conventions:
  - Timestamps UTC, ISO-8601 on the wire.
  - Persist with .model_dump_json(); load with .model_validate_json().
  - Storage is plain JSON files today (see loop.py). Redis is a WeaveHacks stretch.
"""

from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field
import uuid


def _now() -> datetime:
    return datetime.now(timezone.utc)

def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


# 1. TrendContext — produced by C (Trend Scout / Tavily), consumed by C (Generator)
class TrendContext(BaseModel):
    trend_id: str = Field(default_factory=lambda: _id("trend"))
    topic: str
    hook: str
    format: str
    audio: Optional[str] = None
    region: str = "global"
    source_urls: list[str] = []
    raw_signals: dict = {}
    captured_at: datetime = Field(default_factory=_now)


# 2. ContentConcept — produced by C (Generator + policy), consumed by B (Critic) & C (Renderer)
#    elements = snapshot of the inner-loop policy weights used for this concept.
class ContentConcept(BaseModel):
    concept_id: str = Field(default_factory=lambda: _id("concept"))
    trend_id: str
    generation: int
    elements: dict[str, float]
    storyboard: list[str]
    script: str
    seedance_prompt: str
    duration_sec: int = 8
    created_at: datetime = Field(default_factory=_now)


# 3. RewardScore — produced by B (Critic), consumed by A (Loop core)
class RewardScore(BaseModel):
    concept_id: str
    predicted_score: float        # 0..1
    pairwise_winprob: float       # 0..1, P(beats a baseline concept)
    rationale: str
    confidence: float = 0.5
    scored_by: str = "stub-critic"
    scored_at: datetime = Field(default_factory=_now)


# 4. HarnessState — the mutable scaffold. Read by C (Generator). Rewritten by A (Meta-agent)
#    once per generation. The CRITIC's rubric is NOT here — it lives with B (separate
#    generation from evaluation); we only reference its version for traceability.
class HarnessState(BaseModel):
    harness_id: str = Field(default_factory=lambda: _id("harness"))
    generation: int
    system_prompt: str
    tools: list[str] = []
    element_taxonomy: list[str] = []     # the action space the meta-agent can expand
    few_shot_examples: list[dict] = []   # priors (e.g. prior posts), NOT statistical calibration
    rubric_version: str = "v1"           # which critic rubric scored this gen
    parent_harness_id: Optional[str] = None
    diff_summary: Optional[str] = None   # what the meta-agent changed this gen


# 5. GenerationRecord — produced by A (Loop core), persisted as JSON (the "wiki" row).
#    Read by the meta-agent (to rewrite the harness) and by D (to draw the chart).
class GenerationRecord(BaseModel):
    record_id: str = Field(default_factory=lambda: _id("rec"))
    generation: int
    trend_id: str
    concept_id: str
    harness_id: str
    predicted_score: float
    actual_engagement: Optional[dict] = None   # {views, likes}; None until posted
    harness_diff: Optional[str] = None
    rubric_version: Optional[str] = None
    selected: bool = True
    post_url: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


# ---- STUB FACTORIES: use to unblock yourself before the real producer exists ----
def stub_trend() -> TrendContext:
    return TrendContext(
        topic="90s office desk glow-up",
        hook="POV: your cubicle in 1997 vs now",
        format="POV skit",
        audio="trending lo-fi boom-bap",
        region="US",
        source_urls=["https://example.com/tiktok/abc"],
        raw_signals={"views": 1_200_000, "comment_themes": ["nostalgia", "satisfying"]},
    )

def stub_harness(generation: int = 0) -> HarnessState:
    return HarnessState(
        generation=generation,
        system_prompt="You generate 8s short-form video concepts. Lead with a strong hook.",
        tools=["tavily_search", "seedance_render"],
        element_taxonomy=["comedy", "90s_aesthetic", "text_hook_frame1",
                          "trending_audio_sync", "slow_pan_intro"],
        few_shot_examples=[{"concept": "POV 90s cubicle glow-up", "engagement": 15000}],
        rubric_version="v1",
    )

def stub_concept(trend_id: str, generation: int = 0) -> ContentConcept:
    return ContentConcept(
        trend_id=trend_id, generation=generation,
        elements={"comedy": 0.3, "text_hook_frame1": 0.4, "trending_audio_sync": 0.3},
        storyboard=["frame1: on-screen text hook", "beat-drop reveal", "punchline cut"],
        script="POV: your cubicle in 1997 vs now",
        seedance_prompt="8s POV skit, 90s office aesthetic, comedic reveal on beat drop",
    )

def stub_reward(concept_id: str) -> RewardScore:
    return RewardScore(concept_id=concept_id, predicted_score=0.41,
        pairwise_winprob=0.58, rationale="strong frame-1 hook; weak audio sync",
        confidence=0.6, scored_by="stub-critic")

def stub_record(generation: int, trend_id: str, concept_id: str,
                predicted: float, harness_id: str = "harness_seed") -> GenerationRecord:
    return GenerationRecord(generation=generation, trend_id=trend_id,
        concept_id=concept_id, harness_id=harness_id, predicted_score=predicted,
        harness_diff="added 'text_hook_frame1'; raised comedy weight", selected=True)
