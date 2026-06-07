import type { GenerationRecord } from "./contracts";

/**
 * The video seam. Only generation 1 (baseline) and generation 5 (best) have
 * rendered short-form clips for the demo; they live in src/ui/public/videos/
 * and Vite serves them at /videos/*. Keyed by generation_number.
 *
 * When the real loop renders video, point these at the record's render output
 * (e.g. `post_url`) here — this is the one place that changes.
 */
export type VideoMeta = { src: string; label: string };

export const GENERATION_VIDEOS: Record<number, VideoMeta> = {
  1: { src: "/videos/gen-1.mp4", label: "Baseline" },
  5: { src: "/videos/gen-5.mp4", label: "Best" },
};

export function videoForRecord(
  record: Pick<GenerationRecord, "generation_number">,
): VideoMeta | undefined {
  return GENERATION_VIDEOS[record.generation_number];
}
