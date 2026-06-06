# Harness Loop

Owner of *runtime behavior*. If you want to know what the loop does, this file
decides — not the code comments, not the README. Implemented in `harness/loop.py`.

## Two loops

- **Inner loop** — within a generation, the loop core (A) nudges the **element
  weights** based on the `RewardScore`. The weights used for a concept are
  snapshotted onto `ContentConcept.element_weights`.
- **Outer loop** — once per generation, the **meta-agent** (A) rewrites the
  `HarnessState` (system prompt, weights, taxonomy), recording lineage via
  `parent_harness_id` + `diff_summary` and a structured `HarnessDiff`.

## Loop

For each generation:

1. Read the current **HarnessState**.
2. Scout/read the **TrendContext** (`trend_scout`, Tavily).
3. Generate a **ContentConcept** (`generate_concept`) from TrendContext + HarnessState; snapshot the inner-loop weights onto the concept.
4. Score it (`score_concept`) → **RewardScore**.
5. Inner loop: `update_weights` from the score.
6. Write a **GenerationRecord** (`record_generation`) embedding the concept + score (+ a distilled `Lesson`).
7. Outer loop: ask the meta-agent (`rewrite_harness`) for a **HarnessDiff**; if accepted, `apply_harness_diff` → new HarnessState.
8. Continue until `generations` is reached. Optionally `render_concept` (Seedance) for the selected concept; once posted, `actual_engagement`/`post_url` fill in.

A rejected diff (`accepted: false`) is still recorded so the history shows what
was tried — see the generation-3 refusal in the dashboard's arc.

## MVP function shape

```python
run_loop(
    trend_context,            # TrendContext
    initial_harness_state,    # HarnessState
    generations=5,
) -> list[GenerationRecord]
```

Each loop step is its own Weave op so it shows up individually. See the
function → Weave-op mapping in `docs/WEAVE_TRACING.md`.

## Improvement definition

This is the **only** place "self-improving" is defined. A generation is
*improved* over the previous one, on the same TrendContext, when:

- `predicted_win_prob` increases (≡ Eng 1's `pairwise_winprob`), **or**
- `weighted_total` increases (≡ Eng 1's `predicted_score`),

**and**

- `policy_risk` does not increase above the policy threshold (if it does, the diff is rejected and `policy_flag` is set).

Generation 1 is the baseline (`predicted_win_prob = 0.5`). The dashboard plots
`weighted_total` / `predicted_win_prob` across generations to show the climb.

## Acceptance of a HarnessDiff

The meta-agent proposes a `HarnessDiff`; the loop accepts it (`accepted: true`)
only if applying it is expected to satisfy the improvement definition and does
not raise `policy_risk` above threshold. Rejected diffs are recorded
(`accepted: false`) and do not advance the version.
