/**
 * Formatting + label maps for the ACOE-YT-SHORTS-v2.0 rubric.
 *
 * Three vocabularies are kept in SEPARATE maps and this is the only module that
 * holds any of them, so the conflation DECISIONS.md D3 warns about is
 * structurally impossible:
 *   1. rubric CATEGORIES   — how we score (0–100, 6 categories)
 *   2. element WEIGHTS      — generation biases (dance elements)
 *   3. (element taxonomy lives in the contract, not rendered as a vocabulary)
 */

const MINUS = "−"; // real minus sign, not a hyphen

/** 0.71 -> "0.71" (telemetry decimals, fixed width). */
export function dec(n: number, places = 2): string {
  return n.toFixed(places);
}

/** Integer points, e.g. 24.0 -> "24". */
export function pts(n: number): string {
  return String(Math.round(n));
}

/** 0.82 -> "82%". For 0..1 rates. */
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

/** +12 / −12 for whole-point deltas (total_score, category points). */
export function signedPts(n: number): string {
  if (n === 0) return "·";
  return `${n > 0 ? "+" : MINUS}${Math.abs(Math.round(n))}`;
}

/** Clamp a long string to n chars with an ellipsis. */
export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1).trimEnd()}…`;
}

/** Humanize an unknown snake_case key, e.g. "peak_motion_frame1" -> "Peak motion frame1". */
export function humanize(key: string): string {
  const spaced = key.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// ── Vocabulary 1: ACOE rubric categories (HOW we score, points out of 100) ──

export type CategoryKey =
  | "hook_quality"
  | "retention_and_loop"
  | "engagement_bait"
  | "visual_production"
  | "audio_alignment"
  | "metadata";

/** Stable render order, highest-weight first. */
export const CATEGORY_ORDER: readonly CategoryKey[] = [
  "hook_quality",
  "retention_and_loop",
  "engagement_bait",
  "visual_production",
  "audio_alignment",
  "metadata",
] as const;

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  hook_quality: "Hook quality",
  retention_and_loop: "Retention & loop",
  engagement_bait: "Engagement bait",
  visual_production: "Visual production",
  audio_alignment: "Audio alignment",
  metadata: "Metadata",
};

/** Max points per category (sums to 100). */
export const CATEGORY_MAX: Record<CategoryKey, number> = {
  hook_quality: 30,
  retention_and_loop: 25,
  engagement_bait: 10,
  visual_production: 15,
  audio_alignment: 15,
  metadata: 5,
};

// ── Distribution tiers ──────────────────────────────────────────────────────

export type Tier = "viral" | "growing" | "seed_jail";

export const GROWING_AT = 65;
export const VIRAL_AT = 85;

export const TIER_LABELS: Record<Tier, string> = {
  viral: "viral",
  growing: "growing",
  seed_jail: "seed jail",
};

/** Ordinal low→high quality ramp, drawn from existing tokens (DESIGN.md). */
export const TIER_COLOR: Record<Tier, string> = {
  seed_jail: "var(--color-negative)",
  growing: "var(--color-critic)",
  viral: "var(--color-positive)",
};

export function tierFor(total: number): Tier {
  if (total >= VIRAL_AT) return "viral";
  if (total >= GROWING_AT) return "growing";
  return "seed_jail";
}

// ── Auto-fails (hard overrides) ─────────────────────────────────────────────

export const AUTO_FAIL_LABELS: Record<string, string> = {
  "AF-01": "Standing start: static frame 1, total score overridden to 0",
  "AF-02": "No on-screen text in the first 2s, hook + engagement zeroed",
  "AF-03": "Duration violation (under 13s or over 20s), retention zeroed",
  "AF-04": "No trending audio, audio alignment zeroed",
  "AF-05": "Brand-safety violation: explicit/unsafe content, total score overridden to 0",
};

export function autoFailLabel(code: string): string {
  return AUTO_FAIL_LABELS[code] ?? code;
}

// ── Vocabulary 2: element weights (dance-generation BIASES) ─────────────────

export const ELEMENT_LABELS: Record<string, string> = {
  peak_motion_frame1: "Peak motion (frame 1)",
  seamless_loop: "Seamless loop",
  delayed_resolution: "Delayed resolution",
  typed_question: "Typed question",
  trending_audio: "Trending audio",
  reflective_outfit: "Reflective outfit",
  generic_choreo: "Generic choreo",
};

export function elementLabel(key: string): string {
  return ELEMENT_LABELS[key] ?? humanize(key);
}
