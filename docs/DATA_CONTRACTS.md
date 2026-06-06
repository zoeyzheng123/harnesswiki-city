# Data Contracts

The shared schemas every engineer and agent codes against. This is the doc that
makes integration-with-stubs possible.

> **Canonical source:** `src/contracts/index.ts`. The TypeScript below is a
> mirror for humans. If the two ever disagree, the `.ts` file wins — and you
> must fix this doc in the same change (AGENTS.md non-negotiable #1).
> `pnpm typecheck` enforces that `data/stubs/*.json` conform to these types.

## Two vocabularies — do not conflate

| | What it is | Where it lives |
|---|---|---|
| **Reward dimensions** | *How we score* a concept | `RewardScore.dimensions` (8 keys) → `docs/JUDGE_RUBRIC.md` |
| **Element weights** | *Generation biases* over content elements (e.g. `contrarian_hook`) | `HarnessState.element_weights` → `docs/HARNESS_MEMORY.md` |

These are different lists. The rubric never contains `contrarian_hook`; the
element weights never contain `hook_strength`.

## The five contracts (+ two derived)

- **TrendContext** — what the world is doing.
- **ContentConcept** — what we propose to make.
- **RewardScore** — how the concept scored and why.
- **GenerationRecord** — the living-memory row for one generation.
- **HarnessState** — the mutable operating state: prompts, weights, rubric, policy.
- *(derived)* **HarnessDiff** — a proposed change to HarnessState (Meta-Agent output).
- *(derived)* **Lesson** — a distilled memory lesson (Wiki Curator output).

```ts
export type TrendSignal = {
  label: string;        // e.g. "format: contrarian take"
  strength: number;     // relative prevalence / momentum, 0..1
  note?: string;
};

export type TrendContext = {
  id: string;
  captured_at: string;  // ISO-8601
  platform: string;     // "tiktok" | "x" | "linkedin" | ...
  audience: string;     // e.g. "ai-founders"
  trend_summary: string;
  signals: TrendSignal[];
  source: "stub" | "live";
};

export type ContentConcept = {
  id: string;
  generation_number: number;
  trend_context_id: string;
  harness_state_version: string;  // version that produced it
  hook: string;
  format: string;                 // a key into element_weights
  angle: string;
  script: string;
  visual_prompt: string;          // rendered from seedance_prompt_template
  elements: string[];             // keys into element_weights
  created_by: string;             // agent id/role
};

// Positive dims: higher is better. Risk dims (cringe_risk, policy_risk): higher is worse.
export type RewardDimensions = {
  hook_strength: number;
  trend_fit: number;
  brand_fit: number;
  novelty: number;
  clarity: number;
  cringe_risk: number;
  policy_risk: number;
  visual_feasibility: number;
};

export type RewardScore = {
  id: string;
  concept_id: string;
  generation_number: number;
  harness_state_version: string;  // rubric version axis = harness version
  dimensions: RewardDimensions;
  weighted_total: number;         // risk dims penalize the total
  predicted_win_prob?: number;    // pairwise win prob vs baseline, 0..1
  policy_flag: boolean;           // policy_risk over threshold
  judge_rationale: string;
};

export type HarnessState = {
  id: string;
  version: string;
  element_weights: Record<string, number>;
  script_prompt: string;
  seedance_prompt_template: string;
  judge_rubric: string;
  policy_rules: string[];
  updated_from_generation_id?: string;
};

export type HarnessDiff = {
  id: string;
  from_version: string;
  to_version: string;
  element_weight_changes: Record<string, number>;  // deltas
  script_prompt_change?: string;
  seedance_prompt_template_change?: string;
  judge_rubric_change?: string;
  policy_rule_changes?: string[];
  rationale: string;
  accepted: boolean;
};

export type Lesson = {
  id: string;
  generation_number: number;
  observation: string;
  rule: string;
  evidence: string;
  harness_change: string;
  expected_effect: string;
};

export type GenerationRecord = {
  id: string;
  generation_number: number;
  created_at: string;
  trend_context_id: string;
  concept: ContentConcept;
  score: RewardScore;
  harness_state_version_before: string;
  harness_state_version_after?: string;
  harness_diff?: HarnessDiff;
  lesson?: Lesson;
};
```

## Stubs

Working examples live in `data/stubs/` and are validated against these types at
typecheck time:

- `trend-contexts.json` — `TrendContext[]`
- `harness-state.initial.json` — `HarnessState` (version `v0`)
- `generation-records.sample.json` — `GenerationRecord[]`

Code against these stubs to integrate before the real generators exist.
