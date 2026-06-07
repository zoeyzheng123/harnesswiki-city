"""Reward critic for short-form dance concepts.

The critic has two jobs:

1. Apply the ACOE v1 rubric consistently and preserve criterion-level evidence.
2. Map the richer dance-video judgement back to the canonical eight
   RewardDimensions consumed by the loop and dashboard.

The module works without an API key through a deterministic prompt-preflight
fallback. Pass a ``judge`` callable to use an LLM with structured JSON output.
"""

from __future__ import annotations

import json
import math
import re
from collections.abc import Callable, Mapping
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from harness.contracts import (
    ContentConcept,
    HarnessState,
    RewardDimensions,
    RewardScore,
    TrendContext,
)

try:
    import weave
except ImportError:  # The MVP keeps Weave optional until credentials are wired.
    weave = None


EvaluationMode = Literal[
    "prompt_preflight",
    "rendered_video",
    "publishing_package",
]
CriterionStatus = Literal["pass", "partial", "fail", "unknown"]
EvidenceType = Literal[
    "requested",
    "predicted",
    "observed",
    "supplied_metadata",
]


def _weave_op(function):
    if weave is None:
        return function
    return weave.op()(function)


RUBRIC_VERSION = "ACOE-YT-SHORTS-v1.0"  # must match data/policies/<policy_id>.json
APPROVED_AUDIO_POOL_AS_OF = "2026-06-06"
PRIORITY_AUDIO_TITLES = {
    "i just might",
    "shabang",
    "the cure",
    "the fate of ophelia",
    "be her",
}
AVOID_AUDIO_TITLES = {"janice stfu"}

ACOE_RUBRIC: dict[str, dict[str, Any]] = {
    "hook_quality": {
        "max_points": 30,
        "criteria": {
            "HQ-01": {"max_points": 10, "partial_points": 0},
            "HQ-02": {"max_points": 8, "partial_points": 4},
            "HQ-03": {"max_points": 7, "partial_points": 4},
            "HQ-04": {"max_points": 5, "partial_points": 0},
        },
    },
    "retention_and_loop": {
        "max_points": 25,
        "criteria": {
            "RL-01": {"max_points": 8, "partial_points": 4},
            "RL-02": {"max_points": 10, "partial_points": 6},
            "RL-03": {"max_points": 7, "partial_points": 4},
        },
    },
    "engagement_bait": {
        "max_points": 20,
        "criteria": {
            "EB-01": {"max_points": 10, "partial_points": 5},
            "EB-02": {"max_points": 5, "partial_points": 3},
            "EB-03": {"max_points": 5, "partial_points": 0},
        },
    },
    "visual_production": {
        "max_points": 15,
        "criteria": {
            "VP-01": {"max_points": 5, "partial_points": 3},
            "VP-02": {"max_points": 4, "partial_points": 2},
            "VP-03": {"max_points": 6, "partial_points": 4},
        },
    },
    "audio_alignment": {
        "max_points": 5,
        "criteria": {
            "AA-01": {"max_points": 3, "partial_points": 2},
            "AA-02": {"max_points": 2, "partial_points": 1},
        },
    },
    "metadata": {
        "max_points": 5,
        "criteria": {
            "MD-01": {"max_points": 2, "partial_points": 0},
            "MD-02": {"max_points": 2, "partial_points": 1},
            "MD-03": {"max_points": 1, "partial_points": 0},
        },
    },
}

CRITERION_IDS = tuple(
    criterion_id
    for category in ACOE_RUBRIC.values()
    for criterion_id in category["criteria"]
)

CRITERION_GUIDANCE = {
    "HQ-01": "Peak motion is visible in frame 1.",
    "HQ-02": "The background strongly separates the dancer.",
    "HQ-03": "A bold visual or text pattern interrupt appears by 1.5 seconds.",
    "HQ-04": "Dance motion starts immediately with no title card or fade.",
    "RL-01": "Duration is 13-15 seconds (16-18 is partial).",
    "RL-02": "The final pose and camera framing reconnect to frame 1.",
    "RL-03": "Motion remains active with no dead zones.",
    "EB-01": "An on-screen question invites a meaningful typed response.",
    "EB-02": "The question remains legible for most of the video.",
    "EB-03": "The question invites ranking, comparison, or a specific opinion.",
    "VP-01": "The dancer is the clear visual focal point.",
    "VP-02": "Wardrobe has dynamic light interaction or strong contrast.",
    "VP-03": "The render is crisp without body, face, or motion artifacts.",
    "AA-01": "The supplied audio belongs to the approved current pool.",
    "AA-02": "Movement peaks align to distinct beat hits.",
    "MD-01": "The publishing title mirrors the on-screen question.",
    "MD-02": "Hashtags mix niche, broad, and audio-anchor tags.",
    "MD-03": "The description contains a relevant comment invitation.",
}


