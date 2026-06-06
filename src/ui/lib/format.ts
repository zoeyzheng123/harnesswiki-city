import type { RewardDimensions } from "./contracts";

/**
 * Formatting + label maps. The two vocabularies are kept in SEPARATE maps and
 * this is the only module that holds either. No component imports both, so the
 * rubric-dimensions vs element-weights conflation DECISIONS.md D3 warns about is
 * structurally impossible.
 */

const MINUS = "−"; // real minus sign, not a hyphen

/** 0.71 -> "0.71" (telemetry decimals, fixed width). */
export function dec(n: number, places = 2): string {
  return n.toFixed(places);
}

/** 0.82 -> "82%". For probabilities and 0..1 rates. */
export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** 0.1 -> "+.10", -0.05 -> "−.05", 0 -> "·". Drops the leading zero. */
export function signedDelta(n: number): string {
  if (n === 0) return "·";
  const sign = n > 0 ? "+" : MINUS;
  const body = Math.abs(n).toFixed(2).replace(/^0/, "");
  return `${sign}${body}`;
}

/** Clamp a long string to n chars with an ellipsis. */
export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1).trimEnd()}…`;
}

/** Humanize an unknown snake_case key, e.g. "founder_story" -> "Founder story". */
export function humanize(key: string): string {
  const spaced = key.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// ── Vocabulary 1: rubric dimensions (HOW we score) ─────────────────────────

export type DimensionKey = keyof RewardDimensions;

/** Rubric-dimension order for stable rendering (positive first, risk last). */
export const DIMENSION_ORDER: readonly DimensionKey[] = [
  "hook_strength",
  "trend_fit",
  "brand_fit",
  "novelty",
  "clarity",
  "visual_feasibility",
  "cringe_risk",
  "policy_risk",
] as const;

/** Dimensions where HIGHER is WORSE. Styled as penalties everywhere. */
export const RISK_DIMENSIONS = new Set<DimensionKey>(["cringe_risk", "policy_risk"]);

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  hook_strength: "Hook strength",
  trend_fit: "Trend fit",
  brand_fit: "Brand fit",
  novelty: "Novelty",
  clarity: "Clarity",
  visual_feasibility: "Visual feasibility",
  cringe_risk: "Cringe risk",
  policy_risk: "Policy risk",
};

// ── Vocabulary 2: element weights (generation BIASES) ──────────────────────

/** Known element-weight keys; unknown keys fall back to humanize(). */
export const ELEMENT_LABELS: Record<string, string> = {
  contrarian_hook: "Contrarian hook",
  diagnostic_hook: "Diagnostic hook",
  founder_story: "Founder story",
  data_drop: "Data drop",
  generic_listicle: "Generic listicle",
};

export function elementLabel(key: string): string {
  return ELEMENT_LABELS[key] ?? humanize(key);
}
