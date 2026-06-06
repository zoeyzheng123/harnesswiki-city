# Weave Tracing

Owner of *instrumentation*. Makes W&B Weave central and reliable — the demo
should never depend on hunting through Weave live.

Project name: `WEAVE_PROJECT` (default `harnesswiki-city`). Auth via
`WANDB_API_KEY`. See `.env.example`.

## Required traced ops

Every loop function is a Weave op. TypeScript function → Weave op name:

| Function (`src/...`) | Weave op |
|----------------------|----------|
| `runLoop` | `run_loop` |
| `generateConcept` | `generate_concept` |
| `scoreConcept` | `score_concept` |
| `rewriteHarness` | `rewrite_harness` |
| `applyHarnessDiff` | `apply_harness_diff` |
| `recordGeneration` | `record_generation` |
| `renderWinner` | `render_winner` *(optional / out of MVP — Seedance render)* |

`trendScout` is not traced in the MVP because it reads a stub file; trace it if
it becomes a live fetch.

## Required logged fields

Across the loop, these must appear in the trace:

- `generation_number`
- `trend_context_id`
- `concept_id`
- `reward_score` (the `weighted_total`, plus the dimensions)
- `element_weights_before`
- `element_weights_after`
- `harness_diff`
- `judge_rationale`
- `memory_lesson`

## Demo trace links

Fill these in before judging so the demo links straight to the right runs:

```
Run 1:
Run 2:
Final 5-generation loop:
```
