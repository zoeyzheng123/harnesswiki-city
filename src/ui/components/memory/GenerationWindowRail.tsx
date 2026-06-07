import { motion, useReducedMotion } from "motion/react";
import type { ArchiveStatus, MemoryArchiveEntry } from "../../lib/archive";
import { pts } from "../../lib/format";
import { fadeRise, staggerContainer } from "../../styles/motion";

/** Lit-slot tone per lint state — the archive wall reads state at a glance. */
const WINDOW_TONE: Record<ArchiveStatus, string> = {
  stored: "border-positive/55 bg-positive/12 text-positive",
  review: "border-negative/55 bg-negative/12 text-negative",
  flag: "border-flag/65 bg-flag/14 text-flag",
  refused: "border-flag/70 bg-flag/12 text-flag",
  empty: "border-line/70 bg-bg/40 text-faint",
};

const SHORT_LABEL: Record<ArchiveStatus, string> = {
  stored: "stored",
  review: "review",
  flag: "flag",
  refused: "refused",
  empty: "no lesson",
};

/**
 * The left rail: one illuminated archive window per revealed generation
 * (g1…revealed), a horizontal strip on narrow screens and a vertical stack on
 * desktop. Selecting a window swaps the belief in the center.
 */
export function GenerationWindowRail({
  entries,
  selectedId,
  onSelect,
}: {
  entries: MemoryArchiveEntry[];
  selectedId: string | null;
  onSelect: (entry: MemoryArchiveEntry) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.nav
      aria-label="Generation windows"
      variants={staggerContainer(0.045)}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:pb-0 lg:pr-1"
    >
      {entries.map((entry) => {
        const active = entry.id === selectedId;
        return (
          <motion.button
            key={entry.id}
            type="button"
            variants={fadeRise}
            onClick={() => onSelect(entry)}
            aria-current={active}
            aria-label={`Generation ${entry.generationNumber}, ${
              entry.status === "empty" ? "no lesson" : `score ${entry.score} of 100, ${SHORT_LABEL[entry.status]}`
            }`}
            className={`archive-window relative w-[5.5rem] shrink-0 rounded-lg border px-3 py-2 text-left transition-[opacity,box-shadow] lg:w-full lg:shrink ${
              WINDOW_TONE[entry.status]
            } ${active ? "ring-1 ring-memory" : "opacity-80 hover:opacity-100"}`}
            style={active ? { boxShadow: "0 0 18px -4px var(--color-memory)" } : undefined}
          >
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-sm font-medium tabular-nums text-ink">g{entry.generationNumber}</span>
              <span className="font-mono text-xs tabular-nums opacity-80">
                {entry.status === "empty" ? "—" : pts(entry.score)}
              </span>
            </div>
            <span className="mt-1 block font-mono text-[0.625rem] tracking-wide uppercase">{SHORT_LABEL[entry.status]}</span>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}
