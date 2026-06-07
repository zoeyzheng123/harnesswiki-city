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
| Harness loop | `harness/loop.py` | ⬜ Not started |
| HarnessState + meta-agent | `harness/state.py`, `harness/meta.py` | ⬜ Not started |
| Reward critic (ACOE) | `harness/critic.py` | ⬜ Not started — applies `data/policies/ACOE-YT-SHORTS-v1.0.json` |
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
- The dashboard still renders an AI-founder synthetic arc (`src/ui/lib/synthetic.ts`) and the legacy 0..1 `dimensions`; it migrates to ACOE per `docs/DASHBOARD_MIGRATION.md`.
- `RewardScore` carries both the ACOE outputs and the transitional legacy `dimensions` (`weighted_total = total_score/100`); the dimensions retire once the dashboard migrates (DECISIONS.md D11).
- `docs/WEAVE_TRACING.md` trace links are empty until the first traced runs.
