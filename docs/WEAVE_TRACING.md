# Weave Tracing

Owner of *instrumentation*. Makes W&B Weave central and reliable — the demo
should never depend on hunting through Weave live.

Init `weave.init(WEAVE_PROJECT)` (default `harnesswiki-city`); auth via
`WANDB_API_KEY`. See `.env.example`. Each loop function is a `@weave.op()` in
`harness/weave_trace.py` (wrappers) / the module that owns it.

## Required traced ops

Python function → Weave op (snake_case matches the function name):

| Function (`harness/...`) | Weave op |
|--------------------------|----------|
| `run_loop` | `run_loop` |
| `trend_scout` | `trend_scout` |
| `generate_concept` | `generate_concept` |
| `score_concept` | `score_concept` |
| `update_weights` (inner loop) | `update_weights` |
| `rewrite_harness` | `rewrite_harness` |
| `apply_harness_diff` | `apply_harness_diff` |
| `record_generation` | `record_generation` |
| `render_concept` | `render_concept` *(optional / Seedance)* |

## Required logged fields

Across the loop, these must appear in the trace:

- `generation_number`
- `trend_context_id`
- `concept_id`
- `weighted_total` (and `predicted_score`) + the `dimensions`
- `total_score` (0–100), `distribution_tier`, `category_breakdown`, `auto_fails_triggered` (ACOE)
- `predicted_win_prob` (≡ `pairwise_winprob`)
- `element_weights` before and after (inner loop)
- `harness_diff` (and `diff_summary`) + `parent_harness_id`
- `judge_rationale` (≡ `rationale`) + `rubric_version`
- `policy_flag`
- `lesson`
- `actual_engagement` (once a concept is posted)

## Demo trace links

Fill these in before judging so the demo links straight to the right runs:

```
Run 1:
Run 2:
Final 5-generation loop:
```
