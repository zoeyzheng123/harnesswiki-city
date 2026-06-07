# loop_core — Workstream A (Loop Core + Meta-agent)

Self-contained generation loop for HarnessWiki City. Runs offline with zero
credentials and emits the per-generation records the dashboard renders.

## What's here

| File | Role |
|------|------|
| `contracts.py` | Flat pydantic contracts this loop is built against (see "Contracts" below) |
| `loop.py` | The backbone. `run_generation_loop(n)` — INNER loop (Hedge element-weight policy) + OUTER loop (meta-agent rewrites `HarnessState`) |
| `meta_agent.py` | OUTER loop as Karpathy's LLM-Wiki cycle (ingest → compile → lint → emit). Real Nebius model, deterministic stub fallback so it always runs offline |
| `harness/`, `raw/`, `wiki/` | A committed sample run (5 generations) so reviewers see real output without running anything |

## Run it

```bash
python loop.py          # 5 generations → raw/gen_*.json, harness/gen_*.json   (no deps but pydantic)
python meta_agent.py    # same, but the meta-agent compiles wiki/lessons.md + elements.md
```

Sample run (stub critic), reproducible: scores climb `0.71 → 0.74 → 0.80 → 0.87`,
the element taxonomy grows `5 → 8`, and the wiki's lint line flags any regression.

## Two self-improvement loops

- **INNER** (`loop.py`, every concept): `update_policy()` nudges element weights from the `RewardScore` via Hedge / multiplicative weights. New elements added by the meta-agent enter with an exploration lead.
- **OUTER** (`meta_agent.py`, every generation): the meta-agent recompiles the living-memory wiki and rewrites `HarnessState` — expanding the action space (`element_taxonomy`), not the critic's rubric (generation stays separate from evaluation).

## Swap points for B and C

`run_generation_loop()` takes callables; B and C drop in real implementations
without touching the loop:

```
generator(trend, harness, policy) -> ContentConcept    (C)
critic(concept, harness)          -> RewardScore        (B)
meta(harness, records)            -> HarnessState        (A — use meta_agent.make_meta())
trend_source()                    -> TrendContext        (C)
```

The meta-agent uses Nebius when `NEBIUS_API_KEY` is set (OpenAI-compatible client;
`NEBIUS_BASE_URL`, `META_MODEL` env vars), else the deterministic stub.

## Contracts: relationship to the canonical `harness/contracts.py`

This module is built against its own **flat** contracts (`loop_core/contracts.py`),
kept deliberately separate from the repo's richer canonical `harness/contracts.py`
during the hackathon — the tested loop stays stable. The bridge to the dashboard's
nested, render-ready `GenerationRecord[]` is a **thin one-way adapter** (next PR):
wrap the loop's callables, capture each winning `ContentConcept` + `RewardScore`,
and emit the canonical shape into `data/generations.latest.json`. No refactor of
this loop required.
