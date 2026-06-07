import type { GenerationRecord, Lesson } from "./contracts";
import { tierFor, type Tier } from "./format";

/**
 * Living-memory archive derivations. The Memory Archive room and the control
 * deck's inline wiki panel both read these, so the lesson vocabulary (status,
 * labels, element keys, weight changes) is defined here exactly once and the
 * two surfaces can never drift. Pure functions over `GenerationRecord[]`; no
 * lesson prose is ever parsed for element names (DESIGN.md).
 */

/**
 * The lint state of an archived belief. `refused` wins over `flag` because on
 * the wiki surface the harness *declining the rewrite* is the salient outcome
 * (a generation can be both — a policy_flag that causes the refusal). `empty`
 * marks a revealed generation that produced no lesson, so the window rail can
 * show every step without inventing a belief.
 */
export type ArchiveStatus = "stored" | "review" | "flag" | "refused" | "empty";

export type MemoryArchiveEntry = {
  id: string;
  generationNumber: number;
  score: number; // 0–100 ACOE total
  tier: Tier;
  status: ArchiveStatus;
  statusLabel: string;
  record: GenerationRecord;
  lesson: Lesson | null;
  elementKeys: string[]; // elements this belief touches, changed-first (deduped)
  changedWeights: Record<string, number>; // proposed element-weight deltas (even if refused)
  scoreDelta: number | null; // vs the previous revealed generation
};

/** ACOE total for a record (0–100), tolerant of the legacy weighted_total field. */
export function totalScore(record: GenerationRecord): number {
  return record.score.total_score ?? Math.round((record.score.weighted_total ?? 0) * 100);
}

/**
 * The elements a belief touches: the diff's changed keys first (what the belief
 * actually moved), then the concept format, then the remaining concept tags.
 * Deduped in that order; never parsed from prose.
 */
export function uniqueElementKeys(record: GenerationRecord): string[] {
  const fromDiff = Object.keys(record.harness_diff?.element_weight_changes ?? {});
  const fromConcept = record.concept.elements ?? [];
  return Array.from(new Set([...fromDiff, record.concept.format, ...fromConcept])).filter(Boolean);
}

/** Lint state for a lesson-bearing generation (refused-first; see ArchiveStatus). */
function lessonStatus(
  record: GenerationRecord,
  previous: GenerationRecord | undefined,
): Exclude<ArchiveStatus, "empty"> {
  if (record.harness_diff && !record.harness_diff.accepted) return "refused";
  if ((record.score.auto_fails_triggered?.length ?? 0) > 0 || record.score.policy_flag) return "flag";
  if (previous && totalScore(record) < totalScore(previous)) return "review";
  return "stored";
}

function statusLabelFor(record: GenerationRecord, status: ArchiveStatus): string {
  switch (status) {
    case "refused":
      return "Diff refused";
    case "flag":
      return record.score.auto_fails_triggered?.[0] ?? "Policy flag";
    case "review":
      return "Review";
    case "empty":
      return "No lesson";
    default:
      return "Stored";
  }
}

/** Badge tone for an archive status (shared with the deck's inline panel). */
export function archiveStatusTone(status: ArchiveStatus): "positive" | "negative" | "flag" | "accent" {
  if (status === "stored") return "positive";
  if (status === "review") return "negative";
  if (status === "refused" || status === "flag") return "flag";
  return "accent"; // empty
}

function entryFor(
  record: GenerationRecord,
  previous: GenerationRecord | undefined,
): MemoryArchiveEntry {
  const score = totalScore(record);
  const lesson = record.lesson ?? null;
  const status: ArchiveStatus = lesson ? lessonStatus(record, previous) : "empty";
  return {
    id: lesson?.id ?? `gen-${record.generation_number}`,
    generationNumber: record.generation_number,
    score,
    tier: tierFor(score),
    status,
    statusLabel: statusLabelFor(record, status),
    record,
    lesson,
    elementKeys: uniqueElementKeys(record),
    changedWeights: record.harness_diff?.element_weight_changes ?? {},
    scoreDelta: previous ? score - totalScore(previous) : null,
  };
}

/**
 * Every revealed generation as an archive entry, oldest-first (g1 at the top of
 * the window rail). Lesson-less generations come back as `empty`.
 */
export function memoryArchive(records: GenerationRecord[], step: number): MemoryArchiveEntry[] {
  const revealed = records.slice(0, step);
  return revealed.map((record, i) => entryFor(record, i > 0 ? revealed[i - 1] : undefined));
}

/** Stored-belief entries only (drops `empty`), newest-first — the deck teaser + center stack. */
export function storedLessons(records: GenerationRecord[], step: number): MemoryArchiveEntry[] {
  return memoryArchive(records, step)
    .filter((entry) => entry.status !== "empty")
    .reverse();
}
