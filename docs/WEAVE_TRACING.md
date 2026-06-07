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

The ops **actually traced today** (everything else below is the target interface, not yet a standalone op):

| Traced op | Where | Status |
|-----------|-------|--------|
| `run_generation_loop` | `loop_core/loop.py` | ✅ traced |
| `traced_generate` (wraps the generator callable) | `loop_core/loop.py` | ✅ traced |
| `traced_score` (wraps the critic callable) | `loop_core/loop.py` | ✅ traced |
| `traced_meta` (wraps the meta-agent callable) | `loop_core/loop.py` | ✅ traced |
| `score_concept` · `judge_concept` | `harness/critic.py` | ✅ traced |
| `trend_scout` · `update_weights` · `rewrite_harness` · `apply_harness_diff` · `record_generation` · `render_concept` | — | ⬜ planned (not yet standalone ops) |

## Required logged fields

Across the loop, these must appear in the trace:

- `generation_number`
- `trend_context_id`
- `concept_id`
- `weighted_total` (and `predicted_score`)
- `total_score` (0–100), `distribution_tier`, `category_breakdown`, `auto_fails_triggered` (ACOE)
- `predicted_win_prob` (≡ `pairwise_winprob`)
- `element_weights` before and after (inner loop)
- `harness_diff` (and `diff_summary`) + `parent_harness_id`
- `judge_rationale` (≡ `rationale`) + `rubric_version`
- `policy_flag`
- `lesson`
- `outcome` (the typed posting result, once a concept is posted; `actual_engagement` deprecated, D17)

## Demo trace links

Fill these in before judging so the demo links straight to the right runs:

```
Run 1:
Run 2:
Final 5-generation loop:
```