class CriterionAssessment(BaseModel):
    id: str
    status: CriterionStatus
    evidence_type: EvidenceType
    evidence: str
    reason: str

    @field_validator("id")
    @classmethod
    def validate_id(cls, value: str) -> str:
        if value not in CRITERION_IDS:
            raise ValueError(f"unknown criterion id: {value}")
        return value


class GeneralQuality(BaseModel):
    prompt_detail: float = Field(ge=0, le=1)
    prompt_clarity: float = Field(ge=0, le=1)
    sequence_flow: float = Field(ge=0, le=1)
    choreography_coherence: float = Field(ge=0, le=1)
    music_motion_alignment: float = Field(ge=0, le=1)
    vibe_coherence: float = Field(ge=0, le=1)
    visual_direction: float = Field(ge=0, le=1)
    video_model_feasibility: float = Field(ge=0, le=1)
    originality: float = Field(ge=0, le=1)
    viewer_satisfaction_potential: float = Field(ge=0, le=1)


class PolicyLearning(BaseModel):
    confidence: float = Field(default=0, ge=0, le=1)
    winning_elements: list[str] = Field(default_factory=list)
    weak_elements: list[str] = Field(default_factory=list)
    policy_deltas: dict[str, float] = Field(default_factory=dict)
    new_candidate_elements: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)

    @field_validator("policy_deltas")
    @classmethod
    def clamp_deltas(cls, value: dict[str, float]) -> dict[str, float]:
        return {key: max(-0.10, min(0.10, delta)) for key, delta in value.items()}


class RawJudgeResponse(BaseModel):
    criteria: list[CriterionAssessment]
    general_quality: GeneralQuality
    cringe_risk: float = Field(ge=0, le=1)
    policy_risk: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    missing_evidence: list[str] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    predicted_generation_failures: list[str] = Field(default_factory=list)
    recommended_fix_priority: list[str] = Field(default_factory=list)
    revised_generation_prompt: str = ""
    policy_learning: PolicyLearning = Field(default_factory=PolicyLearning)
    needs_human_review: bool = False

    @model_validator(mode="after")
    def require_every_criterion_once(self) -> "RawJudgeResponse":
        ids = [criterion.id for criterion in self.criteria]
        missing = set(CRITERION_IDS) - set(ids)
        duplicates = {criterion_id for criterion_id in ids if ids.count(criterion_id) > 1}
        if missing or duplicates:
            raise ValueError(
                f"criteria must appear exactly once; missing={sorted(missing)}, "
                f"duplicates={sorted(duplicates)}"
            )
        return self


class ScoredCriterion(CriterionAssessment):
    points_awarded: int
    max_points: int


class CategoryBreakdown(BaseModel):
    score: int
    max_points: int
    criteria: list[ScoredCriterion]


class ACOEJudgeResult(BaseModel):
    policy_id: str = RUBRIC_VERSION
    evaluation_mode: EvaluationMode
    score_type: Literal["projected", "verified", "partial"]
    projected_score: Optional[int] = None
    verified_score: Optional[int] = None
    supported_subtotal: int
    evidence_coverage: float = Field(ge=0, le=1)
    distribution_tier: Optional[Literal["viral", "growing", "seed_jail"]] = None
    auto_fails_triggered: list[str] = Field(default_factory=list)
    category_breakdown: dict[str, CategoryBreakdown]
    general_quality: GeneralQuality
    cringe_risk: float = Field(ge=0, le=1)
    policy_risk: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    missing_evidence: list[str] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    predicted_generation_failures: list[str] = Field(default_factory=list)
    lowest_scoring_category: str
    recommended_fix_priority: list[str] = Field(default_factory=list)
    revised_generation_prompt: str = ""
    policy_update_allowed: bool = False
    policy_learning: PolicyLearning = Field(default_factory=PolicyLearning)
    needs_human_review: bool = False

    @property
    def headline_score(self) -> int:
        if self.verified_score is not None:
            return self.verified_score
        if self.projected_score is not None:
            return self.projected_score
        return self.supported_subtotal


JudgeCallable = Callable[[str, str], str | Mapping[str, Any]]


