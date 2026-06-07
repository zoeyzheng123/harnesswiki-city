# Status

Live build state. Update this when the build state changes (AGENTS.md
Definition of Done).

_Last updated: 2026-06-06._

## Component status

| Component | File(s) | Status |
|-----------|---------|--------|
| Shared contracts | `harness/contracts.py` (canonical) · `src/contracts/index.ts` (mirror) | ✅ Done — round-trips + typechecks |
| Stub data | `data/stubs/*.json` via `scripts/dump_stubs.py` | ✅ Done — generated from Pydantic + validated |
| Documentation pack | `README.md`, `AGENTS.md`, `docs/*` | ✅ Done — reconciled to the merged contracts |
| Harness loop | `harness/loop.py` | ⬜ Not started |
| HarnessState + meta-agent | `harness/state.py`, `harness/meta.py` | ⬜ Not started |
| Reward critic | `harness/critic.py` | ⬜ Not started |
| Content generator | `harness/generator.py`, `harness/scout.py`, `harness/seedance.py` | ⬜ Not started |
| Weave tracing | `harness/weave_trace.py` | ⬜ Not started |
| Dashboard | `src/ui/` | 🟦 In progress — control-room UI built (score curve, weight shift, generation table + detail, living memory). Runs on synthetic data; binds real `GenerationRecord[]` via the `src/ui/lib/data.ts` seam. |

## Next up (to make the demo loop run)

1. `harness/weave_trace.py` — `weave.init` + `@weave.op` wrappers.
2. `harness/scout.py` — TrendContext (Tavily).
3. `harness/generator.py` — ContentConcept from TrendContext + HarnessState.
4. `harness/critic.py` — RewardScore on the rubric.
5. `harness/{state,meta,loop}.py` — wire the loop (inner-loop weights + outer-loop rewrite).
6. Point `src/ui/lib/data.ts` at the loop's `generation-records` JSON output.

## Known placeholders

- `pnpm dev` points at `pnpm dev:ui`; the Python generation loop is not implemented.
- The dashboard renders a synthetic 5-generation arc (`src/ui/lib/synthetic.ts`) until the real loop writes records.
- `docs/WEAVE_TRACING.md` trace links are empty until the first traced runs.
- The contract carries optional Eng 1 + short-form-video fields pending an Eng 1/Eng 4 prune (DECISIONS.md D8).
- `ContentConcept` now has explicit short-form fields (`audio`, `dance_style`, `cut_frequency`, `hashtag_set`, `posting_time`); unused by the AI-founder demo, ready for the TikTok direction (DECISIONS.md D10).
