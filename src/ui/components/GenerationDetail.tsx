import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GenerationRecord, TrendContext } from "../lib/contracts";
import { elementLabel } from "../lib/format";
import { Badge, MetricLabel } from "./primitives";
import { ScoreDimensions } from "./ScoreDimensions";
import { HarnessDiffView } from "./HarnessDiffView";
import { LessonCard } from "./LessonCard";
import { VideoPlayer } from "./VideoPlayer";
import { videoForRecord } from "../lib/videos";
import { DURATION, EASE_OUT_EXPO } from "../styles/motion";

function SectionHeading({ index, children }: { index: string; children: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="font-mono text-xs text-primary-bright tabular-nums">{index}</span>
      <h3 className="font-display text-base text-ink">{children}</h3>
      <span className="h-px flex-1 bg-line/60" />
    </div>
  );
}

export function GenerationDetail({
  record,
  trend,
  onClose,
}: {
  record: GenerationRecord | null;
  trend: TrendContext | undefined;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!record) return;
    restoreRef.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [record, onClose]);

  const video = record ? videoForRecord(record) : undefined;

  return (
    <AnimatePresence>
      {record && (
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
            role="dialog"
            aria-modal="true"
            aria-label={`Generation ${record.generation_number} detail`}
            className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-line bg-surface-0"
            style={{ boxShadow: "-30px 0 60px -30px oklch(0 0 0 / 0.7)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: DURATION.settle, ease: EASE_OUT_EXPO }}
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line/70 bg-surface-0/90 p-5 backdrop-blur">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl text-ink">
                    Generation {record.generation_number}
                  </h2>
                  {record.score.policy_flag && <Badge tone="flag">policy flag</Badge>}
                </div>
                <p className="mt-1 font-mono text-xs text-muted">
                  {trend ? `${trend.platform} · ${trend.audience}` : record.trend_context_id} ·{" "}
                  {record.created_at.slice(11, 16)}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close detail"
                className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-muted transition-colors hover:border-muted hover:text-ink"
              >
                Esc ✕
              </button>
            </header>

            <div className="flex flex-col gap-7 p-5">
              {/* Concept */}
              <section>
                <SectionHeading index="01">Concept</SectionHeading>
                <p className="font-display text-lg leading-snug text-ink">“{record.concept.hook}”</p>
                <p className="mt-2 text-sm text-muted">{record.concept.angle}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="accent">{elementLabel(record.concept.format)}</Badge>
                  {record.concept.elements
                    .filter((e) => e !== record.concept.format)
                    .map((e) => (
                      <Badge key={e} tone="neutral">
                        {elementLabel(e)}
                      </Badge>
                    ))}
                </div>
                {video && (
                  <div className="mt-4">
                    <MetricLabel>Rendered clip</MetricLabel>
                    <div className="mt-1.5 w-36">
                      <VideoPlayer src={video.src} hook={record.concept.hook} accent="var(--color-primary)" />
                    </div>
                  </div>
                )}
                {record.concept.on_screen_text && (
                  <div className="mt-4">
                    <MetricLabel>On-screen text</MetricLabel>
                    <p className="mt-1 font-display text-base text-ink">“{record.concept.on_screen_text}”</p>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-muted">
                  {record.concept.dance_style && (
                    <span>
                      <span className="text-faint">style </span>
                      {record.concept.dance_style}
                    </span>
                  )}
                  {record.concept.audio?.name && (
                    <span>
                      <span className="text-faint">audio </span>
                      {record.concept.audio.name}
                      {record.concept.audio.bpm ? ` · ${record.concept.audio.bpm} bpm` : ""}
                      {record.concept.audio.is_rising_sound ? " · rising" : ""}
                    </span>
                  )}
                  {record.concept.cut_frequency !== undefined && (
                    <span>
                      <span className="text-faint">cuts </span>
                      {record.concept.cut_frequency}/s
                    </span>
                  )}
                </div>
                {record.concept.hashtag_set && record.concept.hashtag_set.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {record.concept.hashtag_set.map((h) => (
                      <span key={h} className="rounded-md bg-surface-1 px-2 py-0.5 font-mono text-xs text-accent">
                        {h}
                      </span>
                    ))}
                  </div>
                )}
                {(record.concept.title || record.concept.description) && (
                  <div className="mt-4 flex flex-col gap-2">
                    {record.concept.title && (
                      <div>
                        <MetricLabel>Title</MetricLabel>
                        <p className="mt-0.5 text-sm text-ink">{record.concept.title}</p>
                      </div>
                    )}
                    {record.concept.description && (
                      <div>
                        <MetricLabel>Description</MetricLabel>
                        <p className="mt-0.5 text-sm text-muted">{record.concept.description}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-4">
                  <MetricLabel>Script</MetricLabel>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{record.concept.script}</p>
                </div>
                <div className="mt-3">
                  <MetricLabel>Visual prompt</MetricLabel>
                  <p className="mt-1 font-mono text-xs leading-relaxed text-faint">
                    {record.concept.visual_prompt}
                  </p>
                </div>
              </section>

              {/* Score */}
              <section>
                <SectionHeading index="02">Reward score</SectionHeading>
                <ScoreDimensions score={record.score} />
              </section>

              {/* Diff */}
              {record.harness_diff && (
                <section>
                  <SectionHeading index="03">Harness rewrite</SectionHeading>
                  <HarnessDiffView diff={record.harness_diff} />
                </section>
              )}

              {/* Lesson */}
              {record.lesson && (
                <section>
                  <SectionHeading index="04">Living-memory lesson</SectionHeading>
                  <LessonCard lesson={record.lesson} />
                </section>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
