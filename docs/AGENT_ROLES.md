# Agent Roles

Owner of *agent responsibilities*. Makes the multi-agent orchestration legible
to humans and to coding agents. Owners map to the team in the README.

## Trend Scout

Produces TrendContext.

- **Inputs:** stub trend data (`data/stubs/trend-contexts.json`); later, a live feed.
- **Outputs:** `TrendContext`
- **Allowed tools:** file read (MVP); HTTP fetch (future).
- **Failure modes:** stale or off-audience trends; hallucinated signals not grounded in data.
- **Owner:** Eng 3 (Content Pipeline)

## Content Generator

Produces ContentConcept from TrendContext + HarnessState.

- **Inputs:** `TrendContext`, `HarnessState` (`script_prompt`, `element_weights`, `seedance_prompt_template`)
- **Outputs:** `ContentConcept`
- **Allowed tools:** LLM (Anthropic); the seedance prompt builder.
- **Failure modes:** ignores element weights; generic hook; drifts off the trend.
- **Owner:** Eng 3 (Content Pipeline)

## Reward Critic

Produces RewardScore.

- **Inputs:** `ContentConcept`, the rubric (`HarnessState.judge_rubric` + `docs/JUDGE_RUBRIC.md`)
- **Outputs:** `RewardScore`
- **Allowed tools:** LLM (Anthropic) as judge.
- **Failure modes:** inconsistent scoring run-to-run; rewards cringe; misses policy risk.
- **Owner:** Eng 2 (Reward Critic)

## Meta-Agent / Harness Rewriter

Reads GenerationRecords and proposes HarnessState changes.

- **Inputs:** recent `GenerationRecord[]`, current `HarnessState`
- **Outputs:** `HarnessDiff`
- **Allowed tools:** LLM (Anthropic); read access to memory.
- **Failure modes:** overfits to one generation; raises `policy_risk`; thrashes weights.
- **Owner:** Eng 1 (Loop Core)

## Wiki Curator

Turns generation history into living-memory lessons.

- **Inputs:** `GenerationRecord`, `RewardScore`, `HarnessDiff`
- **Outputs:** `Lesson` (see `docs/HARNESS_MEMORY.md`)
- **Allowed tools:** LLM (Anthropic); memory write.
- **Failure modes:** vague lessons with no rule or evidence; duplicates.
- **Owner:** Eng 1 (Loop Core)

## Demo Narrator

Not a runtime agent. Explains the loop to judges.

- **Inputs:** the running dashboard, Weave traces, `docs/DEMO_SCRIPT.md`
- **Outputs:** the 3-minute pitch.
- **Owner:** Eng 4 (Frontend / Demo)
