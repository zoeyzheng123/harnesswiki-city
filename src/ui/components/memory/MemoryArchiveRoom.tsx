import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GenerationRecord, HarnessState } from "../../lib/contracts";
import { archiveStatusTone, memoryArchive, type MemoryArchiveEntry } from "../../lib/archive";
import { TIER_COLOR, pts } from "../../lib/format";
import { DURATION, EASE_OUT_EXPO } from "../../styles/motion";
import { Badge, MetricLabel } from "../primitives";
import { GenerationWindowRail } from "./GenerationWindowRail";
import { WikiArtifact } from "./WikiArtifact";
import { ElementIndex } from "./ElementIndex";
import { BeliefGraph } from "./BeliefGraph";
import { QuickInspectRail, type InspectTarget } from "./QuickInspectRail";

function EmptyArchive() {
  return (
    <div className="grid min-h-[16rem] place-items-center rounded-xl border border-dashed border-line/70 p-8 text-center">
      <div>
        <p className="font-display text-lg text-ink">Archive quiet</p>
        <p className="mt-1 text-sm text-muted">Run the loop to store the first wiki lesson.</p>
      </div>
    </div>
  );
}

function EmptySelected({ entry }: { entry: MemoryArchiveEntry }) {
  return (
    <article className="rounded-xl border border-line/70 bg-surface-0/60 p-5" aria-label={`Generation ${entry.generationNumber}, no lesson`}>
      <span className="evidence-stamp rounded-md border border-line px-2 py-1 font-mono text-xs tabular-nums text-muted">
        g{entry.generationNumber} · {pts(entry.score)}/100
      </span>
      <p className="mt-3 font-display text-lg text-ink">No lesson stored for this generation.</p>
      <p className="mt-1 text-sm text-muted">This generation ran, but the harness distilled no durable belief from it.</p>
    </article>
  );
}

