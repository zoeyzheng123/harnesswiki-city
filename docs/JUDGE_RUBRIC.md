# Judge Rubric

Owner of *scoring*. The Reward Critic and the Meta-Agent optimize against this
doc. The whole project depends on the evaluator not being arbitrary, so the
criteria are made concrete here.

The eight dimensions below are exactly the keys of `RewardScore.dimensions`
(`RewardDimensions` in `src/contracts/index.ts`). Keep them in sync.

## Dimensions

Score each ContentConcept 0..1 on:

**Higher is better**

- **hook_strength** — does the opening stop the scroll for the target audience?
- **trend_fit** — does it ride the supplied TrendContext, not a generic theme?
- **brand_fit** — on-voice for the audience and brand?
- **novelty** — fresh angle vs. recycled consensus?
- **clarity** — is the single idea unmistakable in one pass?

**Higher is worse (penalize in the weighted total)**

- **cringe_risk** — try-hard, dated, or embarrassing?
- **policy_risk** — violates `HarnessState.policy_rules`? Above threshold sets `policy_flag`.

**Feasibility**

- **visual_feasibility** — can the `visual_prompt` plausibly be rendered (Seedance) without heroics?

## Weighted total

`weighted_total` aggregates the dimensions using the rubric weights, subtracting
the risk dimensions. The exact weights live in `src/reward/rubric.ts` (planned)
and may be tuned by the Meta-Agent via `HarnessDiff.judge_rubric_change`.

## Pairwise comparison

For `predicted_win_prob`: estimate the probability that concept A would
outperform concept B for the target audience **while staying on-brand and
policy-safe**. Generation 1 is the baseline and is anchored at 0.5.

## Not the same as element weights

These dimensions describe *how we score*. They are distinct from
`HarnessState.element_weights`, which bias *what we generate* (see
`docs/DATA_CONTRACTS.md` → "Two vocabularies").
