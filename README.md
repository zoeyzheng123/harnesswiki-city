# HarnessWiki City

HarnessWiki City is a self-improving content-ops harness. It turns trend
context into content concepts, scores them with a reward critic, records every
generation in Weave, and updates a living harness memory so future generations
improve.

## Demo Loop

```
TrendContext → ContentConcept → RewardScore → GenerationRecord → HarnessState update → repeat
```

## Why It Matters

Most AI content tools generate assets. HarnessWiki City learns the creative
*operating system* behind the assets — the prompts, element weights, and rules
that get better every generation.

## What's in this repo

- **Shared data contracts** as real, type-checked TypeScript (`src/contracts/index.ts`) with validated stubs in `data/stubs/`.
- **The full harness design** as docs that double as coordination state for humans and coding agents (see `docs/`).

## The build (tracked in `docs/STATUS.md`)

- Multi-agent generation loop
- Reward critic
- Living-memory rows + harness mutation
- Weave tracing
- Dashboard: score curve, element weights, generation history

## Quickstart

```bash
pnpm install
pnpm typecheck   # validates the shared contracts + stubs — works today
pnpm dev         # placeholder until the loop + dashboard land (see docs/STATUS.md)
```

## Docs

Start with `docs/PROJECT_BRIEF.md`. Coding agents start with `AGENTS.md`. Each
decision has exactly one owner file — see the ownership table in `AGENTS.md`.

| For humans | For coding agents |
|------------|-------------------|
| `docs/PROJECT_BRIEF.md` | `AGENTS.md` |
| `docs/ARCHITECTURE.md` | `docs/DATA_CONTRACTS.md` |
| `docs/DEMO_SCRIPT.md` | `docs/HARNESS_LOOP.md` |
| `docs/WEAVE_TRACING.md` | `docs/JUDGE_RUBRIC.md` |
| | `docs/AGENT_ROLES.md` · `docs/HARNESS_MEMORY.md` · `docs/STATUS.md` |

## Sponsor Usage

We use **W&B Weave** to trace every generation, reward score, harness rewrite,
and memory update. See `docs/WEAVE_TRACING.md`.

## Team

| Eng | Area |
|-----|------|
| Eng 1 | Loop Core |
| Eng 2 | Reward Critic |
| Eng 3 | Content Pipeline |
| Eng 4 | Frontend / Demo |
