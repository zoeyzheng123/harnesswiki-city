# Status

Live build state. Update this when the build state changes (AGENTS.md
Definition of Done).

_Last updated: 2026-06-06._

## Component status

| Component | File(s) | Status |
|-----------|---------|--------|
| Shared contracts | `src/contracts/index.ts` | ✅ Done — type-checked |
| Stub data | `data/stubs/*.json` | ✅ Done — validated at typecheck |
| Documentation pack | `README.md`, `AGENTS.md`, `docs/*` | ✅ Done |
| Harness loop | `src/harness/loop.ts` | ⬜ Not started |
| HarnessState read/write | `src/harness/state.ts` | ⬜ Not started |
| Meta-agent | `src/harness/metaAgent.ts` | ⬜ Not started |
| Reward critic | `src/reward/score.ts`, `src/reward/rubric.ts` | ⬜ Not started |
| Content generator | `src/content/generateConcept.ts`, `src/content/trendScout.ts`, `src/content/seedancePrompt.ts` | ⬜ Not started |
| Memory | `src/memory/generationRecords.ts`, `src/memory/lessons.ts` | ⬜ Not started |
| Weave tracing | `src/weave/trace.ts` | ⬜ Not started |
| Dashboard | `src/ui/` | ⬜ Not started |

## Next up (to make the demo loop run)

1. `src/weave/trace.ts` — Weave init + op wrapper.
2. `src/content/generateConcept.ts` — concept from TrendContext + HarnessState.
3. `src/reward/score.ts` — RewardScore on the rubric.
4. `src/harness/{state,metaAgent,loop}.ts` — wire the 8-step loop.
5. `src/memory/*` — persist GenerationRecords + lessons.
6. `src/ui/` — score curve + element-weight chart + generation table.

## Known placeholders

- `pnpm dev` prints a "not implemented yet" message until the loop/dashboard exist.
- `docs/WEAVE_TRACING.md` trace links are empty until the first traced runs.