ACOE_JUDGE_SYSTEM_PROMPT = """\
You are ACOE Dance Judge v1.0, an evidence-based evaluator for AI-generated
YouTube Shorts dance videos and generation prompts.

Judge the supplied material against every criterion. Return JSON matching the
provided schema. Do not perform score arithmetic; the application computes
points from your pass/partial/fail/unknown decisions.

Evidence discipline:
- In prompt_preflight mode, evaluate what the prompt explicitly requests and
  predict failures. Never claim the requested feature appeared in a video.
- In rendered_video mode, use only supplied frame, timing, audio, and artifact
  observations.
- In publishing_package mode, also evaluate supplied title, description,
  hashtags, and audio provenance.
- Use unknown when evidence is missing. Never invent frames, timestamps,
  trending status, engagement outcomes, or metadata.
- Cite a concrete prompt phrase, observation, timestamp, or metadata value for
  every non-unknown decision.
- Do not reward prompt length or cinematic jargon by itself.
- Evaluate vibe as coherence among music, choreography, performer, wardrobe,
  setting, lighting, color, and camera behavior.
- Treat distribution tiers as experimental labels, not guaranteed views.

Policy learning:
- Recommend deltas only from rendered evidence or real outcome metrics.
- Keep deltas between -0.10 and 0.10.
- Do not update from prompt_preflight.
- Do not infer causality from one random generation.
- Lower confidence and request human review when evidence is subjective,
  conflicting, or incomplete.
"""


def _raw_response_schema() -> str:
    return json.dumps(RawJudgeResponse.model_json_schema(), indent=2)


def _concept_text(concept: ContentConcept) -> str:
    parts = [
        concept.hook,
        concept.angle,
        concept.script,
        concept.visual_prompt,
        concept.seedance_prompt or "",
        *concept.storyboard,
    ]
    unique_parts = list(dict.fromkeys(part.strip() for part in parts if part.strip()))
    return "\n".join(unique_parts)


def _contains(text: str, *phrases: str) -> bool:
    lowered = text.lower()
    return any(phrase in lowered for phrase in phrases)


def _assessment(
    criterion_id: str,
    status: CriterionStatus,
    evidence: str,
    reason: str,
    evidence_type: EvidenceType = "requested",
) -> CriterionAssessment:
    return CriterionAssessment(
        id=criterion_id,
        status=status,
        evidence_type=evidence_type,
        evidence=evidence,
        reason=reason,
    )


def _quality_from_prompt(text: str, concept: ContentConcept) -> GeneralQuality:
    detail_signals = sum(
        _contains(text, phrase)
        for phrase in (
            "camera",
            "lighting",
            "background",
            "outfit",
            "beat",
            "frame",
            "seconds",
            "choreograph",
        )
    )
    clarity = 0.75 if 25 <= len(text.split()) <= 220 else 0.55
    flow = 0.8 if _contains(text, "then", "followed by", "transition", "return") else 0.55
    music = 0.85 if _contains(text, "beat", "drop", "accent", "bpm", "rhythm") else 0.4
    choreography = 0.8 if _contains(
        text, "dance", "footwork", "isolation", "spin", "freeze", "choreograph"
    ) else 0.45
    vibe = 0.75 if sum(
        _contains(text, phrase)
        for phrase in ("mood", "vibe", "lighting", "color", "outfit", "style")
    ) >= 2 else 0.55
    visual = 0.8 if _contains(text, "camera", "lighting", "background") else 0.5
    feasibility = 0.78
    if _contains(text, "rapid orbit", "multiple dancers", "complex footwork", "fast cuts"):
        feasibility -= 0.25
    originality = 0.7 if _contains(
        text, "signature", "unexpected", "reveal", "pattern interrupt"
    ) else 0.5
    satisfaction = (flow + music + choreography + vibe + feasibility) / 5
    return GeneralQuality(
        prompt_detail=min(0.95, 0.45 + detail_signals * 0.06),
        prompt_clarity=clarity,
        sequence_flow=flow,
        choreography_coherence=choreography,
        music_motion_alignment=music,
        vibe_coherence=vibe,
        visual_direction=visual,
        video_model_feasibility=max(0, feasibility),
        originality=originality,
        viewer_satisfaction_potential=satisfaction,
    )


