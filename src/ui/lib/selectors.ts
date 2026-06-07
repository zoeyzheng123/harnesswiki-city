import type {
  GenerationRecord,
  HarnessDiff,
  HarnessState,
  Lesson,
  TrendContext,
} from "./contracts";

/**
 * Pure derivations from `GenerationRecord[]`. Every view shape is computed here
 * (and array indexing is narrowed here, once) so components stay declarative and
 * the synthetic-vs-real data source never leaks into them.
 */

export function roundWeight(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Apply a diff's element-weight deltas; weights are clamped at 0. */
function applyChanges(
  weights: Record<string, number>,
  changes: Record<string, number>,
): Record<string, number> {
  const next: Record<string, number> = { ...weights };
  for (const key of Object.keys(changes)) {
    const delta = changes[key] ?? 0;
    next[key] = Math.max(0, roundWeight((next[key] ?? 0) + delta));
  }
  return next;
}

/** The next HarnessState after an accepted diff on `prev`. */
function nextState(prev: HarnessState, rec: GenerationRecord, diff: HarnessDiff): HarnessState {
  return {
    ...prev,
    id: `hs_${diff.to_version}`,
    version: rec.harness_state_version_after ?? diff.to_version,
    element_weights: applyChanges(prev.element_weights, diff.element_weight_changes),
    script_prompt: diff.script_prompt_change
      ? `${prev.script_prompt} ${diff.script_prompt_change}`
      : prev.script_prompt,
    updated_from_generation_id: rec.id,
  };
}

/** Stable element-key order (the order the initial state declares them). */
export function elementKeys(initial: HarnessState): string[] {
  return Object.keys(initial.element_weights);
}

/** Fold the accepted diffs from the first `count` generations onto the state. */
export function stateAtGeneration(
  initial: HarnessState,
  records: GenerationRecord[],
  count: number,
): HarnessState {
  let state = initial;
  for (const rec of records.slice(0, count)) {
    const diff = rec.harness_diff;
    if (diff?.accepted) state = nextState(state, rec, diff);
  }
  return state;
}

/** The full version lineage [v0 … current] as of `count` generations. */
export function lineageThroughGeneration(
  initial: HarnessState,
  records: GenerationRecord[],
  count: number,
): HarnessState[] {
  const states: HarnessState[] = [initial];
  let state = initial;
  for (const rec of records.slice(0, count)) {
    const diff = rec.harness_diff;
    if (diff?.accepted) {
      state = nextState(state, rec, diff);
      states.push(state);
    }
  }
  return states;
}

export type CurvePoint = {
  generation_number: number;
  total_score: number; // 0–100 ACOE total
  auto_failed: boolean;
  auto_fail_code?: string;
  lowest_scoring_category?: string;
  refused: boolean; // the meta-agent rejected this generation's harness rewrite (D5)
  held_version?: string; // the version the harness held at when a rewrite was refused
};

export function curvePoints(records: GenerationRecord[]): CurvePoint[] {
  return records.map((r) => {
    const refused = !!r.harness_diff && !r.harness_diff.accepted;
    return {
      generation_number: r.generation_number,
      total_score: r.score.total_score ?? Math.round((r.score.weighted_total ?? 0) * 100),
      auto_failed: (r.score.auto_fails_triggered?.length ?? 0) > 0,
      auto_fail_code: r.score.auto_fails_triggered?.[0],
      lowest_scoring_category: r.score.lowest_scoring_category,
      refused,
      held_version: refused ? r.harness_diff?.from_version : undefined,
    };
  });
}

export type LessonEntry = { lesson: Lesson; record: GenerationRecord };

/** Lessons from the first `count` generations, newest last. */
export function lessonsThrough(records: GenerationRecord[], count: number): LessonEntry[] {
  return records.slice(0, count).flatMap((r) => (r.lesson ? [{ lesson: r.lesson, record: r }] : []));
}

export function indexTrends(contexts: TrendContext[]): Map<string, TrendContext> {
  return new Map(contexts.map((t) => [t.id, t]));
}

/** Peak total_score across the run so far (for the hero headline). */
export function peakTotalScore(records: GenerationRecord[]): number {
  return records.reduce(
    (max, r) => Math.max(max, r.score.total_score ?? Math.round((r.score.weighted_total ?? 0) * 100)),
    0,
  );
}
