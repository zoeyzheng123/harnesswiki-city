# 3-Minute Demo Script

Owner of *what matters for the hackathon*. Write and rehearse against this, not
the codebase. Owned by Eng 4 (Demo Narrator).

## 0:00–0:20 — Problem

AI content tools generate assets, but they don't learn the creative operating
system behind them. Nothing gets smarter between posts.

## 0:20–0:50 — Show the City

This building is our content-agent harness. Each district is a role: Trend
Scout, Content Generator, Reward Critic, Meta-Agent (see `docs/AGENT_ROLES.md`).

## 0:50–1:30 — Run the Loop

Trend in. A concept is generated. The Reward Critic scores it on the rubric. A
GenerationRecord is written. (One pass of `docs/HARNESS_LOOP.md`.)

## 1:30–2:10 — Improvement

The Meta-Agent updates element weights and the script prompt. Later generations
score higher — show the climbing `weighted_total` / `predicted_win_prob` curve
and the shifting element weights on the dashboard.

## 2:10–2:35 — Weave

Open the pre-saved trace links from `docs/WEAVE_TRACING.md`: the generation loop
and the reward critic, with `harness_diff` and `memory_lesson` logged.

## 2:35–3:00 — Close

HarnessWiki City turns trend signals and reward traces into living memory for
self-improving content teams. Not one asset — a creative operating system that
improves every generation.