def deterministic_prompt_preflight(
    concept: ContentConcept,
    *,
    metadata: Optional[Mapping[str, Any]] = None,
) -> RawJudgeResponse:
    """Apply a conservative local preflight when no LLM client is configured."""

    text = _concept_text(concept)
    lowered = text.lower()
    metadata = metadata or {}
    assessments: list[CriterionAssessment] = []

    peak_motion = _contains(
        text,
        "frame 1",
        "first frame",
        "mid-movement",
        "mid movement",
        "peak motion",
        "opens on a",
    ) and _contains(text, "dance", "spin", "jump", "kick", "freeze", "motion", "move")
    assessments.append(
        _assessment(
            "HQ-01",
            "pass" if peak_motion else "fail",
            "Prompt requests peak motion in the opening frame." if peak_motion else "No explicit peak-motion frame-1 instruction.",
            CRITERION_GUIDANCE["HQ-01"],
        )
    )

    high_contrast = _contains(
        text, "high-contrast", "high contrast", "solid background", "neon background", "black background", "white background"
    )
    minimal_background = _contains(text, "clean background", "minimal background", "uncluttered")
    assessments.append(
        _assessment(
            "HQ-02",
            "pass" if high_contrast else "partial" if minimal_background else "fail",
            "Background direction: " + (
                "explicit high contrast." if high_contrast
                else "minimal but not explicitly high contrast." if minimal_background
                else "not specified as isolated or high contrast."
            ),
            CRITERION_GUIDANCE["HQ-02"],
        )
    )

    text_overlay = _contains(text, "on-screen text", "on screen text", "text overlay", "caption")
    early_text = text_overlay and _contains(
        text, "first 1.5", "first 2", "frame 1", "from 0:", "immediately"
    )
    assessments.append(
        _assessment(
            "HQ-03",
            "pass" if early_text else "partial" if text_overlay else "fail",
            "Prompt " + (
                "places a text/visual interrupt in the opening." if early_text
                else "requests text but does not anchor it to the opening." if text_overlay
                else "does not request an opening pattern interrupt."
            ),
            CRITERION_GUIDANCE["HQ-03"],
        )
    )

    has_intro = _contains(text, "fade in", "title card", "logo animation", "standing pose", "starts standing")
    immediate_motion = _contains(
        text, "starts immediately", "motion begins immediately", "at 0:00", "no intro", "opens mid"
    )
    assessments.append(
        _assessment(
            "HQ-04",
            "fail" if has_intro else "pass" if immediate_motion else "unknown",
            "Prompt explicitly includes an intro/static start." if has_intro
            else "Prompt explicitly requests immediate motion." if immediate_motion
            else "Start timing is not explicit.",
            CRITERION_GUIDANCE["HQ-04"],
        )
    )

    duration = concept.duration_sec
    duration_status: CriterionStatus = "unknown"
    if duration is not None:
        if 13 <= duration <= 15:
            duration_status = "pass"
        elif 16 <= duration <= 18:
            duration_status = "partial"
        else:
            duration_status = "fail"
    assessments.append(
        _assessment(
            "RL-01",
            duration_status,
            f"Requested duration: {duration}s." if duration is not None else "Duration is missing.",
            CRITERION_GUIDANCE["RL-01"],
        )
    )

    seamless_loop = _contains(
        text, "seamless loop", "final frame matches", "returns to the opening", "loop back"
    )
    loop_hint = _contains(text, "loop", "final pose", "return to")
    assessments.append(
        _assessment(
            "RL-02",
            "pass" if seamless_loop else "partial" if loop_hint else "fail",
            "Loop direction: " + (
                "explicit frame/pose match." if seamless_loop
                else "mentioned without a precise frame match." if loop_hint
                else "not specified."
            ),
            CRITERION_GUIDANCE["RL-02"],
        )
    )

    continuous_energy = _contains(
        text, "no dead zones", "continuous motion", "constant motion", "energy escalates", "throughout"
    )
    assessments.append(
        _assessment(
            "RL-03",
            "pass" if continuous_energy else "unknown",
            "Prompt requests continuous or escalating motion." if continuous_energy else "Pacing continuity is not explicit.",
            CRITERION_GUIDANCE["RL-03"],
        )
    )

    question_present = "?" in text or _contains(
        text, "rate 1-10", "rate this", "name a song", "drop the next", "comment"
    )
    comparative_question = question_present and _contains(
        text, "better", "harder", "best", "rate", "which", "rank", "next song"
    )
    yes_no_question = bool(re.search(r"\b(do|does|is|are|would|can) .+\?", lowered))
    assessments.append(
        _assessment(
            "EB-01",
            "pass" if comparative_question else "partial" if question_present and not yes_no_question else "fail",
            "Prompt includes a specific typed-response invitation." if comparative_question
            else "Prompt includes a question, but its response demand is weak." if question_present
            else "No typed-response question is requested.",
            CRITERION_GUIDANCE["EB-01"],
        )
    )

    full_duration_text = text_overlay and _contains(
        text, "full duration", "entire video", "throughout", "from 0:00 to"
    )
    assessments.append(
        _assessment(
            "EB-02",
            "pass" if full_duration_text else "partial" if text_overlay else "fail",
            "Question/text visibility: " + (
                "full duration requested." if full_duration_text
                else "text requested without duration." if text_overlay
                else "no overlay requested."
            ),
            CRITERION_GUIDANCE["EB-02"],
        )
    )
    assessments.append(
        _assessment(
            "EB-03",
            "pass" if comparative_question else "fail",
            "Question invites ranking/comparison." if comparative_question else "No specific comparative opinion prompt.",
            CRITERION_GUIDANCE["EB-03"],
        )
    )

    isolated = _contains(
        text, "sole focal point", "isolated dancer", "centered dancer", "clean background", "single dancer"
    )
    dancer_present = _contains(text, "dancer", "solo")
    assessments.append(
        _assessment(
            "VP-01",
            "pass" if isolated else "partial" if dancer_present else "fail",
            "Composition " + (
                "explicitly isolates the dancer." if isolated
                else "contains a dancer without strong isolation direction." if dancer_present
                else "does not establish the dancer as the focal point."
            ),
            CRITERION_GUIDANCE["VP-01"],
        )
    )

    reflective = _contains(text, "reflective", "metallic", "sequined", "light-reactive")
    bold_outfit = _contains(text, "high-contrast outfit", "bold outfit", "bright outfit")
    assessments.append(
        _assessment(
            "VP-02",
            "pass" if reflective else "partial" if bold_outfit else "fail",
            "Wardrobe is " + (
                "reflective/light-reactive." if reflective
                else "bold but not light-reactive." if bold_outfit
                else "not specified as dynamic or contrasting."
            ),
            CRITERION_GUIDANCE["VP-02"],
        )
    )

    artifact_control = _contains(
        text, "4k", "crisp", "no artifacts", "anatomically stable", "consistent face", "consistent body"
    )
    high_quality = _contains(text, "high quality", "cinematic", "sharp detail")
    assessments.append(
        _assessment(
            "VP-03",
            "pass" if artifact_control else "partial" if high_quality else "unknown",
            "Prompt " + (
                "explicitly requests artifact and identity stability." if artifact_control
                else "requests general quality without artifact controls." if high_quality
                else "does not specify render-quality safeguards."
            ),
            CRITERION_GUIDANCE["VP-03"],
            "predicted",
        )
    )

    audio = concept.audio
    audio_name = (audio.name if audio else "") or ""
    normalized_audio_name = audio_name.strip().lower()
    if normalized_audio_name in PRIORITY_AUDIO_TITLES:
        audio_status: CriterionStatus = "pass"
        audio_evidence = (
            f"{audio_name} is in the policy's priority pool dated "
            f"{APPROVED_AUDIO_POOL_AS_OF}."
        )
    elif normalized_audio_name in AVOID_AUDIO_TITLES:
        audio_status = "fail"
        audio_evidence = f"{audio_name} is in the policy's avoid list."
    elif audio and audio.is_rising_sound is True:
        audio_status = "partial"
        audio_evidence = (
            f"{audio_name or 'Audio'} is supplied as rising, but approved-pool "
            "membership is not confirmed."
        )
    elif audio and audio.is_rising_sound is False:
        audio_status = "fail"
        audio_evidence = f"{audio_name or 'Audio'} is explicitly not rising."
    else:
        audio_status = "unknown"
        audio_evidence = "Approved-pool provenance is not supplied."
    assessments.append(
        _assessment(
            "AA-01",
            audio_status,
            audio_evidence,
            CRITERION_GUIDANCE["AA-01"],
            "supplied_metadata",
        )
    )

    beat_sync = _contains(
        text, "beat sync", "on the beat", "beat hit", "beat drop", "rhythmic accent", "music accent"
    )
    assessments.append(
        _assessment(
            "AA-02",
            "pass" if beat_sync else "fail",
            "Prompt maps movement to beat accents." if beat_sync else "No explicit movement-to-beat mapping.",
            CRITERION_GUIDANCE["AA-02"],
        )
    )

    title = str(metadata.get("title", ""))
    description = str(metadata.get("description", ""))
    hashtags = list(metadata.get("hashtags") or concept.hashtag_set or [])
    assessments.append(
        _assessment(
            "MD-01",
            "pass" if title and question_present and any(word in title.lower() for word in re.findall(r"[a-z0-9]+", lowered)[-8:])
            else "unknown" if not title else "fail",
            f"Supplied title: {title}" if title else "Publishing title is not supplied.",
            CRITERION_GUIDANCE["MD-01"],
            "supplied_metadata",
        )
    )

    niche = sum(tag.lower() in {"#aidance", "#aiart", "#aianimation"} for tag in hashtags)
    broad = sum(tag.lower() in {"#shorts", "#viral", "#fyp", "#trending"} for tag in hashtags)
    audio_anchor = bool(
        audio and audio.name and any(audio.name.lower().replace(" ", "") in tag.lower().replace(" ", "") for tag in hashtags)
    )
    complete_mix = niche >= 3 and broad >= 4 and audio_anchor
    categories_present = sum((niche > 0, broad > 0, audio_anchor))
    assessments.append(
        _assessment(
            "MD-02",
            "pass" if complete_mix else "partial" if categories_present >= 2 else "unknown" if not hashtags else "fail",
            f"Supplied hashtags: {hashtags}" if hashtags else "Hashtags are not supplied.",
            CRITERION_GUIDANCE["MD-02"],
            "supplied_metadata",
        )
    )
    assessments.append(
        _assessment(
            "MD-03",
            "pass" if description and _contains(description, "comment", "drop", "tell me", "rate")
            else "unknown" if not description else "fail",
            f"Supplied description: {description}" if description else "Publishing description is not supplied.",
            CRITERION_GUIDANCE["MD-03"],
            "supplied_metadata",
        )
    )

    quality = _quality_from_prompt(text, concept)
    weaknesses = [
        criterion.reason
        for criterion in assessments
        if criterion.status == "fail"
    ][:5]
    missing = [
        criterion.reason
        for criterion in assessments
        if criterion.status == "unknown"
    ]
    return RawJudgeResponse(
        criteria=assessments,
        general_quality=quality,
        cringe_risk=0.25 if comparative_question else 0.12,
        policy_risk=0.05,
        confidence=0.58,
        strengths=[
            criterion.reason
            for criterion in assessments
            if criterion.status == "pass"
        ][:5],
        weaknesses=weaknesses,
        missing_evidence=missing,
        contradictions=[],
        predicted_generation_failures=[
            "Requested motion and camera complexity may reduce anatomical stability."
        ] if quality.video_model_feasibility < 0.65 else [],
        recommended_fix_priority=weaknesses[:3],
        revised_generation_prompt=concept.seedance_prompt or concept.visual_prompt,
        policy_learning=PolicyLearning(confidence=0.58),
        needs_human_review=True,
    )


