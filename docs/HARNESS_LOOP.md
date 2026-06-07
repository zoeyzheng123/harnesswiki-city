# Harness Loop

Owner of *runtime behavior*. If you want to know what the loop does, this file
decides — not the code comments, not the README. Implemented in
`loop_core/loop.py::run_generation_loop`; the `harness/` package provides the composable
critic / scout / bridge passed into it (the `generate_concept` / `trend_scout` / etc. names
below are the *conceptual* steps, not standalone top-level functions).

## Two loops

- **Inner loop** — within a generation, the loop core (A) nudges the **element
  weights** based on the `RewardScore` (toward `lowest_scoring_category`). The
  weights used for a concept are snapshotted onto `ContentConcept.element_weights`.
- **Outer loop** — once per generation, the **meta-agent** (A) rewrites the
  `HarnessState` (script prompt, weights, taxonomy), recording lineage via
  `parent_harness_id` + `diff_summary` and a structured `HarnessDiff`.

## Loop

For each generation:

1. Read the current **HarnessState**.
2. Scout the **TrendContext** + a rising approved track (`trend_scout`, Tavily).
3. Generate a dance-Short **ContentConcept** (`generate_concept`); snapshot the inner-loop weights onto it.
4. Score it (`score_concept`) against **ACOE-YT-SHORTS-v2.0** → **RewardScore** (`total_score`, `distribution_tier`, `category_breakdown`, `auto_fails_triggered`).
5. Inner loop: `update_policy` from the score:
   - **Auto-fail shield:** do not learn from auto-failed generations.
   - **Critic signal preferred:** apply evidence-based `suggested_policy_updates` (bounded ±0.10 each) directly.
   - **Fallback Hedge:** multiplicative weights with moving-mean baseline (EMA) and low eta (0.4).
   - **Exploration floor:** every element ≥ 0.03 so new candidates get tried.
6. Write a **GenerationRecord** (`record_generation`) embedding the concept + score (+ a distilled `Lesson`).
7. Outer loop: `rewrite_harness` → **HarnessDiff**; if accepted, `apply_harness_diff` → new HarnessState.
8. The bridge hook (`on_generation`) captures **all** candidate `(concept, reward)` pairs,
   marks the winner, and translates the batch into canonical `Candidate[]`.
9. Until real YouTube metrics exist, attach a deterministic seven-day synthetic
   `Outcome` to every candidate. Its view count stays inside the ACOE tier's view band and
   is always marked `source="synthetic"`.
10. Write the dashboard records to `data/generations.latest.json`; append one flat
    prompt/result/outcome row per candidate to `data/training/prompt_outcomes.jsonl`;
    publish the cumulative rows as a versioned W&B dataset Artifact when W&B is available.
11. Continue until `generations` is reached. Once posting is built, real YouTube outcomes
    replace the bootstrap label in a new dataset version.

## Post-rating action (from ACOE)

The action taken per generation follows the policy's `post_rating_action_map`:

- **total ≥ 85 (viral)** — publish; queue a follow-up within 48h.
- **65–84 (growing)** — fix `lowest_scoring_category` (apply the accepted `HarnessDiff`) before publishing.
- **≤ 64 (seed_jail)** — do **not** publish; **regenerate** with auto-fail corrections applied first.
- **any auto-fail triggered** — regenerate (AF-01 zeroes the whole score; AF-02/03/04 zero a category).

## MVP function shape

```python
run_loop(
    trend_context,            # TrendContext
    initial_harness_state,    # HarnessState
    generations=5,
) -> list[GenerationRecord]
```

Each loop step is its own Weave op. See the function → Weave-op mapping in
`docs/WEAVE_TRACING.md`.

## Improvement definition

This is the **only** place "self-improving" is defined. A generation is
*improved* over the previous one when, on the same TrendContext:

- `total_score` increases (and ideally crosses into a higher `distribution_tier`),

**and**

- no new `auto_fails_triggered` appear (an auto-fail is an automatic regenerate, not an improvement).

Equivalently in the legacy view, `weighted_total` (= `total_score / 100`) rises.
The dashboard plots the climb across generations toward the viral threshold (85).

## Acceptance of a HarnessDiff

The meta-agent proposes a `HarnessDiff`; the loop accepts it (`accepted: true`)
only if applying it is expected to raise `total_score` (typically by lifting the
`lowest_scoring_category`) without introducing an auto-fail. Rejected diffs are
recorded (`accepted: false`) and do not advance the version.
