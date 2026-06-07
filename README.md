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

- **Canonical data contracts** as Pydantic (`harness/contracts.py`), mirrored in TypeScript (`src/contracts/index.ts`) for the dashboard, with stubs generated from the models. The schema is a *superset* that serves both the Python loop and the dashboard without breaking either (DECISIONS.md D8).
- **A control-room dashboard** (Vite + React) that renders the generation arc: score curve, element-weight shift, generation history, and living memory.
- **Short-form-video-ready contracts** — examples use an AI-founder narrative (matching the dashboard), while the schema also carries Seedance/Tavily fields for the TikTok direction (DECISIONS.md D9–D10).
- **The full harness design** as docs that double as coordination state for humans and coding agents (see `docs/`).

## The build (tracked in `docs/STATUS.md`)

- Multi-agent generation loop (Python)
- Reward critic
- Living-memory rows + harness mutation
- Weave tracing
- Dashboard wired to real `GenerationRecord[]`

## Quickstart

```bash
# Contracts + stubs (Python backend)
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/dump_stubs.py     # generate + validate data/stubs/

# Dashboard (TypeScript UI)
pnpm install
pnpm dev:ui                                 # the control-room dashboard

# Checks
pnpm typecheck && pnpm typecheck:ui         # contracts mirror + UI
```

## Stack

Polyglot (DECISIONS.md D7): **Python** backend (Pydantic contracts + loop) and
a **TypeScript** dashboard (Vite + React 19 + Tailwind v4 + Motion). Sponsors /
tools: **W&B Weave** (tracing), **Tavily** (trends), **Seedance** (video),
**Anthropic** (generation + critic).

## Docs

Start with `docs/PROJECT_BRIEF.md`. Coding agents start with `AGENTS.md`. Each
decision has exactly one owner file — see the ownership table in `AGENTS.md`.

| For humans | For coding agents |
|------------|-------------------|
| `docs/PROJECT_BRIEF.md` | `AGENTS.md` |
| `docs/ARCHITECTURE.md` | `docs/DATA_CONTRACTS.md` |
| `docs/DEMO_SCRIPT.md` | `docs/HARNESS_LOOP.md` |
| `docs/WEAVE_TRACING.md` | `docs/JUDGE_RUBRIC.md` |
| `DESIGN.md` · `PRODUCT.md` (dashboard) | `docs/AGENT_ROLES.md` · `docs/HARNESS_MEMORY.md` · `docs/STATUS.md` · `docs/DECISIONS.md` |

`docs/DECISIONS.md` is the ADR log (D1–D10) — read it to see why the stack,
contracts, and merge landed where they did.

## Sponsor Usage

We use **W&B Weave** to trace every generation, reward score, harness rewrite,
and memory update. See `docs/WEAVE_TRACING.md`.

## Team

| Eng | Area | Workstream |
|-----|------|------------|
| Eng 1 | Loop Core + Meta-agent | A |
| Eng 2 | Reward Critic | B |
| Eng 3 | Content Pipeline (scout · generator · renderer) | C |
| Eng 4 | Frontend / Demo | D |
