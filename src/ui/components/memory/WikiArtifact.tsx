import type { ReactNode, RefObject } from "react";
import type { MemoryArchiveEntry } from "../../lib/archive";
import { archiveStatusTone } from "../../lib/archive";
import {
  CATEGORY_LABELS,
  TIER_COLOR,
  autoFailLabel,
  elementLabel,
  humanize,
  pts,
  signedDelta,
  signedPts,
  truncate,
  type CategoryKey,
} from "../../lib/format";
import { Badge, ElementLinkChip, MetricLabel, TierBadge } from "../primitives";
import type { InspectTarget } from "./QuickInspectRail";

function categoryLabel(key: string | undefined): string {
  if (!key) return "score";
  return CATEGORY_LABELS[key as CategoryKey] ?? humanize(key);
}

/** A ref'd, flash-highlightable region — the quick-inspect rail scrolls to these. */
function Section({
  innerRef,
  flashed = false,
  label,
  className = "",
  children,
}: {
  innerRef?: RefObject<HTMLDivElement | null>;
  flashed?: boolean;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={innerRef}
      className={`scroll-mt-20 transition-shadow ${
        flashed ? "rounded-lg ring-2 ring-memory ring-offset-2 ring-offset-surface-0" : ""
      } ${className}`}
    >
      {label && <MetricLabel>{label}</MetricLabel>}
      {children}
    </div>
  );
}

/**
 * The selected belief as a large stamped archival folder. Surfaces, in reading
 * order: the score stamp + tier + lint state, the lesson rule as the title, the
 * wikilink chips, then four ref'd regions (evidence/score, harness change,
 * lineage, expected effect) the quick-inspect rail focuses. A refused belief
 * shows the policy flag as the cause and renders its weights as proposed-but-
 * not-applied.
 */
export function WikiArtifact({
  entry,
  highlightedElement,
  onToggleElement,
  onInspectSource,
  flash,
  scoreRef,
  diffRef,
  lessonRef,
  lineageRef,
}: {
  entry: MemoryArchiveEntry;
  highlightedElement: string | null;
  onToggleElement: (key: string | null) => void;
  onInspectSource: () => void;
  flash: InspectTarget | null;
  scoreRef: RefObject<HTMLDivElement | null>;
  diffRef: RefObject<HTMLDivElement | null>;
  lessonRef: RefObject<HTMLDivElement | null>;
  lineageRef: RefObject<HTMLDivElement | null>;
}) {
  const lesson = entry.lesson;
  if (!lesson) {
    return <p className="text-sm text-muted">This generation stored no lesson.</p>;
  }

  const refused = entry.status === "refused";
  const before = entry.record.harness_state_version_before;
  const after = entry.record.harness_state_version_after ?? before;
  const diff = entry.record.harness_diff;
  const lineageText = refused
    ? `held ${before}${diff ? ` · declined → ${diff.to_version}` : ""}`
    : before === after
      ? before
      : `${before} → ${after}`;
  const changed = Object.entries(entry.changedWeights);
  const category = entry.record.score.lowest_scoring_category;
  const autoFails = entry.record.score.auto_fails_triggered ?? [];

  return (
    <article
      className="archive-folder material-surface relative overflow-hidden rounded-xl border border-memory/45 bg-surface-0/80 p-5"
      style={{ boxShadow: "0 0 0 1px color-mix(in oklch, var(--color-memory) 18%, transparent), var(--glow-soft)" }}
      aria-label={`Belief from generation ${entry.generationNumber}`}
    >
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="evidence-stamp rounded-md border px-2 py-1 font-mono text-xs tabular-nums"
            style={{ borderColor: TIER_COLOR[entry.tier], color: TIER_COLOR[entry.tier] }}
          >
            g{entry.generationNumber} · {pts(entry.score)}/100
          </span>
          <TierBadge tier={entry.tier} />
          <Badge tone={archiveStatusTone(entry.status)}>{entry.statusLabel}</Badge>
        </div>
        <button
          type="button"
          onClick={onInspectSource}
          aria-label={`Open generation ${entry.generationNumber} in the full detail drawer`}
          className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-muted transition-colors hover:border-memory hover:text-memory"
        >
          inspect source →
        </button>
      </div>

      <Section innerRef={lessonRef} flashed={flash === "lesson"} className="relative z-10 mt-4 p-1">
        <h3 className="font-display text-xl leading-snug text-ink">{lesson.rule}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{truncate(lesson.observation, 180)}</p>
      </Section>

      <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
        {entry.elementKeys.length > 0 ? (
          entry.elementKeys.map((key) => (
            <ElementLinkChip
              key={key}
              elementKey={key}
              onClick={() => onToggleElement(highlightedElement === key ? null : key)}
              active={highlightedElement === key}
            />
          ))
        ) : (
          <span className="font-mono text-xs text-faint">[[no element tags]]</span>
        )}
      </div>

      <Section innerRef={scoreRef} flashed={flash === "score"} label="Evidence" className="relative z-10 mt-4 p-1">
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-mono text-2xl tabular-nums text-ink">
            {pts(entry.score)}
            <span className="text-sm text-faint">/100</span>
          </span>
          {entry.scoreDelta !== null && entry.scoreDelta !== 0 && (
            <span className={`font-mono text-xs tabular-nums ${entry.scoreDelta > 0 ? "text-positive" : "text-negative"}`}>
              {entry.scoreDelta > 0 ? "▲" : "▼"} {signedPts(entry.scoreDelta)} score
            </span>
          )}
          {category && !refused && <span className="font-mono text-xs text-muted">targets {categoryLabel(category)}</span>}
          {entry.record.score.policy_flag && <Badge tone="flag">policy flag</Badge>}
          {autoFails.map((code) => (
            <span key={code} title={autoFailLabel(code)}>
              <Badge tone="flag">{code}</Badge>
            </span>
          ))}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{lesson.evidence}</p>
      </Section>

      <Section innerRef={diffRef} flashed={flash === "diff"} label="Harness change" className="relative z-10 mt-4 p-1">
        {refused && (
          <p className="mt-0.5 font-mono text-xs text-flag">Diff refused — the meta-agent declined this rewrite.</p>
        )}
        <p className={`mt-0.5 text-sm leading-relaxed ${refused ? "text-flag" : "text-positive"}`}>{lesson.harness_change}</p>
      </Section>

      <Section innerRef={lineageRef} flashed={flash === "lineage"} label="Lineage" className="relative z-10 mt-4 p-1">
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
          <span className={refused ? "text-flag" : "text-ink"}>{lineageText}</span>
          {changed.length > 0 && <span className="text-faint">·</span>}
          {changed.map(([key, delta]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1"
              title={refused ? "proposed, not applied" : "applied weight change"}
            >
              <span className={refused ? "text-faint line-through" : "text-muted"}>{elementLabel(key)}</span>
              <span className={refused ? "text-faint line-through" : delta >= 0 ? "text-positive" : "text-negative"}>
                {signedDelta(delta)}
              </span>
            </span>
          ))}
          {refused && changed.length > 0 && (
            <span className="rounded border border-flag/50 px-1.5 py-0.5 text-[0.625rem] tracking-wide uppercase text-flag">
              proposed
            </span>
          )}
        </div>
      </Section>

      <div className="relative z-10 mt-4">
        <MetricLabel>Expected effect</MetricLabel>
        <p className="mt-0.5 text-sm leading-relaxed text-muted">{lesson.expected_effect}</p>
      </div>
    </article>
  );
}