def build_judge_request(
    concept: ContentConcept,
    *,
    evaluation_mode: EvaluationMode,
    harness_state: Optional[HarnessState] = None,
    trend_context: Optional[TrendContext] = None,
    evidence: Optional[Mapping[str, Any]] = None,
) -> tuple[str, str]:
    payload = {
        "evaluation_mode": evaluation_mode,
        "rubric_version": RUBRIC_VERSION,
        "concept": concept.model_dump(mode="json", exclude_none=True),
        "sampled_policy_elements": concept.element_weights,
        "harness_policy_rules": harness_state.policy_rules if harness_state else [],
        "trend_context": (
            trend_context.model_dump(mode="json", exclude_none=True)
            if trend_context else None
        ),
        "evidence": dict(evidence or {}),
        "criteria": CRITERION_GUIDANCE,
        "rubric": ACOE_RUBRIC,
        "dated_audio_policy": {
            "as_of": APPROVED_AUDIO_POOL_AS_OF,
            "priority_titles": sorted(PRIORITY_AUDIO_TITLES),
            "avoid_titles": sorted(AVOID_AUDIO_TITLES),
        },
        "output_schema": json.loads(_raw_response_schema()),
    }
    return ACOE_JUDGE_SYSTEM_PROMPT, json.dumps(payload, indent=2)


