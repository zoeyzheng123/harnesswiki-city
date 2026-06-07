import { AnimatePresence, motion } from "motion/react";
import type { GenerationRecord, TrendContext } from "../lib/contracts";
import {
  CATEGORY_LABELS,
  TIER_COLOR,
  TIER_LABELS,
  humanize,
  pts,
  signedPts,
  tierFor,
  truncate,
  type CategoryKey,
} from "../lib/format";
import { Badge, Panel } from "./primitives";
import { fadeRise } from "../styles/motion";

function totalScore(record: GenerationRecord): number {
  return record.score.total_score ?? Math.round((record.score.weighted_total ?? 0) * 100);
}

function categoryLabel(key: string | undefined): string {
  if (!key) return "rubric signal";
  return CATEGORY_LABELS[key as CategoryKey] ?? humanize(key);
}

function signalFor(record: GenerationRecord): { label: string; flagged: boolean } {
  const autoFail = record.score.auto_fails_triggered?.[0];
  if (autoFail) return { label: autoFail, flagged: true };
  if (record.score.policy_flag) return { label: "policy flag", flagged: true };
  return { label: categoryLabel(record.score.lowest_scoring_category), flagged: false };
}

function Row({
  record,
  trend,
  previousTotal,
  selected,
  isNewest,
  onSelect,
}: {
  record: GenerationRecord;
  trend: TrendContext | undefined;
  previousTotal: number | null;
  selected: boolean;
  isNewest: boolean;
  onSelect: (r: GenerationRecord) => void;
}) {
  const score = totalScore(record);
  const tier = tierFor(score);
  const delta = previousTotal === null ? null : score - previousTotal;
  const signal = signalFor(record);
  return (
    <motion.li layout variants={fadeRise} exit={{ opacity: 0 }}>
      <button
        type="button"
        onClick={() => onSelect(record)}
        aria-pressed={selected}
        aria-label={`Generation ${record.generation_number}, "${truncate(record.concept.hook, 48)}". ${signal.label}, score ${pts(score)} of 100, ${TIER_LABELS[tier]} tier${delta === null ? "" : `, ${signedPts(delta)} from prior generation`}. Open details.`}
        className="grid w-full grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors sm:grid-cols-[2.25rem_1fr_7.5rem_4rem_4rem]"
        style={{
          borderColor: selected ? "var(--color-primary)" : "var(--color-line)",
          backgroundColor: selected ? "var(--color-surface-1)" : isNewest ? "var(--color-surface-1)" : "transparent",
        }}
      >
        <span className="flex items-center gap-1.5 font-mono text-sm tabular-nums">
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: signal.flagged ? "var(--color-flag)" : TIER_COLOR[tier] }}
          />
          <span className="text-muted">g{record.generation_number}</span>
        </span>

        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm text-ink">{truncate(record.concept.hook, 64)}</span>
            {signal.flagged && <Badge tone="flag">{signal.label}</Badge>}
          </span>
          <span className="mt-0.5 block truncate font-mono text-xs text-faint sm:hidden">
            {trend?.platform} · {signal.label}
          </span>
        </span>

        <span className={`hidden truncate font-mono text-xs sm:block ${signal.flagged ? "text-flag" : "text-muted"}`}>
          {signal.label}
        </span>
        <span className="hidden text-right font-mono text-sm tabular-nums sm:block" style={{ color: TIER_COLOR[tier] }}>
          {pts(score)}
        </span>
        <span className={`text-right font-mono text-sm tabular-nums ${delta === null ? "text-faint" : delta >= 0 ? "text-positive" : "text-negative"}`}>
          {delta === null ? "base" : signedPts(delta)}
        </span>
      </button>
    </motion.li>
  );
}

export function GenerationTable({
  records,
  trends,
  selectedId,
  onSelect,
}: {
  records: GenerationRecord[];
  trends: Map<string, TrendContext>;
  selectedId: string | null;
  onSelect: (r: GenerationRecord) => void;
}) {
  return (
    <Panel
      title="Generation history"
      subtitle="Every concept, score, and harness change — click any row for receipts"
      action={
        <div className="hidden gap-4 font-mono text-[0.6875rem] tracking-wide text-faint uppercase sm:flex">
          <span className="w-24 text-right">signal</span>
          <span className="w-10 text-right">score</span>
          <span className="w-8 text-right">Δ</span>
        </div>
      }
    >
      {records.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Press <span className="font-mono text-ink">Run loop</span> to generate the first concept.
        </p>
      ) : (
        <motion.ul layout className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {records.map((r, i) => {
              const previous = i > 0 ? records[i - 1] : undefined;
              return (
                <Row
                  key={r.id}
                  record={r}
                  trend={trends.get(r.trend_context_id)}
                  previousTotal={previous ? totalScore(previous) : null}
                  selected={selectedId === r.id}
                  isNewest={i === records.length - 1}
                  onSelect={onSelect}
                />
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </Panel>
  );
}