function OlderFolders({
  entries,
  selectedId,
  onSelect,
}: {
  entries: MemoryArchiveEntry[];
  selectedId: string;
  onSelect: (entry: MemoryArchiveEntry) => void;
}) {
  const others = entries.filter((entry) => entry.id !== selectedId).reverse();
  if (others.length === 0) return null;
  return (
    <div className="mt-5">
      <MetricLabel>Earlier beliefs</MetricLabel>
      <ul className="mt-2 flex flex-col gap-2">
        {others.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className="archive-folder flex w-full items-center gap-3 rounded-lg border border-line/70 bg-surface-0/50 px-3 py-2 text-left transition-colors hover:border-memory/50"
            >
              <span
                className="evidence-stamp shrink-0 rounded border px-1.5 py-0.5 font-mono text-[0.625rem] tabular-nums"
                style={{ borderColor: TIER_COLOR[entry.tier], color: TIER_COLOR[entry.tier] }}
              >
                g{entry.generationNumber} · {pts(entry.score)}
              </span>
              <span className="min-w-0 flex-1 truncate font-display text-sm text-ink">{entry.lesson?.rule ?? "—"}</span>
              <Badge tone={archiveStatusTone(entry.status)}>{entry.statusLabel}</Badge>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The Memory Archive room: a full-height drawer that presents living memory as
 * a four-rail archive — generation windows (left), the selected belief as a
 * stamped folder (center), element index + belief graph (right), and a
 * deterministic quick-inspect rail (bottom). Read-only; built entirely from
 * existing contract fields. Mirrors GenerationDetail's focus-trap contract.
 */
export function MemoryArchiveRoom({
  open,
  records,
  step,
  lineage,
  focusRecord,
  onClose,
  onInspectSource,
}: {
  open: boolean;
  records: GenerationRecord[];
  step: number;
  lineage: HarnessState[];
  focusRecord: GenerationRecord | null;
  onClose: () => void;
  onInspectSource: (record: GenerationRecord) => void;
}) {
  const reduce = useReducedMotion();
  const entries = useMemo(() => memoryArchive(records, step), [records, step]);
  const stored = useMemo(() => entries.filter((entry) => entry.status !== "empty"), [entries]);
  const newestStored = stored.length ? stored[stored.length - 1] : undefined;
  const currentVersion = lineage[lineage.length - 1]?.version ?? "v0";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const [flash, setFlash] = useState<InspectTarget | null>(null);

  const selected = entries.find((entry) => entry.id === selectedId) ?? newestStored ?? null;

  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<Element | null>(null);
  const asideRef = useRef<HTMLElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const diffRef = useRef<HTMLDivElement>(null);
  const lessonRef = useRef<HTMLDivElement>(null);
  const lineageRef = useRef<HTMLDivElement>(null);

  // On open (and as the focus target / revealed set changes), select the focused
  // generation's belief, else the newest stored lesson.
  useEffect(() => {
    if (!open) return;
    const focusEntry =
      focusRecord && entries.find((entry) => entry.record.id === focusRecord.id && entry.status !== "empty");
    const next = focusEntry || (stored.length ? stored[stored.length - 1] : undefined);
    setSelectedId(next?.id ?? null);
    setHighlightedElement(null);
    setFlash(null);
  }, [open, focusRecord, entries, stored]);

  // Focus trap + Escape, mirroring GenerationDetail (inert background, Tab wrap,
  // close-button focus on open, restore focus on close).
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;
    const inertTargets = [document.querySelector("header"), document.querySelector("main")].filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
    inertTargets.forEach((el) => el.setAttribute("inert", ""));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.querySelector("[popover]:popover-open")) return;
        onClose();
        return;
      }
      if (e.key === "Tab" && asideRef.current) {
        const focusables = asideRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        const active = document.activeElement;
        if (active instanceof Node && !asideRef.current.contains(active)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
      inertTargets.forEach((el) => el.removeAttribute("inert"));
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [open, onClose]);

  function handleInspect(target: InspectTarget) {
    const el = { score: scoreRef, diff: diffRef, lesson: lessonRef, lineage: lineageRef }[target].current;
    if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    setFlash(target);
    window.setTimeout(() => setFlash((current) => (current === target ? null : current)), 1100);
  }

  function selectEntry(entry: MemoryArchiveEntry) {
    setSelectedId(entry.id);
    setHighlightedElement(null);
  }

  const inspectable = Boolean(selected && selected.status !== "empty");

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 flex justify-end">
          <motion.div
            className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast }}
          />
          <motion.aside
            ref={asideRef}
            role="dialog"
            aria-modal="true"
            aria-label="Memory Archive"
            className="relative z-10 flex h-full w-full max-w-[min(920px,92vw)] flex-col overflow-hidden border-l border-line bg-surface-0"
            style={{ boxShadow: "-30px 0 60px -30px oklch(0 0 0 / 0.7)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: DURATION.settle, ease: EASE_OUT_EXPO }}
          >
            <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-line/70 bg-surface-0/90 p-5 backdrop-blur">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: "var(--color-memory)", boxShadow: "0 0 10px var(--color-memory)" }}
                  />
                  <h2 className="font-display text-xl text-ink">Memory Archive</h2>
                </div>
                <p className="mt-1 text-sm text-muted">Living wiki · lessons, evidence, lint, and harness beliefs</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="accent" className="border-memory/50 bg-memory/10 text-memory">
                    {stored.length} {stored.length === 1 ? "lesson" : "lessons"}
                  </Badge>
                  <Badge tone="neutral">Harness {currentVersion}</Badge>
                  {newestStored && <Badge tone={archiveStatusTone(newestStored.status)}>{newestStored.statusLabel}</Badge>}
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close Memory Archive"
                className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-muted transition-colors hover:border-muted hover:text-ink"
              >
                Esc ✕
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              {selected ? (
                <div className="grid gap-5 lg:grid-cols-[8.5rem_minmax(0,1fr)_15rem]">
                  <GenerationWindowRail entries={entries} selectedId={selected.id} onSelect={selectEntry} />

                  <div className="min-w-0">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selected.id}
                        initial={reduce ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, y: -6 }}
                        transition={{ duration: DURATION.settle, ease: EASE_OUT_EXPO }}
                      >
                        {selected.status === "empty" ? (
                          <EmptySelected entry={selected} />
                        ) : (
                          <WikiArtifact
                            entry={selected}
                            highlightedElement={highlightedElement}
                            onToggleElement={setHighlightedElement}
                            onInspectSource={() => onInspectSource(selected.record)}
                            flash={flash}
                            scoreRef={scoreRef}
                            diffRef={diffRef}
                            lessonRef={lessonRef}
                            lineageRef={lineageRef}
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>
                    <OlderFolders entries={stored} selectedId={selected.id} onSelect={selectEntry} />
                  </div>

                  <aside className="flex flex-col gap-5">
                    {selected.status !== "empty" && (
                      <>
                        <ElementIndex
                          entry={selected}
                          highlightedElement={highlightedElement}
                          onToggleElement={setHighlightedElement}
                        />
                        <BeliefGraph key={`graph-${selected.id}`} entry={selected} />
                      </>
                    )}
                  </aside>
                </div>
              ) : (
                <EmptyArchive />
              )}
            </div>

            <div className="border-t border-line/70 bg-surface-0/90 p-4 backdrop-blur">
              <QuickInspectRail
                onInspect={handleInspect}
                onVideo={() => selected && onInspectSource(selected.record)}
                disabled={!inspectable}
              />
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
