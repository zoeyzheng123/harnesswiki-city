# Project Brief

Source-of-truth product brief. Defines what we are building — and what we are
not.

## One-Liner

HarnessWiki City is a Weave-traced control room for a self-improving harness that
generates AI **YouTube Shorts dance videos** and climbs from Seed-Jail to Viral.

## Core Claim

Trend intelligence plus a concrete reward policy (ACOE-YT-SHORTS-v1.0) can improve
the content *harness* over generations — updating prompts, element weights, and
living memory so each generation scores higher and reaches a better distribution
tier, not just producing one-off videos.

## Golden Path

1. Scout the trend + a rising track from the approved audio pool (Tavily).
2. Generate a dance-Short ContentConcept (peak-motion hook, seamless loop, comment bait) from TrendContext + HarnessState.
3. Score it with the Reward Critic against **ACOE-YT-SHORTS-v1.0** → `total_score` (0–100), `distribution_tier`, `category_breakdown`, auto-fails.
4. Inner loop: nudge element weights from the score (toward the lowest category).
5. Store a GenerationRecord.
6. Outer loop: the Meta-Agent rewrites HarnessState; auto-fails force a regenerate.
7. Repeat; the dashboard shows the score climbing toward the **viral** tier.

The exact loop and the definition of "improved" live in `docs/HARNESS_LOOP.md`;
the rubric in `docs/JUDGE_RUBRIC.md`.

## Stack

Polyglot: Python backend (Pydantic contracts + loop), TypeScript dashboard
(Vite + React). Tools: Weave (tracing), Tavily (trends/audio), Seedance (dance
video), Anthropic (generation + critic). See `docs/ARCHITECTURE.md`.

## Explicit Non-Goals

- No actual auto-publishing to YouTube — `actual_engagement`/`post_url` stay empty until/unless a video is posted by a human.
- No real ad spend or bot engagement.
- No rendering every generation (render the selected concept at most).
- No complex city simulation.
- Redis is a stretch; JSON files are the storage for now.
- Music ships only from the platform's licensed library (the policy lists chart references, not audio files).

If a task isn't on the golden path and isn't required to demo it, it's out of
scope for this weekend.
