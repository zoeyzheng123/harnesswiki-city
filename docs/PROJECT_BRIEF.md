# Project Brief

Source-of-truth product brief. Defines what we are building — and what we are
not.

## One-Liner

HarnessWiki City is a Weave-traced city dashboard for self-improving
content-agent teams.

## Core Claim

Trend intelligence plus reward feedback can improve the content *harness* over
generations — by updating prompts, element weights, and living memory, not just
producing one-off assets.

## Golden Path

1. Load TrendContext.
2. Generate ContentConcept.
3. Score the concept with the Reward Critic.
4. Store a GenerationRecord.
5. The Meta-Agent rewrites HarnessState.
6. Repeat for N generations.
7. The dashboard shows the predicted score climbing and the element weights shifting.

The exact loop and the definition of "improved" live in `docs/HARNESS_LOOP.md`.

## Explicit Non-Goals

- No full social-media scheduler.
- No real TikTok API dependency.
- No rendering every generation (render the winner at most).
- No complex city simulation.
- No production-grade engagement predictor.

If a task isn't on the golden path and isn't required to demo it, it's out of
scope for this weekend.
