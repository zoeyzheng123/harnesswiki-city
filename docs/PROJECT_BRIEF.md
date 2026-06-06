# Project Brief

Source-of-truth product brief. Defines what we are building — and what we are
not.

## One-Liner

HarnessWiki City is a Weave-traced control room for self-improving content-agent
teams.

## Core Claim

Trend intelligence plus reward feedback can improve the content *harness* over
generations — by updating prompts, element weights, and living memory, not just
producing one-off assets.

## Golden Path

1. Scout/load TrendContext (Tavily).
2. Generate a ContentConcept (with the inner-loop element weights).
3. Score the concept with the Reward Critic.
4. Inner loop: nudge the element weights from the score.
5. Store a GenerationRecord.
6. Outer loop: the Meta-Agent rewrites HarnessState.
7. Repeat for N generations; the dashboard shows the score climbing and the weights shifting.

The exact loop and the definition of "improved" live in `docs/HARNESS_LOOP.md`.

## Stack

Polyglot: Python backend (Pydantic contracts + loop), TypeScript dashboard
(Vite + React). Tools: Weave (tracing), Tavily (trends), Seedance (video),
Anthropic (generation + critic). See `docs/ARCHITECTURE.md`.

## Theme

Examples use a founder-facing AI-content narrative (matching the dashboard). The
contracts also carry short-form-video fields (storyboard, Seedance prompt,
engagement) so the TikTok-style direction is ready when the real loop + Seedance
render land (DECISIONS.md D9).

## Explicit Non-Goals

- No full social-media scheduler.
- Posting is optional — `actual_engagement`/`post_url` stay empty until/unless a concept is posted.
- No rendering every generation (render the winner at most).
- No complex city simulation.
- No production-grade engagement predictor.
- Redis is a stretch; JSON files are the storage for now.

If a task isn't on the golden path and isn't required to demo it, it's out of
scope for this weekend.
