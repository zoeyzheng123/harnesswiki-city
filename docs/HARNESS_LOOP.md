# Harness Loop

Owner of *runtime behavior*. If you want to know what the loop does, this file
decides — not the code comments, not the README.

## Loop

For each generation:

1. Read the current **HarnessState**.
2. Read the **TrendContext**.
3. Generate a **ContentConcept** (`generateConcept`) from TrendContext + HarnessState.
4. Score the ContentConcept (`scoreConcept`) → **RewardScore**.
5. Write a **GenerationRecord** (`recordGeneration`) with the concept + score.
6. Ask the Meta-Agent (`rewriteHarness`) for a **HarnessDiff**.
7. Apply the accepted HarnessDiff (`applyHarnessDiff`) to HarnessState; append the diff and a distilled **Lesson** to the GenerationRecord.
8. Continue until `generations` is reached.

The record is *created* at step 5 (concept + score) and *finalized* at step 7
(adds `harness_diff` and `lesson`). That is why those two fields are optional in
the contract.

## MVP function shape

```ts
runLoop({
  trendContext,            // TrendContext
  initialHarnessState,     // HarnessState
  generations: 5,
}): GenerationRecord[]
```

Each loop step is its own traced function so it shows up individually in Weave.
See the function → Weave-op mapping in `docs/WEAVE_TRACING.md`.

## Improvement definition

This is the **only** place "self-improving" is defined. A generation is
considered *improved* over the previous one when, on the same TrendContext:

- `predicted_win_prob` increases (pairwise win probability vs the baseline concept), **or**
- `weighted_total` increases on the rubric,

**and**

- `policy_risk` does not increase above the policy threshold (if it does, the diff is rejected and `policy_flag` is set).

Generation 1 is the baseline (`predicted_win_prob = 0.5`). The dashboard plots
`weighted_total` and `predicted_win_prob` across generations to show the climb.

## Acceptance of a HarnessDiff

The Meta-Agent proposes a HarnessDiff; the loop accepts it (`accepted: true`)
only if applying it is expected to satisfy the improvement definition and does
not raise `policy_risk` above threshold. Rejected diffs are still recorded
(`accepted: false`) so the history shows what was tried.
