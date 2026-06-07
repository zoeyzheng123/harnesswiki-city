import type { GenerationRecord, HarnessState, TrendContext } from "./contracts";
import { INITIAL_HARNESS_STATE, SYNTHETIC_GENERATIONS, TREND_CONTEXTS } from "./synthetic";

/**
 * THE DATA SEAM. This is the only module the app calls for data, and the only
 * file that changes when the real loop lands. Because every view derives from
 * `GenerationRecord[]`, no component changes.
 *
 * Set `VITE_GENERATIONS_URL` to the served canonical `GenerationRecord[]` the
 * real `runLoop` produces (e.g. copy `data/generations.latest.json` into
 * `src/ui/public/` or expose a route). When it's unset — or the fetch is
 * missing, non-OK, malformed, or empty — we fall back to the synthetic arc, so
 * the dashboard always renders something coherent. The fallback warns rather
 * than failing silently.
 */
export async function loadGenerations(): Promise<GenerationRecord[]> {
  const url = import.meta.env.VITE_GENERATIONS_URL;
  if (!url) return SYNTHETIC_GENERATIONS; // no real source wired yet
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`loadGenerations: ${url} → ${res.status}; using synthetic arc`);
      return SYNTHETIC_GENERATIONS;
    }
    const data = (await res.json()) as GenerationRecord[];
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`loadGenerations: ${url} returned no records; using synthetic arc`);
      return SYNTHETIC_GENERATIONS;
    }
    return data;
  } catch (err) {
    console.warn("loadGenerations: fetch failed; using synthetic arc", err);
    return SYNTHETIC_GENERATIONS;
  }
}

export function loadInitialState(): HarnessState {
  return INITIAL_HARNESS_STATE;
}

export function loadTrendContexts(): TrendContext[] {
  return TREND_CONTEXTS;
}
