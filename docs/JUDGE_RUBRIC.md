# Judge Rubric

Owner of *scoring*. The Reward Critic and the Meta-Agent optimize against this
doc. The whole project depends on the evaluator not being arbitrary, so the
criteria are made concrete here. The rubric is **owned by the Critic** and
referenced elsewhere only by `rubric_version` (currently `v1`) — generation is
kept separate from evaluation.

The eight dimensions below are exactly the keys of `RewardScore.dimensions`
(`RewardDimensions` in `harness/contracts.py`, mirrored in `src/contracts/index.ts`).
Keep them in sync.

## Dimensions

Score each ContentConcept 0..1 on:

**Higher is better**

- **hook_strength** — does the opening stop the scroll in the first 1–3 seconds? (Short-form video: motion or a face in frame 1.)
- **trend_fit** — does it ride the supplied TrendContext — aligned with an existing wave (e.g. a rising sound), not a generic theme?
- **brand_fit** — on-voice for the audience and brand?
- **novelty** — fresh angle vs. recycled consensus?
- **clarity** — is the single idea unmistakable in one pass?

**Higher is worse (penalize in the weighted total)**

- **cringe_risk** — try-hard, dated, or embarrassing?
- **policy_risk** — violates `HarnessState.policy_rules`? Above threshold sets `policy_flag` (and the meta-agent rejects the resulting diff).

**Feasibility**

- **visual_feasibility** — can the `visual_prompt` / `seedance_prompt` plausibly be rendered without heroics?

## Score surface

The Critic emits, in `RewardScore`:

- `dimensions` (the 8 above) and `weighted_total` (aggregate; risk dims subtract).
- `predicted_win_prob` — pairwise win probability vs the baseline concept (≡ Eng 1's `pairwise_winprob`); `predicted_score` is the normalized headline.
- `confidence`, `judge_rationale` (≡ `rationale`), and `policy_flag`.

## Pairwise comparison

For `predicted_win_prob`: estimate the probability that concept A would
outperform concept B for the target audience **while staying on-brand and
policy-safe**. Generation 1 is the baseline, anchored at 0.5.

## Short-form-video rubric (rubric_version `v2`, planned)

When the build switches to short-form video, the Critic weighs additional signals
— **cut frequency**, **audio recency / BPM / is-it-a-rising-sound**, **length**,
**posting time**, **hashtag set** — as *inputs* that feed the existing dimensions
(e.g. cut frequency and frame-1 motion → `hook_strength`; a rising sound →
`trend_fit`; length/cuts → `visual_feasibility`). These ride under a new
`rubric_version` and do **not** add keys to `RewardDimensions` (the dashboard's
`DIMENSION_LABELS` is exhaustive — a new key breaks `pnpm typecheck:ui`; see
DECISIONS.md D10). The video attributes themselves live on `ContentConcept`
(`docs/DATA_CONTRACTS.md` → "Short-form-video attributes").

## Not the same as element weights or taxonomy

These dimensions describe *how we score*. They are distinct from
`HarnessState.element_weights` (generation biases) and `element_taxonomy` (the
action space) — see `docs/DATA_CONTRACTS.md` → "Three vocabularies".