def _parse_judge_response(response: str | Mapping[str, Any]) -> RawJudgeResponse:
    if isinstance(response, Mapping):
        return RawJudgeResponse.model_validate(dict(response))

    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return RawJudgeResponse.model_validate_json(cleaned)


def _points_for(status: CriterionStatus, criterion: Mapping[str, int]) -> int:
    if status == "pass":
        return criterion["max_points"]
    if status == "partial":
        return criterion["partial_points"]
    return 0


def _tier(score: int) -> Literal["viral", "growing", "seed_jail"]:
    if score >= 85:
        return "viral"
    if score >= 65:
        return "growing"
    return "seed_jail"


def score_judgement(
    raw: RawJudgeResponse,
    *,
    evaluation_mode: EvaluationMode,
    duration_seconds: Optional[float],
) -> ACOEJudgeResult:
    by_id = {assessment.id: assessment for assessment in raw.criteria}
    breakdown: dict[str, CategoryBreakdown] = {}
    auto_fails: list[str] = []

    static_start = by_id["HQ-01"].status == "fail" and any(
        phrase in (by_id["HQ-01"].evidence + " " + by_id["HQ-04"].evidence).lower()
        for phrase in ("static", "standing", "pre-movement", "pre movement")
    )
    no_early_text = (
        by_id["HQ-03"].status == "fail"
        and by_id["EB-02"].status == "fail"
    )
    duration_violation = (
        duration_seconds is not None
        and (duration_seconds < 13 or duration_seconds > 20)
    )
    unapproved_audio = by_id["AA-01"].status == "fail"

    if static_start:
        auto_fails.append("AF-01")
    if no_early_text:
        auto_fails.append("AF-02")
    if duration_violation:
        auto_fails.append("AF-03")
    if unapproved_audio:
        auto_fails.append("AF-04")

    known_criteria = 0
    for category_name, category in ACOE_RUBRIC.items():
        scored_criteria: list[ScoredCriterion] = []
        for criterion_id, rule in category["criteria"].items():
            assessment = by_id[criterion_id]
            if assessment.status != "unknown":
                known_criteria += 1
            scored_criteria.append(
                ScoredCriterion(
                    **assessment.model_dump(),
                    points_awarded=_points_for(assessment.status, rule),
                    max_points=rule["max_points"],
                )
            )

        score = sum(item.points_awarded for item in scored_criteria)
        if category_name in {"hook_quality", "engagement_bait"} and "AF-02" in auto_fails:
            score = 0
        if category_name == "retention_and_loop" and "AF-03" in auto_fails:
            score = 0
        if category_name == "audio_alignment" and "AF-04" in auto_fails:
            score = 0
        breakdown[category_name] = CategoryBreakdown(
            score=score,
            max_points=category["max_points"],
            criteria=scored_criteria,
        )

    supported_subtotal = sum(category.score for category in breakdown.values())
    headline = 0 if "AF-01" in auto_fails else supported_subtotal
    coverage = known_criteria / len(CRITERION_IDS)
    score_type: Literal["projected", "verified", "partial"]
    projected_score: Optional[int] = None
    verified_score: Optional[int] = None
    if evaluation_mode == "prompt_preflight":
        score_type = "projected"
        projected_score = headline
    elif coverage == 1:
        score_type = "verified"
        verified_score = headline
    else:
        score_type = "partial"

    lowest_category = min(
        breakdown,
        key=lambda name: breakdown[name].score / breakdown[name].max_points,
    )
    update_allowed = (
        evaluation_mode != "prompt_preflight"
        and raw.policy_learning.confidence >= 0.70
        and bool(raw.policy_learning.evidence)
    )

    return ACOEJudgeResult(
        evaluation_mode=evaluation_mode,
        score_type=score_type,
        projected_score=projected_score,
        verified_score=verified_score,
        supported_subtotal=headline,
        evidence_coverage=coverage,
        distribution_tier=_tier(headline) if coverage == 1 or evaluation_mode == "prompt_preflight" else None,
        auto_fails_triggered=auto_fails,
        category_breakdown=breakdown,
        general_quality=raw.general_quality,
        cringe_risk=raw.cringe_risk,
        policy_risk=raw.policy_risk,
        confidence=raw.confidence,
        strengths=raw.strengths,
        weaknesses=raw.weaknesses,
        missing_evidence=raw.missing_evidence,
        contradictions=raw.contradictions,
        predicted_generation_failures=raw.predicted_generation_failures,
        lowest_scoring_category=lowest_category,
        recommended_fix_priority=raw.recommended_fix_priority,
        revised_generation_prompt=raw.revised_generation_prompt,
        policy_update_allowed=update_allowed,
        policy_learning=raw.policy_learning,
        needs_human_review=raw.needs_human_review or raw.confidence < 0.70,
    )


