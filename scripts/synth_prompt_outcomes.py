"""Balanced synthetic prompt/outcome corpus for reward-model bootstrapping.

Unlike ``scripts/synth_outcomes.py`` (a feature-calibration benchmark), this
dataset varies the actual prompt text and lets the real deterministic ACOE
preflight score it. The five prompt-quality bands cover auto-fail, weak,
seed-jail, growing, and viral examples. Seven-day synthetic views are then
derived from that score by ``harness.outcomes``.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from harness.contracts import (
    Audio,
    Candidate,
    ContentConcept,
    ExecutionMetadata,
    GenerationRecord,
)
from harness.critic import RUBRIC_VERSION, score_concept
from harness.outcomes import synthetic_week_one_outcome

SEED = 20260607
BASE_DT = datetime(2026, 6, 7, 12, 0, tzinfo=timezone.utc)

_STYLES = (
    "hip-hop power moves",
    "afrobeats footwork",
    "jazz-funk isolations",
    "breakdance freezes",
    "contemporary floorwork",
)
_BACKGROUNDS = (
    "neon-magenta",
    "electric-blue",
    "stark-white",
    "deep-black",
    "acid-green",
)
_PAYOFFS = (
    "signature freeze",
    "reverse spin",
    "impossible footwork switch",
    "beat-drop power move",
    "unexpected floor transition",
)
_QUESTIONS = (
    "Rate this choreography 1-10?",
    "Which final move is better?",
    "Rank this combo from 1 to 10?",
    "Name a song harder than this?",
    "Which move should come next?",
)
_AUDIO = ("I Just Might", "Shabang", "The Cure", "The Fate of Ophelia")


def _variant_tokens(rng: random.Random) -> tuple[str, str, str, str, str]:
    return (
        rng.choice(_STYLES),
        rng.choice(_BACKGROUNDS),
        rng.choice(_PAYOFFS),
        rng.choice(_QUESTIONS),
        rng.choice(_AUDIO),
    )


def _concept(
    generation: int,
    variant: int,
    quality: int,
    rng: random.Random,
) -> tuple[ContentConcept, dict | None]:
    style, background, payoff, question, audio_name = _variant_tokens(rng)
    common = {
        "id": f"cc_prompt_{generation:03d}_{variant}",
        "generation_number": generation,
        "trend_context_id": f"tc_prompt_{generation:03d}",
        "harness_state_version": f"v{generation - 1}",
        "format": "dance_short",
        "dance_style": style,
        "created_by": (
            "synthetic_auto_fail",
            "synthetic_weak",
            "synthetic_partial",
            "synthetic_growing",
            "synthetic_viral",
        )[quality],
        "created_at": BASE_DT + timedelta(hours=generation),
    }

    if quality == 0:
        prompt = (
            f"An 8-second {style} clip. The dancer starts standing in a static "
            "pose after a title card, then moves in a busy room."
        )
        return ContentConcept(
            **common,
            hook="A slow title card introduces the dancer.",
            angle="Generic dance clip with a delayed start.",
            script="Title card, standing pose, then dancing.",
            visual_prompt=prompt,
            seedance_prompt=prompt,
            duration_sec=8,
            elements=["static_intro"],
        ), None

    if quality == 1:
        prompt = (
            f"Frame 1 opens on {style} motion against a clean {background} "
            "background. The dancer moves, then stops. Keep it simple."
        )
        return ContentConcept(
            **common,
            hook="Frame 1 opens on dance motion.",
            angle="A minimally directed dance clip.",
            script="The dancer moves and then stops.",
            visual_prompt=prompt,
            seedance_prompt=prompt,
            duration_sec=14,
            elements=["peak_motion_frame1"],
        ), None

    if quality == 2:
        prompt = (
            f"At 0:00 frame 1 opens mid-jump in peak {style} motion. A single "
            f"centered dancer moves on the beat against a solid {background} "
            "background. On-screen text appears immediately. Return to the "
            "opening pose for a loop."
        )
        concept = ContentConcept(
            **common,
            hook="Frame 1 opens mid-jump.",
            angle="A basic beat-synchronized dance loop.",
            script=prompt,
            visual_prompt=prompt,
            seedance_prompt=prompt,
            duration_sec=14,
            on_screen_text="Watch the final move",
            audio=Audio(
                name=audio_name,
                bpm=118,
                sound_recency="rising",
                is_rising_sound=True,
            ),
            cut_frequency=0.3,
            elements=[
                "peak_motion_frame1",
                "high_contrast_bg",
                "beat_sync",
                "loop_hint",
            ],
        )
        return concept, None

    if quality == 3:
        prompt = (
            f"At 0:00 frame 1 opens mid-spin with peak {style} dance motion. "
            f"A single centered dancer performs continuous choreography against "
            f"a solid high-contrast {background} background. Bold on-screen text "
            f"'You have not seen the {payoff}' appears immediately and remains "
            f"throughout. The combo builds, but the {payoff} payoff is saved for "
            "last. Every movement peak lands on the beat hit. Return to the "
            "opening pose for a seamless loop with no dead zones."
        )
        concept = ContentConcept(
            **common,
            hook=f"You have not seen the {payoff}.",
            angle="A delayed-payoff dance loop with strong retention direction.",
            script=prompt,
            visual_prompt=prompt,
            seedance_prompt=prompt,
            duration_sec=14,
            on_screen_text=f"You have not seen the {payoff}",
            audio=Audio(
                name=audio_name,
                bpm=122,
                sound_recency="rising",
                is_rising_sound=True,
            ),
            cut_frequency=0.3,
            elements=[
                "peak_motion_frame1",
                "you_hook",
                "high_contrast_bg",
                "delayed_resolution",
                "beat_sync",
                "seamless_loop",
            ],
        )
        return concept, None

    prompt = (
        f"At 0:00, frame 1 opens mid-jump with peak {style} dance motion. A "
        f"single centered dancer performs continuous choreography against a "
        f"solid {background} high-contrast background. Bold on-screen text "
        f"'{question}' appears immediately and remains for the full duration. "
        f"You think you know the ending, but the {payoff} payoff is saved for "
        "last. Every movement peak lands on a beat hit. Use a reflective "
        "metallic outfit, crisp 4K detail, anatomically stable limbs, and a "
        "consistent face. Change camera or lighting every 2 seconds. End by "
        "returning to the opening pose for a seamless loop with no dead zones."
    )
    hashtags = [
        "#aidance",
        "#aiart",
        "#aianimation",
        "#shorts",
        "#viral",
        "#fyp",
        "#trending",
        f"#{audio_name.replace(' ', '')}",
    ]
    title = f"{question} {style}"
    description = f"Comment your rating and drop the next song for this {style} loop."
    concept = ContentConcept(
        **common,
        hook=question,
        angle="A fully specified, delayed-payoff, publishing-ready dance loop.",
        script=prompt,
        visual_prompt=prompt,
        seedance_prompt=prompt,
        duration_sec=14,
        on_screen_text=f"You: {question}",
        comment_bait_question=question,
        title=title,
        description=description,
        audio=Audio(
            name=audio_name,
            bpm=124,
            sound_recency="rising",
            is_rising_sound=True,
        ),
        cut_frequency=0.5,
        execution=ExecutionMetadata(hashtag_set=hashtags),
        elements=[
            "peak_motion_frame1",
            "you_hook",
            "high_contrast_bg",
            "delayed_resolution",
            "conflict_phrasing",
            "fast_cuts",
            "reflective_outfit",
            "artifact_control",
            "beat_sync",
            "seamless_loop",
            "comment_bait_question",
            "hashtag_mix",
        ],
    )
    return concept, {
        "metadata": {
            "title": title,
            "description": description,
            "hashtags": hashtags,
        }
    }


def generate(
    seed: int = SEED,
    m: int = 80,
    k: int = 5,
) -> list[GenerationRecord]:
    rng = random.Random(seed)
    records: list[GenerationRecord] = []
    for generation in range(1, m + 1):
        candidates: list[Candidate] = []
        for variant in range(k):
            quality = (generation + variant) % 5
            concept, evidence = _concept(
                generation,
                variant,
                quality,
                rng,
            )
            score = score_concept(concept, evidence=evidence)
            outcome = synthetic_week_one_outcome(concept, score)
            candidates.append(
                Candidate(
                    variant_id=f"g{generation:03d}_c{variant}",
                    concept=concept,
                    score=score,
                    outcome=outcome,
                )
            )

        winner = max(
            candidates,
            key=lambda candidate: candidate.score.total_score or 0.0,
        )
        winner.selected = True
        for candidate in candidates:
            candidate.exploration = candidate is not winner

        records.append(
            GenerationRecord(
                id=f"gr_prompt_{generation:03d}",
                generation_number=generation,
                created_at=BASE_DT + timedelta(hours=generation),
                trend_context_id=winner.concept.trend_context_id,
                concept=winner.concept,
                score=winner.score,
                harness_state_version_before=f"v{generation - 1}",
                harness_state_version_after=f"v{generation}",
                outcome=winner.outcome,
                candidates=candidates,
                rubric_version=RUBRIC_VERSION,
                selected=True,
            )
        )
    return records
