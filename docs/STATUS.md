# Status

Live build state. Update this when the build state changes (AGENTS.md
Definition of Done).

_Last updated: 2026-06-07. Vertical: AI YouTube Shorts dance (ACOE-YT-SHORTS-v2.0)._

## Component status

| Component | File(s) | Status |
|-----------|---------|--------|
| Shared contracts | `harness/contracts.py` (canonical) · `src/contracts/index.ts` (mirror) | ✅ Done — incl. ACOE outputs + Stage-1 ground-truth (typed `Outcome`, `Candidate` batch, `RewardScore.score_type`/`evidence_coverage`; `actual_engagement` deprecated → `outcome`, D17); round-trips + typechecks |
| Evaluation policy | `data/policies/ACOE-YT-SHORTS-v2.0.json` (v1 retained) | ✅ Done — v2 rebalanced (audio↑, engagement↓) + HQ-05/RL-04/RL-05/VP-04/AA-03 + AF-05; validated (DECISIONS D15) |
| Stub data | `data/stubs/*.json` via `scripts/dump_stubs.py` | ✅ Done — dance-vertical, ACOE-scored, generated + validated |
| Documentation pack | `README.md`, `AGENTS.md`, `docs/*` | ✅ Done — re-themed to the short-form pivot |
| Harness loop (Workstream A) | `loop_core/` (PR #1) | 🟦 Landed — lean internal model + meta-agent with v2 lever bias |
| Loop → canonical bridge | `harness/bridge.py` | ✅ Done — translates lean → canonical GenerationRecord[] (DECISIONS D16); writes `data/generations.latest.json`; provides `make_acoe_critic()` adapter; now also carries `score_type`/`evidence_coverage` + `outcome`/`candidates` (D17); validates against canonical contracts |
| Inner-loop policy | `loop_core/loop.py` `update_policy()` | ✅ Done — critic signal (suggested_policy_updates preferred), auto-fail shield, moving-mean baseline, low eta (0.4), exploration floor |
| Meta-agent v2 levers | `loop_core/meta_agent.py` | ✅ Done — 6 v2 candidates (you_hook_opening, curiosity_gap_payoff, conflict_phrasing, visual_cut_rhythm, rising_audio_early, polarizing_comment_bait); v2-biased `_SYS` prompt; meaningful `_V2_PROMPT_SNIPPETS` |
| HarnessState + meta-agent (canonical) | `harness/state.py`, `harness/meta.py` | ⬜ Not started |
| Reward critic (ACOE) | `harness/critic.py` · `tests/test_critic.py` | ✅ Landed (PR #2; v2 rubric) — applies ACOE-YT-SHORTS-v2.0 → total_score/tier/category_breakdown + learning signal; emits `score_type`/`evidence_coverage` (D17); offline preflight + optional LLM judge |
| Content generator + scout | `harness/generator.py`, `harness/scout.py`, `harness/seedance.py` | ⬜ Not started |
| Weave tracing | `harness/weave_trace.py` | ⬜ Not started |
| Dashboard | `src/ui/` | ✅ Done — ACOE v2 control room (0–100, tiers, 6 categories, auto-fail badges, critic-learning panel); data seam reads `VITE_GENERATIONS_URL` with synthetic fallback (DECISIONS D15). Stage-1 UI panels (outcome / candidates batch / provenance badges) pending Eng-1 producers. |

## Next up — the critical path to a "show the climb" demo

The loop runs end-to-end (real ACOE critic → `data/generations.latest.json`) but
**plateaus in seed_jail** because the stub generator emits 8s / no-on-screen-text
concepts (AF-02/AF-03). Per-engineer TO-DOs are in **`docs/TODO.md`**; the critical path:

1. **`harness/generator.py`** (Eng 3) — a real dance-Short `ContentConcept` that escapes the auto-fails and scores ≥ growing. **This is the bottleneck** — without it the loop can't climb.
2. **`harness/scout.py`** (Eng 3) — live `TrendContext` + a rising approved-pool track (Tavily).
3. **Candidate-batch capture** (Eng 1) — ~5-line `on_generation` extension → `GenerationRecord.candidates` (the contrastive signal).
4. **Wire `VITE_GENERATIONS_URL`** (Eng 4) — point the dashboard at the real bridge output (1-line; today it falls back to synthetic).
5. **Stage 2 (ground truth):** outcome ingestion (render→post→metrics → `Outcome`, Eng 1/3) + real-data calibration & the LLM judge (Eng 2).
6. `harness/weave_trace.py` — `weave.init` + `@weave.op` wrappers (observability; optional for the demo).

## Known placeholders

- `pnpm dev` points at `pnpm dev:ui`; the Python generation loop writes `data/generations.latest.json`. `src/ui/lib/data.ts` defaults to the synthetic arc and reads real output when `VITE_GENERATIONS_URL` is set (falling back to synthetic on absence/error).
- The loop's stub generator produces generic concepts that score low against the v2 dance rubric (seed_jail); the real `harness/generator.py` is needed to climb out.
- The legacy 8 `RewardScore.dimensions` / `RewardDimensions` type were **removed** (DECISIONS.md D14) — the dashboard, critic, and stubs use ACOE `category_breakdown`/tiers and the scalar `weighted_total`; `legacyDims()` is gone from `src/ui/lib/synthetic.ts`.
- **ACOE v2** is the active rubric (DECISIONS.md D15): audio↑ / engagement↓ + 5 new criteria + AF-05 + `ExecutionMetadata`. The dashboard is migrated to v2 — `CATEGORY_MAX` rebalanced (audio 15, engagement 10), the synthetic arc re-themed, and hashtags read from `execution`.
- `docs/WEAVE_TRACING.md` trace links are empty until the first traced runs.
- `loop_core/` (Eng 1) runs against its own lean internal contracts; the bridge adapter (`harness/bridge.py`, DECISIONS D16) maps its output to canonical `GenerationRecord[]` → `data/generations.latest.json`.
- **Stage-1 ground-truth contracts landed (backend-additive, DECISIONS D17):** typed `Outcome`, the `Candidate` contrastive batch, and `RewardScore.score_type`/`evidence_coverage` are in `harness/contracts.py` + the TS mirror; the critic emits provenance and the bridge passes it through. `actual_engagement` is deprecated in favor of `outcome`. The **synthetic-data + calibration seed also landed** — `scripts/synth_outcomes.py` (deterministic `Outcome`s from a hidden model ≠ ACOE weights), `scripts/calibrate.py` (pure-Python OLS), `tests/test_calibrate.py`: fitted weights recover the latent ranking (Spearman 0.76 vs a 0.53 ACOE-echo baseline) and beat raw ACOE on a held-out grouped split — the Stage-2 seed demonstrating *proxy ≠ truth*. (`data/synthetic/` is gitignored, regenerated on demand.)
- **Real outcome producers pending** (specced in `docs/LOOP_CORE_BRIDGE.md` "Producers (pending)"): (1) Eng-1 loop candidate-capture (accumulate the K `(concept, reward)` pairs/generation → `GenerationRecord.candidates` via the `on_generation` hook, ~5 lines additive); (2) outcome ingestion (render → post → fetch real metrics → `Outcome`). Until then `outcome.source` stays `stub`/`synthetic` and live `candidates`/`outcome` are unpopulated.