@_weave_op
def judge_concept(
    concept: ContentConcept,
    *,
    evaluation_mode: EvaluationMode = "prompt_preflight",
    harness_state: Optional[HarnessState] = None,
    trend_context: Optional[TrendContext] = None,
    evidence: Optional[Mapping[str, Any]] = None,
    judge: Optional[JudgeCallable] = None,
) -> ACOEJudgeResult:
    """Run deterministic preflight or an injected structured-output LLM judge."""

    if judge is None:
        if evaluation_mode != "prompt_preflight":
            raise ValueError(
                "rendered_video and publishing_package modes require an LLM "
                "judge or another evidence-aware judge callable"
            )
        raw = deterministic_prompt_preflight(
            concept,
            metadata=(evidence or {}).get("metadata"),
        )
    else:
        system_prompt, user_prompt = build_judge_request(
            concept,
            evaluation_mode=evaluation_mode,
            harness_state=harness_state,
            trend_context=trend_context,
            evidence=evidence,
        )
        raw = _parse_judge_response(judge(system_prompt, user_prompt))

    return score_judgement(
        raw,
        evaluation_mode=evaluation_mode,
        duration_seconds=concept.duration_sec,
    )


def _pairwise_probability(score: float, baseline_score: Optional[float]) -> float:
    if baseline_score is None:
        return 0.5
    temperature = 0.15
    return 1 / (1 + math.exp(-(score - baseline_score) / temperature))


