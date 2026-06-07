# Harness Memory

Owner of *living-memory rules*. Keeps "living memory" from becoming a pile of
vague notes.

## The wiki = generation records + harness lineage

Living memory is two things, both persisted as JSON:

1. The **GenerationRecord** rows (the "wiki") — one per generation, each
   embedding the concept, the ACOE score, the harness diff, and a distilled `Lesson`.
2. The **harness lineage** — the chain of `HarnessState` versions linked by
   `parent_harness_id`, each carrying a `diff_summary` of what the meta-agent changed.

The meta-agent reads these to rewrite the harness; the dashboard reads them to
draw the score curve, the weight shift, and the lessons panel.

## What counts as a lesson

A `Lesson` must include all five parts (enforced by the `Lesson` type):

- **observation** — what we noticed in the ACOE breakdown.
- **rule** — the generalizable guidance it implies.
- **evidence** — the concrete generation + category scores that support it.
- **harness_change** — the change made to HarnessState (which weights/prompts).
- **expected_effect** — which category/total we expect to lift next.

A note missing any of these is not a lesson; do not write it. (The terse
`diff_summary` on a `HarnessDiff`/`HarnessState` is a one-line companion, not a
substitute for a `Lesson`.)

## Element weights live here, conceptually

Lessons mutate `HarnessState.element_weights` (e.g. raise `comment_bait_question`,
`polarizing_angle`) over the `element_taxonomy` (the action space). These are
*generation biases*, not ACOE categories — see `docs/DATA_CONTRACTS.md` → "Three
vocabularies".

## Example

```
Observation:
The video scored well on hook and loop but engagement_bait capped the total
at 76 (Growing) — the on-screen question was answerable with an emoji.

Rule:
Use polarizing, typed-answer comment bait (ranking/comparison) kept on-screen
the full duration.

Evidence:
Generation 1 ACOE: hook_quality 26/30, engagement_bait 11/20, total 76 →
Growing tier.

Harness change:
Raise `comment_bait_question` (+0.15) and `polarizing_angle` (+0.10); update
`script_prompt` to demand a polarizing typed-answer question.

Expected effect:
engagement_bait climbs toward 18–20/20, pushing the total past 85 into Viral.
```

This mirrors the lesson in `data/stubs/generation-records.sample.json`.
