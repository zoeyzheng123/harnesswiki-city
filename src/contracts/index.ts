/**
 * HarnessWiki City — canonical data contracts.
 *
 * This file is the SINGLE SOURCE OF TRUTH for the five shared schemas plus the
 * two derived types the loop and memory rely on (HarnessDiff, Lesson).
 *
 * `docs/DATA_CONTRACTS.md` explains these and embeds a copy for humans, but it
 * DEFERS to this file. If you change a contract here, update DATA_CONTRACTS.md
 * in the same change (see AGENTS.md non-negotiable #1).
 *
 * Vocabulary note — two different lists that are easy to confuse:
 *   - RewardDimensions   = HOW we score a concept (the judge rubric).
 *   - element_weights    = generation biases over content elements (e.g.
 *                          "contrarian_hook"). These are NOT the same list.
 */

/** A discrete piece of evidence inside a TrendContext. */
export type TrendSignal = {
  /** Human-readable signal, e.g. "format: contrarian take". */
  label: string;
  /** Relative prevalence / momentum, 0..1. */
  strength: number;
  note?: string;
};

/** What the world is doing. Input to the Content Generator. */
export type TrendContext = {
  id: string;
  /** ISO-8601 timestamp. */
  captured_at: string;
  /** e.g. "tiktok" | "x" | "linkedin". */
  platform: string;
  /** Target audience, e.g. "ai-founders". */
  audience: string;
  trend_summary: string;
  signals: TrendSignal[];
  /** Provenance. MVP uses "stub"; "live" is a future trend feed. */
  source: "stub" | "live";
};

/** What we propose to make. Output of the Content Generator. */
export type ContentConcept = {
  id: string;
  generation_number: number;
  trend_context_id: string;
  /** Version of the HarnessState that produced this concept. */
  harness_state_version: string;
  /** The opening scroll-stopper. */
  hook: string;
  /** Content element this concept leads with; a key into element_weights. */
  format: string;
  /** The core idea / point of view. */
  angle: string;
  /** Full short-form script. */
  script: string;
  /** Video prompt, rendered from HarnessState.seedance_prompt_template. */
  visual_prompt: string;
  /** Tagged content elements used; keys into HarnessState.element_weights. */
  elements: string[];
  /** Producing agent id/role, e.g. "content-generator". */
  created_by: string;
};

/**
 * The judge rubric, as numbers. Keys MUST stay in sync with the dimensions
 * listed in docs/JUDGE_RUBRIC.md. Positive dimensions: higher is better.
 * Risk dimensions (cringe_risk, policy_risk): higher is worse.
 */
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

/** How a concept scored and why. Output of the Reward Critic. */
export type RewardScore = {
  id: string;
  concept_id: string;
  generation_number: number;
  /** HarnessState version whose judge_rubric was applied (single version axis). */
  harness_state_version: string;
  dimensions: RewardDimensions;
  /** Aggregate score; risk dimensions penalize the total. */
  weighted_total: number;
  /** Pairwise win probability vs the baseline concept, 0..1. */
  predicted_win_prob?: number;
  /** True when policy_risk exceeds the harness threshold. */
  policy_flag: boolean;
  judge_rationale: string;
};

/**
 * The mutable operating state: prompts, weights, rubric, policy.
 * (Kept verbatim from the project spec.)
 */
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

/** A proposed change to the HarnessState, produced by the Meta-Agent. */
export type HarnessDiff = {
  id: string;
  from_version: string;
  to_version: string;
  /** Per-element weight deltas (added to current weights). */
  element_weight_changes: Record<string, number>;
  script_prompt_change?: string;
  seedance_prompt_template_change?: string;
  judge_rubric_change?: string;
  policy_rule_changes?: string[];
  rationale: string;
  /** Whether the loop accepted and applied this diff. */
  accepted: boolean;
};

/** A distilled living-memory lesson. See docs/HARNESS_MEMORY.md. */
export type Lesson = {
  id: string;
  generation_number: number;
  observation: string;
  rule: string;
  evidence: string;
  harness_change: string;
  expected_effect: string;
};

/** The living-memory row for one generation. */
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
