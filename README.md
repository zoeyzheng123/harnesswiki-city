# HarnessWiki City

HarnessWiki City is a self-improving content-ops harness for **AI YouTube Shorts
dance videos**. It turns a trend into a dance-Short concept, scores it with a
reward critic (ACOE-YT-SHORTS-v2.0), records every generation in Weave, and
updates a living harness memory so future generations climb from Seed-Jail to
Viral.

## Demo Loop

```
TrendContext → ContentConcept → RewardScore (ACOE) → GenerationRecord → HarnessState update → repeat
```

## Why It Matters

Most AI content tools generate assets. HarnessWiki City learns the creative
*operating system* behind a viral video — the prompts, element weights, and rules
that get better every generation.

## What's in this repo

- **Canonical data contracts** as Pydantic (`harness/contracts.py`), mirrored in TypeScript (`src/contracts/index.ts`) for the dashboard, with stubs generated from the models.
- **The evaluation policy** — `data/policies/ACOE-YT-SHORTS-v2.0.json` (v1.0 retained for history): a 100-point rubric (6 weighted categories, viral/growing/seed-jail tiers, auto-fails) that the Reward Critic scores against.
- **A control-room dashboard** (Vite + React) that renders the generation arc; migrating to ACOE's 0–100 + tiers (see `docs/DASHBOARD_MIGRATION.md`).
- **The full harness design** as docs that double as coordination state for humans and coding agents (see `docs/`).

## The build (tracked in `docs/STATUS.md`)

- Multi-agent generation loop (Python)
- Reward critic applying ACOE-YT-SHORTS-v2.0
- Living-memory rows + harness mutation
- Weave tracing
- Dashboard migrated to ACOE scoring + wired to real `GenerationRecord[]`

## Quickstart

```bash
# Contracts + policy + stubs (Python backend)
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/dump_stubs.py     # validate policy + generate data/stubs/

# Dashboard (TypeScript UI)
pnpm install
pnpm dev:ui                                 # the control-room dashboard

# Checks
pnpm typecheck && pnpm typecheck:ui         # contracts mirror + UI
```

## Stack

Polyglot (DECISIONS.md D7): **Python** backend (Pydantic contracts + loop) and a
**TypeScript** dashboard (Vite + React 19 + Tailwind v4 + Motion). Tools: **W&B
Weave** (tracing), **Tavily** (trends + audio), **Seedance** (dance video),
**Anthropic** (generation + critic).

## Docs

Start with `docs/PROJECT_BRIEF.md`. Coding agents start with `AGENTS.md`. Each
decision has exactly one owner file — see the ownership table in `AGENTS.md`.

| For humans | For coding agents |
|------------|-------------------|
| `docs/PROJECT_BRIEF.md` | `AGENTS.md` |
| `docs/ARCHITECTURE.md` | `docs/DATA_CONTRACTS.md` |
| `docs/DEMO_SCRIPT.md` | `docs/HARNESS_LOOP.md` |
| `docs/WEAVE_TRACING.md` | `docs/JUDGE_RUBRIC.md` (ACOE) |
| `DESIGN.md` · `PRODUCT.md` (dashboard) | `docs/AGENT_ROLES.md` · `docs/HARNESS_MEMORY.md` · `docs/STATUS.md` · `docs/DECISIONS.md` · `docs/DASHBOARD_MIGRATION.md` |

`docs/DECISIONS.md` is the ADR log (D1–D18) — read it to see why the stack,
contracts, merge, and short-form pivot landed where they did.

## Sponsor Usage

We use **W&B Weave** to trace every generation, reward score, harness rewrite,
and memory update. See `docs/WEAVE_TRACING.md`.

## Team

| Eng | Area | Workstream |
|-----|------|------------|
| Eng 1 | Loop Core + Meta-agent | A |
| Eng 2 | Reward Critic (ACOE) | B |
| Eng 3 | Content Pipeline (scout · generator · renderer) | C |
| Eng 4 | Frontend / Demo | D |
