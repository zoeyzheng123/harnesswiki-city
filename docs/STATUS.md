# Status

Live build state. Update this when the build state changes (AGENTS.md
Definition of Done).

_Last updated: 2026-06-06. Vertical: AI YouTube Shorts dance (ACOE-YT-SHORTS-v1.0)._

## Component status

| Component | File(s) | Status |
|-----------|---------|--------|
| Shared contracts | `harness/contracts.py` (canonical) · `src/contracts/index.ts` (mirror) | ✅ Done — incl. ACOE outputs; round-trips + typechecks |
| Evaluation policy | `data/policies/ACOE-YT-SHORTS-v1.0.json` | ✅ Done — validated (weights sum 100, tiers, auto-fails) |
| Stub data | `data/stubs/*.json` via `scripts/dump_stubs.py` | ✅ Done — dance-vertical, ACOE-scored, generated + validated |
| Documentation pack | `README.md`, `AGENTS.md`, `docs/*` | ✅ Done — re-themed to the short-form pivot |
| Harness loop (Workstream A) | `loop_core/` (PR #1) | 🟦 Landed — lean internal model + meta-agent; needs the canonical bridge (`docs/LOOP_CORE_BRIDGE.md`) |
| Loop → canonical bridge | `harness/bridge.py` (planned) | ⬜ Not started — spec in `docs/LOOP_CORE_BRIDGE.md` (Eng 1) |
| HarnessState + meta-agent | `harness/state.py`, `harness/meta.py` | ⬜ Not started |
| Reward critic (ACOE) | `harness/critic.py` · `tests/test_critic.py` | ✅ Landed (PR #2) — applies ACOE; maps to the 8 dims + fills the structured outputs + learning signal; offline preflight + optional LLM judge |
| Content generator + scout | `harness/generator.py`, `harness/scout.py`, `harness/seedance.py` | ⬜ Not started |
| Weave tracing | `harness/weave_trace.py` | ⬜ Not started |
| Dashboard | `src/ui/` | 🟦 In progress — control-room UI built (founder-themed synthetic data). **Needs ACOE migration** (0–100 + tiers + 6 categories) per `docs/DASHBOARD_MIGRATION.md`. |

## Next up (to make the demo loop run)

1. `src/ui` ACOE migration (Eng 4) — `docs/DASHBOARD_MIGRATION.md`.
2. `harness/weave_trace.py` — `weave.init` + `@weave.op` wrappers.
3. `harness/scout.py` — TrendContext + a rising approved track (Tavily).
4. `harness/generator.py` — dance-Short ContentConcept.
5. `harness/critic.py` — apply ACOE → RewardScore (`total_score`/tier/`category_breakdown`/auto-fails).
6. `harness/{state,meta,loop}.py` — wire the loop; point `src/ui/lib/data.ts` at its `generation-records` output.

## Known placeholders

- `pnpm dev` points at `pnpm dev:ui`; the Python generation loop is not implemented.
- The 8 `RewardScore.dimensions` are **demoted to optional + deprecated** (DECISIONS.md D14) — the dashboard migrated to ACOE `category_breakdown`/tiers; the critic and stubs no longer emit them. Follow-up (Eng 4): drop `legacyDims()` from `src/ui/lib/synthetic.ts`. Full `RewardDimensions` removal is post-demo.
- `docs/WEAVE_TRACING.md` trace links are empty until the first traced runs.
- `loop_core/` (Eng 1) runs against its own lean internal contracts; the canonical bridge adapter (`docs/LOOP_CORE_BRIDGE.md`) maps its output to `data/generations.latest.json` for the dashboard (DECISIONS.md D12).
