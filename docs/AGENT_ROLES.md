# Agent Roles

Owner of *agent responsibilities*. Makes the multi-agent orchestration legible.
Owners map to the team in the README (workstreams A–D); the runtime roles align
with the dashboard districts (`scout` / `generator` / `critic` / `meta`).

## Trend Scout

Produces TrendContext.

- **Inputs:** trending dances + the approved trending-audio pool (`data/policies/ACOE-YT-SHORTS-v2.0.json` → `audio_alignment`); stub data today, Tavily later.
- **Outputs:** `TrendContext` (with a rising track in `audio`).
- **Allowed tools:** Tavily search; file read (MVP).
- **Failure modes:** stale trend; picks a non-pool or controversy-adjacent track (AF-04 / `avoid` list).
- **Owner:** Eng 3 (C — Content Pipeline)

## Content Generators (the squad)

A **parallel squad of 4 specialized agents** (not one generator) — each emits a complete,
auto-fail-safe dance-Short `ContentConcept` specialized to a v2 lever: `hook_architect`,
`retention_engineer`, `audio_anchor`, `visual_stylist`. Full spec: **`docs/INNER_LOOP_SPEC.md`**.

> **STATUS: specced, not built** — the loop still runs a single `stub_generator`; no `harness/generators/` package exists yet (Eng 3).

- **Inputs:** `TrendContext`, `HarnessState` (`script_prompt`, `element_weights`); each runs `generator(trend, harness, policy) -> ContentConcept`.
- **Outputs:** 4 `ContentConcept`s per generation (tagged `created_by`), scored by the critic → winner + the contrastive batch.
- **Allowed tools:** OpenAI (`OPENAI_API_KEY`, `OPENAI_MODEL`) + a deterministic template fallback when no key.
- **Failure modes:** static frame 1 (AF-01); missing on-screen text (AF-02); off-pool audio (AF-04); a concept that's complete but not specialized.
- **Owner:** Eng 3 (C)

## Reward Critic

Produces RewardScore by applying **ACOE-YT-SHORTS-v2.0**. **Owns the rubric** (referenced elsewhere only by `rubric_version`).

- **Inputs:** `ContentConcept`, the policy (`docs/JUDGE_RUBRIC.md` / the JSON)
- **Outputs:** `RewardScore` (`total_score`, `distribution_tier`, `category_breakdown`, `auto_fails_triggered`, `lowest_scoring_category`, `recommended_fix_priority`)
- **Allowed tools:** Anthropic as judge.
- **Failure modes:** misses an auto-fail; inconsistent category scoring.
- **Owner:** Eng 2 (B — Reward Critic)
- **Implemented:** `harness/critic.py` (PR #2) — three modes (prompt preflight / rendered video / publishing package), a projected-vs-verified `score_type`, an offline deterministic preflight plus an optional LLM `judge`, and a confidence-gated learning signal (`winning_elements`/`weak_elements`/`suggested_policy_updates`) the Loop Core applies.

## Loop Core (inner loop)

Adjusts element weights from the RewardScore (toward the lowest category) and writes the GenerationRecord.

- **Inputs:** `RewardScore`, current weights
- **Outputs:** updated `element_weights`; `GenerationRecord`
- **Failure modes:** thrashes weights; ignores `lowest_scoring_category`.
- **Owner:** Eng 1 (A — Loop Core)

## Meta-Agent / Harness Rewriter (outer loop)

Reads GenerationRecords and rewrites HarnessState once per generation.

- **Inputs:** recent `GenerationRecord[]`, current `HarnessState`
- **Outputs:** `HarnessDiff` (+ `parent_harness_id`, `diff_summary` lineage)
- **Allowed tools:** Anthropic; read access to memory.
- **Failure modes:** overfits to one video; introduces an auto-fail.
- **Owner:** Eng 1 (A)

## Renderer

Renders the selected concept to a dance video (stretch / optional).

- **Inputs:** selected `ContentConcept` (`seedance_prompt`, `audio`)
- **Outputs:** a rendered Short; later `post_url` + `actual_engagement`
- **Allowed tools:** Seedance.
- **Owner:** Eng 3 (C)

## Wiki Curator

Turns generation history into living-memory lessons.

- **Inputs:** `GenerationRecord`, `RewardScore`, `HarnessDiff`
- **Outputs:** `Lesson` (see `docs/HARNESS_MEMORY.md`)
- **Allowed tools:** Anthropic; memory write.
- **Failure modes:** vague lessons with no rule or evidence.
- **Owner:** Eng 1 (A)

## Demo Narrator

Not a runtime agent. Explains the loop to judges.

- **Inputs:** the running dashboard, Weave traces, `docs/DEMO_SCRIPT.md`
- **Outputs:** the 3-minute pitch.
- **Owner:** Eng 4 (D — Frontend / Demo)
