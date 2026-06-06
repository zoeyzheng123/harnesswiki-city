# AGENTS.md

Instructions for coding agents (Claude Code, Codex, Cursor) and any teammate
driving one. Read this before changing code. It exists to stop agents from
guessing the architecture and drifting from the shared contracts.

## Project Goal

Build HarnessWiki City: a hackathon MVP showing a self-improving multi-agent
content generation harness.

The critical demo loop is:

```
TrendContext → ContentConcept → RewardScore → GenerationRecord → HarnessState update → next generation improves
```

## Non-Negotiables

1. **Do not change a shared data contract without updating `docs/DATA_CONTRACTS.md` in the same change.** The contracts live in `src/contracts/index.ts` (canonical, type-checked); `docs/DATA_CONTRACTS.md` explains and mirrors them. They must never disagree.
2. **All generation-loop functions must be Weave-traced** per `docs/WEAVE_TRACING.md`.
3. **Keep the MVP path working at all times.** `pnpm typecheck` must stay green.
4. **Prefer simple files / SQLite over infrastructure** unless something is already integrated. Stub data lives in `data/stubs/`.
5. **Do not build extra features until the demo loop works.** See the non-goals in `docs/PROJECT_BRIEF.md`.

## One Source of Truth (ownership table)

Do not let one decision live in five files. Each row below is the *only* place
that decision is authored; everything else references it.

| Decision | Owner file |
|----------|------------|
| Schemas / data shapes | `src/contracts/index.ts` (mirrored in `docs/DATA_CONTRACTS.md`) |
| Runtime loop behavior | `docs/HARNESS_LOOP.md` |
| Scoring / rubric | `docs/JUDGE_RUBRIC.md` |
| Tracing / instrumentation | `docs/WEAVE_TRACING.md` |
| Agent responsibilities | `docs/AGENT_ROLES.md` |
| Living-memory rules | `docs/HARNESS_MEMORY.md` |
| What matters for judging | `docs/DEMO_SCRIPT.md` |

## Key Files

**Exist now**

- `src/contracts/index.ts` — canonical shared schemas
- `src/contracts/_stub-check.ts` — compile-time validation of `data/stubs/`
- `data/stubs/` — TrendContext, initial HarnessState, sample GenerationRecord
- `docs/DATA_CONTRACTS.md` — schemas, explained
- `docs/HARNESS_LOOP.md` — generation loop behavior
- `docs/WEAVE_TRACING.md` — tracing requirements
- `docs/JUDGE_RUBRIC.md` — scoring rubric
- `docs/DEMO_SCRIPT.md` — final judging narrative

**Planned (build here; do not invent new locations)**

- `src/harness/loop.ts` — core loop (`runLoop`)
- `src/harness/state.ts` — HarnessState read/write
- `src/harness/metaAgent.ts` — `rewriteHarness` (produces HarnessDiff)
- `src/reward/score.ts` — `scoreConcept` (RewardScore)
- `src/reward/rubric.ts` — rubric weights
- `src/content/generateConcept.ts` — ContentConcept generator
- `src/content/trendScout.ts` — TrendContext loader
- `src/content/seedancePrompt.ts` — visual-prompt builder
- `src/memory/generationRecords.ts` — record read/write
- `src/memory/lessons.ts` — lesson distillation
- `src/weave/trace.ts` — Weave init + op wrappers
- `src/ui/` — dashboard

## Definition of Done

A change is done only if:

- `pnpm typecheck` passes
- The demo loop still runs (or, pre-implementation, the contracts + stubs still validate)
- The Weave trace still records the step (once tracing exists)
- Any changed contract is reflected in `docs/DATA_CONTRACTS.md`
- `docs/STATUS.md` is updated if the build state changed
