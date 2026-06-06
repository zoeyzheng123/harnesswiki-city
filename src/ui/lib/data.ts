import type { GenerationRecord, HarnessState, TrendContext } from "./contracts";
import { INITIAL_HARNESS_STATE, SYNTHETIC_GENERATIONS, TREND_CONTEXTS } from "./synthetic";

/**
 * THE DATA SEAM. This is the only module the app calls for data, and the only
 * file that changes when the real loop lands. Today it returns the synthetic
 * arc; later, `loadGenerations` swaps to reading the canonical `GenerationRecord[]`
 * the real `runLoop` produces — e.g.
 *
 *   const res = await fetch(import.meta.env.VITE_GENERATIONS_URL ?? "/generations.json");
 *   return (await res.json()) as GenerationRecord[];
 *
 * or a static import of `data/generations.latest.json` the loop writes. Because
 * every view derives from `GenerationRecord[]`, no component changes.
 */
export async function loadGenerations(): Promise<GenerationRecord[]> {
  return SYNTHETIC_GENERATIONS;
}

export function loadInitialState(): HarnessState {
  return INITIAL_HARNESS_STATE;
}

export function loadTrendContexts(): TrendContext[] {
  return TREND_CONTEXTS;
}
