# Agent Roles

Owner of *agent responsibilities*. Makes the multi-agent orchestration legible
to humans and to coding agents. Owners map to the team in the README
(workstreams A–D); the runtime roles align with the dashboard districts
(`scout` / `generator` / `critic` / `meta`).

## Trend Scout

Produces TrendContext.

- **Inputs:** stub trend data (`data/stubs/trend-contexts.json`); later, Tavily.
- **Outputs:** `TrendContext`
- **Allowed tools:** Tavily search; file read (MVP).
- **Failure modes:** stale or off-audience trends; hallucinated signals.
- **Owner:** Eng 3 (C — Content Pipeline)

## Content Generator

Produces ContentConcept from TrendContext + HarnessState (and the inner-loop weights, snapshotted onto the concept).

- **Inputs:** `TrendContext`, `HarnessState` (`script_prompt`/`system_prompt`, `element_weights`, `seedance_prompt_template`)
- **Outputs:** `ContentConcept`
- **Allowed tools:** Anthropic; the seedance prompt builder.
- **Failure modes:** ignores element weights; generic hook; drifts off the trend.
- **Owner:** Eng 3 (C)

## Reward Critic

Produces RewardScore. **Owns the rubric** (referenced elsewhere only by `rubric_version`) — generation is kept separate from evaluation.

- **Inputs:** `ContentConcept`, the rubric (`docs/JUDGE_RUBRIC.md`,
  `rubric_version`), optional `TrendContext` / `HarnessState`, and prompt,
  rendered-video, or publishing evidence.
- **Outputs:** `RewardScore` (`dimensions`, `weighted_total`,
  `predicted_win_prob`/`pairwise_winprob`, `confidence`) plus optional
  element-level learning signals (`winning_elements`, `weak_elements`,
  `suggested_policy_updates`).
- **Allowed tools:** Anthropic as judge.
- **Failure modes:** inconsistent scoring; invents missing video evidence;
  rewards verbosity or engagement manipulation; misses policy risk; updates
  weights from prompt predictions rather than rendered outcomes.
- **Owner:** Eng 2 (B — Reward Critic)

## Loop Core (inner loop)

Adjusts element weights from the RewardScore and writes the GenerationRecord.

- **Inputs:** `RewardScore`, current weights
- **Outputs:** updated `element_weights`; `GenerationRecord`
- **Failure modes:** thrashes weights; overreacts to one score.
- **Owner:** Eng 1 (A — Loop Core)

## Meta-Agent / Harness Rewriter (outer loop)

Reads GenerationRecords and proposes HarnessState changes once per generation.

- **Inputs:** recent `GenerationRecord[]`, current `HarnessState`
- **Outputs:** `HarnessDiff` (+ `parent_harness_id`, `diff_summary` lineage)
- **Allowed tools:** Anthropic; read access to memory.
- **Failure modes:** overfits to one generation; raises `policy_risk`.
- **Owner:** Eng 1 (A)

## Renderer

Renders the selected concept to video (stretch / optional).

- **Inputs:** selected `ContentConcept` (`seedance_prompt`)
- **Outputs:** a rendered asset; later `post_url` + `actual_engagement`
- **Allowed tools:** Seedance.
- **Owner:** Eng 3 (C)

## Wiki Curator

Turns generation history into living-memory lessons.

- **Inputs:** `GenerationRecord`, `RewardScore`, `HarnessDiff`
- **Outputs:** `Lesson` (see `docs/HARNESS_MEMORY.md`)
- **Allowed tools:** Anthropic; memory write.
- **Failure modes:** vague lessons with no rule or evidence; duplicates.
- **Owner:** Eng 1 (A)

## Demo Narrator

Not a runtime agent. Explains the loop to judges.

- **Inputs:** the running dashboard, Weave traces, `docs/DEMO_SCRIPT.md`
- **Outputs:** the 3-minute pitch.
- **Owner:** Eng 4 (D — Frontend / Demo)