def _filter_policy_learning(
    result: ACOEJudgeResult,
    concept: ContentConcept,
) -> tuple[list[str], list[str], dict[str, float]]:
    if not result.policy_update_allowed:
        return [], [], {}

    sampled = set(concept.element_weights) | set(concept.elements)
    winning = [
        element for element in result.policy_learning.winning_elements
        if element in sampled
    ]
    weak = [
        element for element in result.policy_learning.weak_elements
        if element in sampled
    ]
    deltas = {
        element: max(-0.10, min(0.10, delta))
        for element, delta in result.policy_learning.policy_deltas.items()
        if element in sampled
    }
    return winning, weak, deltas


@_weave_op
def score_concept(
    concept: ContentConcept,
    *,
    harness_state: Optional[HarnessState] = None,
    trend_context: Optional[TrendContext] = None,
    baseline_score: Optional[RewardScore] = None,
    evaluation_mode: EvaluationMode = "prompt_preflight",
    evidence: Optional[Mapping[str, Any]] = None,
    judge: Optional[JudgeCallable] = None,
) -> RewardScore:
    """Score a concept and return the canonical RewardScore used by the loop."""

    result = judge_concept(
        concept,
        evaluation_mode=evaluation_mode,
        harness_state=harness_state,
        trend_context=trend_context,
        evidence=evidence,
        judge=judge,
    )
    quality = result.general_quality
    hook = result.category_breakdown["hook_quality"].score / 30
    audio = result.category_breakdown["audio_alignment"].score / 5
    trend_fit = (audio + quality.music_motion_alignment) / 2
    clarity = (
        quality.prompt_detail
        + quality.prompt_clarity
        + quality.sequence_flow
    ) / 3
    raw_policy_score = result.headline_score / 100
    weighted_total = max(
        0.0,
        min(
            1.0,
            raw_policy_score
            - 0.10 * result.cringe_risk
            - 0.20 * result.policy_risk,
        ),
    )
    baseline_total = baseline_score.weighted_total if baseline_score else None
    pairwise = _pairwise_probability(weighted_total, baseline_total)
    winning, weak, deltas = _filter_policy_learning(result, concept)
    now = datetime.now(timezone.utc)

    rationale_parts = [
        f"ACOE {result.score_type} score {result.headline_score}/100.",
        f"Strongest evidence: {result.strengths[0]}" if result.strengths else "",
        f"Priority fix: {result.recommended_fix_priority[0]}"
        if result.recommended_fix_priority else "",
    ]
    rationale = " ".join(part for part in rationale_parts if part)

    return RewardScore(
        concept_id=concept.id,
        generation_number=concept.generation_number,
        harness_state_version=concept.harness_state_version,
        dimensions=RewardDimensions(
            hook_strength=hook,
            trend_fit=trend_fit,
            brand_fit=quality.vibe_coherence,
            novelty=quality.originality,
            clarity=clarity,
            cringe_risk=result.cringe_risk,
            policy_risk=result.policy_risk,
            visual_feasibility=quality.video_model_feasibility,
        ),
        weighted_total=weighted_total,
        predicted_win_prob=pairwise,
        policy_flag=result.policy_risk >= 0.5 or bool(result.auto_fails_triggered),
        judge_rationale=rationale,
        predicted_score=weighted_total,
        pairwise_winprob=pairwise,
        confidence=result.confidence,
        scored_by=f"acoe-dance-judge:{RUBRIC_VERSION}",
        rationale=rationale,
        scored_at=now,
        # ── ACOE structured outputs (canonical; consumed by the dashboard) ──
        total_score=result.headline_score,
        distribution_tier=result.distribution_tier,
        auto_fails_triggered=result.auto_fails_triggered,
        category_breakdown={
            name: cat.score for name, cat in result.category_breakdown.items()
        },
        lowest_scoring_category=result.lowest_scoring_category,
        recommended_fix_priority=("; ".join(result.recommended_fix_priority) or None),
        # ── learning signal (consumed by the inner loop) ──
        winning_elements=winning,
        weak_elements=weak,
        suggested_policy_updates=deltas,
        rubric_breakdown=result.model_dump(mode="json"),
    )
