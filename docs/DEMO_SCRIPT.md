# 3-Minute Demo Script

Owner of *what matters for the hackathon*. Rehearse against this, not the
codebase. Owned by Eng 4 (Demo Narrator). The beats follow the dashboard's
built arc: climb → refusal → recovery → peak.

## 0:00–0:20 — Problem

AI content tools generate assets, but they don't learn the creative operating
system behind them. Nothing gets smarter between posts.

## 0:20–0:50 — Show the City

This control room is our content-agent harness. Each district is a role: Trend
Scout, Content Generator, Reward Critic, Meta-Agent (see `docs/AGENT_ROLES.md`).

## 0:50–1:30 — Run the Loop

Trend in. A concept is generated. The Reward Critic scores it on the rubric. A
GenerationRecord is written and the element weights nudge. Watch generations 1→2
climb on the hero curve. (One pass of `docs/HARNESS_LOOP.md`.)

## 1:30–2:10 — Improvement *and the refusal*

Generation 3 produces the highest-hook concept of the run — but it trips
`policy_flag` (an unverifiable claim about a named company), so the meta-agent
**rejects** the diff: the harness refuses to learn a risky win, and the version
holds. Generations 4→5 recover cleanly to the peak. The element weights and
`weighted_total` / win-probability curve tell the whole story.

## 2:10–2:35 — Weave

Open the pre-saved trace links from `docs/WEAVE_TRACING.md`: the generation loop
and the reward critic, with `harness_diff` and the living-memory `lesson` logged.

## 2:35–3:00 — Close

HarnessWiki City turns trend signals and reward traces into living memory for
self-improving content teams. Not one asset — a creative operating system that
improves every generation, and knows when *not* to.
