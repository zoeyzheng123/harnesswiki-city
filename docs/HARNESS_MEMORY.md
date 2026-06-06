# Harness Memory

Owner of *living-memory rules*. Keeps "living memory" from becoming a pile of
vague notes.

## Memory row

Each generation writes one **GenerationRecord** (see `docs/DATA_CONTRACTS.md`).
That row is the memory. It carries the concept, the score, the harness diff that
followed, and an optional distilled `Lesson`.

## What counts as a lesson

A `Lesson` must include all five parts (enforced by the `Lesson` type):

- **observation** — what we noticed in the data.
- **rule** — the generalizable guidance it implies.
- **evidence** — the concrete generation + scores that support it.
- **harness_change** — the change made to HarnessState (which weights/prompts).
- **expected_effect** — what we expect to improve next.

A note missing any of these is not a lesson; do not write it.

## Element weights live here, conceptually

Lessons mutate `HarnessState.element_weights` (e.g. raise `contrarian_hook`,
lower `generic_listicle`). These are *generation biases*, not rubric dimensions
— see `docs/DATA_CONTRACTS.md` → "Two vocabularies".

## Example

```
Observation:
Generic listicle hooks scored low on novelty and hook_strength for the
AI-founder audience.

Rule:
For founder-facing AI content, prefer contrarian or diagnostic hooks.

Evidence:
Generation 1: contrarian_hook concept scored 0.82 hook_strength / 0.78
trend_fit (weighted_total 0.71), beating generic framings.

Harness change:
Decrease `generic_listicle` weight (-0.1). Increase `contrarian_hook`
weight (+0.1). Reinforce in `script_prompt`.

Expected effect:
Later generations open with sharper, consensus-subverting hooks, lifting
predicted win probability.
```

This mirrors the lesson in `data/stubs/generation-records.sample.json`.
