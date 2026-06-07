# Status

Live build state. Update this when the build state changes (AGENTS.md
Definition of Done).

_Last updated: 2026-06-07. Vertical: AI YouTube Shorts dance (ACOE-YT-SHORTS-v2.0)._

## Component status

| Component | File(s) | Status |
|-----------|---------|--------|
| Shared contracts | `harness/contracts.py` (canonical) · `src/contracts/index.ts` (mirror) | ✅ Done — incl. ACOE outputs; round-trips + typechecks |
| Evaluation policy | `data/policies/ACOE-YT-SHORTS-v2.0.json` (v1 retained) | ✅ Done — v2 rebalanced (audio↑, engagement↓) + HQ-05/RL-04/RL-05/VP-04/AA-03 + AF-05; validated (DECISIONS D15) |
| Stub data | `data/stubs/*.json` via `scripts/dump_stubs.py` | ✅ Done — dance-vertical, ACOE-scored, generated + validated |
| Documentation pack | `README.md`, `AGENTS.md`, `docs/*` | ✅ Done — re-themed to the short-form pivot |
| Harness loop (Workstream A) | `loop_core/` (PR #1) | 🟦 Landed — lean internal model + meta-agent with v2 lever bias |
| Loop → canonical bridge | `harness/bridge.py` | ✅ Done — translates lean → canonical GenerationRecord[] (DECISIONS D16); writes `data/generations.latest.json`; provides `make_acoe_critic()` adapter; validates against canonical contracts |
| Inner-loop policy | `loop_core/loop.py` `update_policy()` | ✅ Done — critic signal (suggested_policy_updates preferred), auto-fail shield, moving-mean baseline, low eta (0.4), exploration floor |
| Meta-agent v2 levers | `loop_core/meta_agent.py` | ✅ Done — 6 v2 candidates (you_hook_opening, curiosity_gap_payoff, conflict_phrasing, visual_cut_rhythm, rising_audio_early, polarizing_comment_bait); v2-biased `_SYS` prompt; meaningful `_V2_PROMPT_SNIPPETS` |
| HarnessState + meta-agent (canonical) | `harness/state.py`, `harness/meta.py` | ⬜ Not started |
| Reward critic (ACOE) | `harness/critic.py` · `tests/test_critic.py` | ✅ Landed (PR #2; v2 rubric) — applies ACOE-YT-SHORTS-v2.0 → total_score/tier/category_breakdown + learning signal; offline preflight + optional LLM judge |
| Content generator + scout | `harness/generator.py`, `harness/scout.py`, `harness/seedance.py` | ⬜ Not started |
| Weave tracing | `harness/weave_trace.py` | ⬜ Not started |
| Dashboard | `src/ui/` | 🟦 In progress — control-room UI built (founder-themed synthetic data). **Needs ACOE migration** (0–100 + tiers + 6 categories) per `docs/DASHBOARD_MIGRATION.md`. |

## Next up (to make the demo loop run)

1. `src/ui` ACOE migration (Eng 4) — `docs/DASHBOARD_MIGRATION.md`.
2. `harness/weave_trace.py` — `weave.init` + `@weave.op` wrappers.
3. `harness/scout.py` — TrendContext + a rising approved track (Tavily).
4. `harness/generator.py` — dance-Short ContentConcept (needed to get the ACOE critic out of seed_jail with the stub generator).
5. Point `src/ui/lib/data.ts` at the bridge output (`data/generations.latest.json`).

## Known placeholders

- `pnpm dev` points at `pnpm dev:ui`; the Python generation loop writes `data/generations.latest.json`. `src/ui/lib/data.ts` defaults to the synthetic arc and reads real output when `VITE_GENERATIONS_URL` is set (falling back to synthetic on absence/error).
- The loop's stub generator produces generic concepts that score low against the v2 dance rubric (seed_jail); the real `harness/generator.py` is needed to climb out.
- The legacy 8 `RewardScore.dimensions` / `RewardDimensions` type were **removed** (DECISIONS.md D14) — the dashboard, critic, and stubs use ACOE `category_breakdown`/tiers and the scalar `weighted_total`; `legacyDims()` is gone from `src/ui/lib/synthetic.ts`.
- **ACOE v2** is the active rubric (DECISIONS.md D15): audio↑ / engagement↓ + 5 new criteria + AF-05 + `ExecutionMetadata`. The dashboard is migrated to v2 — `CATEGORY_MAX` rebalanced (audio 15, engagement 10), the synthetic arc re-themed, and hashtags read from `execution`.
- `docs/WEAVE_TRACING.md` trace links are empty until the first traced runs.
- `loop_core/` (Eng 1) runs against its own lean internal contracts; the bridge adapter (`harness/bridge.py`, DECISIONS D16) maps its output to canonical `GenerationRecord[]` → `data/generations.latest.json`.
