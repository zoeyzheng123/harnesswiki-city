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

## Two languages

The repo is polyglot (DECISIONS.md D7):

- **Python backend** (`harness/`) — canonical contracts + the loop/critic/generator/meta-agent. Deps in `requirements.txt`.
- **TypeScript UI** (`src/ui/`) — the Vite/React dashboard. Deps in `package.json`. It consumes the contracts via the TS mirror `src/contracts/index.ts`.

## Non-Negotiables

1. **The canonical schema is `harness/contracts.py`.** Do not change a contract without updating, in the same change: the TS mirror `src/contracts/index.ts`, `docs/DATA_CONTRACTS.md`, and (re)running `python scripts/dump_stubs.py`. The three must never disagree.
2. **All generation-loop functions must be Weave-traced** per `docs/WEAVE_TRACING.md`.
3. **Keep the MVP path working at all times.** `pnpm typecheck`, `pnpm typecheck:ui`, and `python scripts/dump_stubs.py` must stay green.
4. **Prefer simple files / JSON over infrastructure** unless something is already integrated. Stub data lives in `data/stubs/` (generated).
5. **Do not build extra features until the demo loop works.** See the non-goals in `docs/PROJECT_BRIEF.md`.
6. **Don't break the dashboard.** The contract is a superset that keeps `src/ui` compiling (DECISIONS.md D8); additive-optional changes only unless coordinating with Eng 4.

## One Source of Truth (ownership table)

Do not let one decision live in five files. Each row below is the *only* place
that decision is authored; everything else references it.

| Decision | Owner file |
|----------|------------|
| Schemas / data shapes | `harness/contracts.py` (mirror `src/contracts/index.ts`; explained in `docs/DATA_CONTRACTS.md`) |
| Runtime loop behavior | `docs/HARNESS_LOOP.md` |
| Scoring / rubric | `docs/JUDGE_RUBRIC.md` |
| Tracing / instrumentation | `docs/WEAVE_TRACING.md` |
| Agent responsibilities | `docs/AGENT_ROLES.md` |
| Living-memory rules | `docs/HARNESS_MEMORY.md` |
| Dashboard stack + design | `DESIGN.md`, `PRODUCT.md` (Eng 4) |
| What matters for judging | `docs/DEMO_SCRIPT.md` |

## Key Files

**Exist now**

- `harness/contracts.py` — canonical shared schemas (Pydantic)
- `src/contracts/index.ts` — TS mirror for the dashboard
- `scripts/dump_stubs.py` — generates + round-trip-validates `data/stubs/`
- `data/stubs/` — generated TrendContext, initial HarnessState, sample GenerationRecord
- `docs/DATA_CONTRACTS.md` — schemas, explained
- `docs/HARNESS_LOOP.md` — generation loop behavior
- `docs/WEAVE_TRACING.md` — tracing requirements
- `docs/JUDGE_RUBRIC.md` — scoring rubric
- `docs/DEMO_SCRIPT.md` — final judging narrative
- `src/ui/` — the dashboard (Eng 4; `DESIGN.md`/`PRODUCT.md`)

**Planned (build here; do not invent new locations)**

- `harness/loop.py` — core loop (`run_loop`)
- `harness/state.py` — HarnessState read/write
- `harness/meta.py` — meta-agent (produces `HarnessDiff`)
- `harness/critic.py` — `score_concept` (RewardScore)
- `harness/generator.py` — `generate_concept` (ContentConcept)
- `harness/scout.py` — `trend_scout` (TrendContext via Tavily)
- `harness/seedance.py` — visual-prompt builder / render
- `harness/weave_trace.py` — Weave init + op wrappers

## Definition of Done

A change is done only if:

- `pnpm typecheck` passes (mirror + generated stubs)
- `pnpm typecheck:ui` passes (dashboard still compiles)
- `python scripts/dump_stubs.py` round-trips clean
- The demo loop still runs (or, pre-implementation, the contracts + stubs still validate)
- The Weave trace still records the step (once tracing exists)
- Any changed contract is reflected in `harness/contracts.py`, `src/contracts/index.ts`, and `docs/DATA_CONTRACTS.md`
- `docs/STATUS.md` is updated if the build state changed
