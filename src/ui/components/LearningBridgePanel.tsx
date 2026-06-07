import type { ReactNode } from "react";
import type { GenerationRecord } from "../lib/contracts";
import {
  CATEGORY_LABELS,
  TIER_COLOR,
  autoFailLabel,
  elementLabel,
  humanize,
  pts,
  signedPts,
  tierFor,
  type CategoryKey,
} from "../lib/format";
import { Badge, DeltaPill, MetricLabel, Panel, TierBadge } from "./primitives";

function totalScore(record: GenerationRecord): number {
  return record.score.total_score ?? Math.round((record.score.weighted_total ?? 0) * 100);
}

function categoryLabel(key: string | undefined): string {
  if (!key) return "Rubric ceiling";
  return CATEGORY_LABELS[key as CategoryKey] ?? humanize(key);
}

function BridgeCell({
  eyebrow,
  title,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 border-l pl-3" style={{ borderColor: accent }}>
      <MetricLabel>{eyebrow}</MetricLabel>
      <h3 className="mt-1 font-display text-base leading-tight text-ink">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}

export function LearningBridgePanel({
  record,
  previous,
}: {
  record: GenerationRecord | null;
  previous: GenerationRecord | null;
}) {
  if (!record) {
    return (
      <Panel
        title="Why the line moved"
        subtitle="Current score, critic signal, harness rewrite, and memory rule"
      >
        <p className="py-3 text-sm text-muted">
          Run the loop to reveal the first score and the critic signal that drives the next harness rewrite.
        </p>
      </Panel>
    );
  }

  const score = totalScore(record);
  const prevScore = previous ? totalScore(previous) : null;
  const delta = prevScore === null ? null : score - prevScore;
  const tier = tierFor(score);
  const autoFail = record.score.auto_fails_triggered?.[0];
  const diff = record.harness_diff;
  const changes = Object.entries(diff?.element_weight_changes ?? {});
  const changePreview = changes.slice(0, 3);
  const extraChangeCount = Math.max(0, changes.length - changePreview.length);

  return (
    <Panel
      title="Why the line moved"
      subtitle={`Generation ${record.generation_number}: score, critic signal, rewrite, memory`}
      action={autoFail ? <Badge tone="flag">{autoFail}</Badge> : <TierBadge tier={tier} />}
    >
      <div className="grid gap-5 md:grid-cols-4">
        <BridgeCell eyebrow="score changed" title={`${pts(score)}/100`} accent={TIER_COLOR[tier]}>
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge tier={tier} />
            {delta === null ? (
              <span className="font-mono text-xs text-faint">baseline</span>
            ) : (
              <span className={`font-mono text-xs tabular-nums ${delta > 0 ? "text-positive" : delta < 0 ? "text-negative" : "text-faint"}`}>
                {delta > 0 ? "▲" : delta < 0 ? "▼" : "·"} {delta === 0 ? "unchanged" : signedPts(delta)} from gen {record.generation_number - 1}
              </span>
            )}
          </div>
        </BridgeCell>

        <BridgeCell
          eyebrow="critic found"
          title={autoFail ? "Hard gate tripped" : categoryLabel(record.score.lowest_scoring_category)}
          accent={autoFail ? "var(--color-flag)" : "var(--color-critic)"}
        >
          {autoFail ? autoFailLabel(autoFail) : record.score.recommended_fix_priority}
        </BridgeCell>

        <BridgeCell
          eyebrow="harness rewrote"
          title={diff ? `${diff.from_version} ${diff.accepted ? "→" : "⊘"} ${diff.to_version}` : "No diff"}
          accent={diff?.accepted ? "var(--color-meta)" : diff ? "var(--color-flag)" : "var(--color-line)"}
        >
          {diff ? (
            <div className="flex flex-wrap gap-1.5">
              {changePreview.map(([key, value]) => (
                <span key={key} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5">
                  <span className="text-xs text-muted">{elementLabel(key)}</span>
                  <DeltaPill value={value} />
                </span>
              ))}
              {extraChangeCount > 0 && <span className="font-mono text-xs text-faint">+{extraChangeCount} more</span>}
              {!diff.accepted && <Badge tone="flag">refused</Badge>}
            </div>
          ) : (
            "The critic did not propose a harness change for this generation."
          )}
        </BridgeCell>

        <BridgeCell
          eyebrow="memory stored"
          title={record.lesson ? `g${record.lesson.generation_number} rule` : "No lesson yet"}
          accent={record.lesson ? "var(--color-positive)" : "var(--color-line)"}
        >
          {record.lesson?.rule ?? "A lesson appears when the loop distills this generation into reusable memory."}
        </BridgeCell>
      </div>
    </Panel>
  );
}
