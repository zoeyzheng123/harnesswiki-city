# Weave Tracing

Owner of *instrumentation*. Makes W&B Weave central and reliable — the demo
should never depend on hunting through Weave live.

> **Status: landed (offline-safe).** `harness/weave_trace.py` is the single Weave surface —
> `op` (≡ `weave.op`, or a no-op when Weave is absent) + an idempotent `init_weave()`. The
> loop (`loop_core/loop.py`: generate / score / meta) and the critic (`harness/critic.py`:
> `score_concept` / `judge_concept`) are traced. With `weave` uninstalled, no W&B creds, or
> `WEAVE_DISABLE` set, everything runs unchanged.

Init via `init_weave()` (wraps `weave.init`); project = `WEAVE_PROJECT` env, default
`sia-social-loop` (matches the loop). Auth via `wandb login` or `WANDB_API_KEY`. Enable live
tracing: `pip install weave` (now in `requirements.txt`) + log in.

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
