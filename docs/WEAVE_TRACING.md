# Weave Tracing

Owner of *instrumentation*. Makes W&B Weave central and reliable — the demo
should never depend on hunting through Weave live.

> **Status: landed (offline-safe).** `harness/weave_trace.py` is the single Weave surface —
> `op` (≡ `weave.op`, or a no-op when Weave is absent) + an idempotent `init_weave()`. The
> loop (`loop_core/loop.py`: generate / score / meta), critic (`harness/critic.py`:
> `score_concept` / `judge_concept`), synthetic outcome producer, and per-candidate
> prompt/result row builder are traced. With `weave` uninstalled, no W&B creds, or
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
| `synthetic_week_one_outcome` | `harness/outcomes.py` | ✅ traced |
| `prompt_result_row` | `harness/training_data.py` | ✅ traced — one trace per candidate prompt + result + views |
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
- `generation_prompt` + shared `harness_prompt`
- `variant_id`, `selected`, `created_by`
- `views_at_168h`, `target_log1p_views`, `label_source`, `label_maturity_hours`

## Versioned prompt/outcome dataset

`harness/training_data.py` appends every candidate to
`data/training/prompt_outcomes.jsonl`, then publishes the cumulative rows as a W&B
Table inside the `dance-prompt-engagement` dataset Artifact. Reusing the Artifact
name creates W&B versions; aliases are `latest` plus `synthetic`, `mixed`, or
`observed` according to the labels present.

To seed 400 deterministic synthetic examples and publish:

```bash
wandb login
python scripts/publish_wandb_dataset.py
```

The publisher uses `scripts/synth_prompt_outcomes.py`, a balanced corpus whose
actual prompt text ranges from explicit auto-fails through partial, growing, and
fully specified viral prompts. The real deterministic critic scores each prompt,
then `synthetic_week_one_outcome` assigns a tier-consistent label. The separate
proxy-vs-truth calibration benchmark remains unchanged.

Optional environment variables:

- `WANDB_PROJECT` (falls back to `WEAVE_PROJECT`, then `sia-social-loop`)
- `WANDB_DATASET_ARTIFACT` (default `dance-prompt-engagement`)
- `WANDB_REGISTRY_PATH` (for example
  `wandb-registry-Datasets/dance-prompt-engagement`)
- `WANDB_DATASET_DISABLE=1` to retain local JSONL without publishing

Synthetic labels are bootstrap data, not evidence of real engagement. Training
and evaluation must filter or stratify by `label_source`; observed YouTube rows
must never be silently mixed into a synthetic-only benchmark.

## Redis dataset mirror

`scripts/publish_redis_dataset.py` mirrors the same flattened prompt/outcome rows
to Redis Cloud without embedding credentials in code:

```bash
REDIS_URL='redis://user:password@host:port' \
  python scripts/publish_redis_dataset.py \
  --dataset dance-prompt-engagement \
  --version test-v1
```

The publisher uses standard Redis data structures:

- `harnesswiki:datasets:<dataset>:<version>:rows` — HASH from `example_id` to row JSON
- `...:scores` — score-sorted ZSET
- `...:views` — `log1p(views_at_168h)`-sorted ZSET
- `...:tier:<tier>` — tier membership SETs
- `...:manifest` — dataset metadata STRING
- `harnesswiki:datasets:<dataset>:latest` — latest version STRING

Writes are compact and batched, and replacing one version only clears keys under
that exact namespace. This currently mirrors dataset/training rows, not W&B's
internal proprietary trace storage.

## Demo trace links

Fill these in before judging so the demo links straight to the right runs:

```
Run 1:
Run 2:
Final 5-generation loop:
```
