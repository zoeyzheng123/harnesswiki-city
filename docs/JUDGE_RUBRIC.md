# Judge Rubric

Owner of *scoring*. The Reward Critic and the Meta-Agent optimize against this
doc. The whole project depends on the evaluator not being arbitrary, so the
criteria are made concrete here. The rubric is **owned by the Critic** and
referenced elsewhere only by `rubric_version` (`v1` for the original concept
rubric; `acoe-yt-shorts-v1.0` for dance video) — generation is kept separate
from evaluation.

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

## Dance-video rubric (`acoe-yt-shorts-v1.0`, implemented)

`harness/critic.py` implements the first short-form dance-video policy. It
supports three evidence levels:

- `prompt_preflight` — project whether the generation prompt requests the
  required behavior; do not claim the behavior appeared in a video.
- `rendered_video` — judge supplied frame, timing, motion, artifact, and audio
  evidence.
- `publishing_package` — also judge title, description, hashtags, and audio
  provenance.

The policy score is 100 points:

| Category | Points | Signals |
|---|---:|---|
| Hook quality | 30 | peak motion in frame 1, high-contrast background, opening pattern interrupt, no intro |
| Retention and loop | 25 | 13–15s target, final-frame loop, no dead zones |
| Viewer engagement | 20 | relevant typed-response question, visibility, specific comparison/opinion |
| Visual production | 15 | dancer isolation, dynamic wardrobe, artifact-free render |
| Audio alignment | 5 | supplied approved/rising sound, movement-to-beat sync |
| Metadata | 5 | title/question match, hashtag mix, description CTA |

The source policy calls the viewer-engagement category `engagement_bait`; the
runtime keeps that JSON key for compatibility while rejecting deceptive or
unrelated manipulation.

### Auto-fails

- `AF-01` static/standing frame-1 start → complete score `0`.
- `AF-02` no text overlay in the first two seconds → hook and viewer-engagement
  categories `0`.
- `AF-03` duration below 13s or above 20s → retention/loop category `0`.
- `AF-04` audio explicitly outside the supplied approved pool → audio category
  `0`.

Missing evidence is `unknown`, not an invented failure. Distribution tiers are
experimental policy labels, not guaranteed view forecasts.

### Mapping into the eight canonical dimensions

The richer ACOE result maps back into the existing dashboard contract:

- hook category → `hook_strength`
- audio category + music/motion diagnostic → `trend_fit`
- vibe coherence → `brand_fit`
- originality diagnostic → `novelty`
- prompt detail + clarity + sequence flow → `clarity`
- generated-video feasibility diagnostic → `visual_feasibility`
- explicit diagnostics → `cringe_risk` / `policy_risk`
- ACOE score / 100 provides the base score; `cringe_risk` and `policy_risk`
  penalties produce `weighted_total` / `predicted_score`

This does **not** add keys to `RewardDimensions`; the dashboard remains
exhaustive and type-safe.

### Policy-learning signal

The Critic may populate `winning_elements`, `weak_elements`, and
`suggested_policy_updates` on `RewardScore`. The inner loop decides whether to
apply them. Deltas are allowed only for named sampled elements, bounded to
`[-0.10, 0.10]`, and require rendered evidence plus confidence ≥ `0.70`.
Prompt-preflight judgements never update policy.

The deterministic fallback is intentionally conservative. A production LLM is
injected into `judge_concept` / `score_concept` as a callable that receives a
system prompt and a JSON request, then returns JSON validated by Pydantic.

```python
def llm_judge(system_prompt: str, user_prompt: str) -> str:
    # Call the configured provider with temperature near zero and return JSON.
    ...

score = score_concept(
    concept,
    harness_state=state,
    trend_context=trend,
    evaluation_mode="prompt_preflight",
    judge=llm_judge,
)
```

## Not the same as element weights or taxonomy

These dimensions describe *how we score*. They are distinct from
`HarnessState.element_weights` (generation biases) and `element_taxonomy` (the
action space) — see `docs/DATA_CONTRACTS.md` → "Three vocabularies".
