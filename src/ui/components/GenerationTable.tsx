import { AnimatePresence, motion } from "motion/react";
import type { GenerationRecord, TrendContext } from "../lib/contracts";
import { dec, elementLabel, pct, truncate } from "../lib/format";
import { Badge, Panel } from "./primitives";
import { fadeRise } from "../styles/motion";

function Row({
  record,
  trend,
  selected,
  isNewest,
  onSelect,
}: {
  record: GenerationRecord;
  trend: TrendContext | undefined;
  selected: boolean;
  isNewest: boolean;
  onSelect: (r: GenerationRecord) => void;
}) {
  const flagged = record.score.policy_flag;
  return (
    <motion.li layout variants={fadeRise} exit={{ opacity: 0 }}>
      <button
        type="button"
        onClick={() => onSelect(record)}
        aria-pressed={selected}
        className="grid w-full grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors sm:grid-cols-[2.25rem_1fr_7rem_3.5rem_3.5rem]"
        style={{
          borderColor: selected ? "var(--color-primary)" : "var(--color-line)",
          backgroundColor: selected ? "var(--color-surface-1)" : isNewest ? "var(--color-surface-1)" : "transparent",
        }}
      >
        <span className="flex items-center gap-1.5 font-mono text-sm tabular-nums">
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: flagged ? "var(--color-flag)" : "var(--color-positive)" }}
          />
          <span className="text-muted">g{record.generation_number}</span>
        </span>

        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm text-ink">{truncate(record.concept.hook, 64)}</span>
            {flagged && <Badge tone="flag">flag</Badge>}
          </span>
          <span className="mt-0.5 block truncate font-mono text-xs text-faint sm:hidden">
            {trend?.platform} · {elementLabel(record.concept.format)}
          </span>
        </span>

        <span className="hidden truncate font-mono text-xs text-muted sm:block">
          {elementLabel(record.concept.format)}
        </span>
        <span className="hidden text-right font-mono text-sm text-accent tabular-nums sm:block">
          {dec(record.score.weighted_total)}
        </span>
        <span className="text-right font-mono text-sm text-primary-bright tabular-nums">
          {pct(record.score.predicted_win_prob ?? 0.5)}
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
          <span className="w-16 text-right">format</span>
          <span className="w-12 text-right">wt</span>
          <span className="w-10 text-right">win</span>
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
            {records.map((r, i) => (
              <Row
                key={r.id}
                record={r}
                trend={trends.get(r.trend_context_id)}
                selected={selectedId === r.id}
                isNewest={i === records.length - 1}
                onSelect={onSelect}
              />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </Panel>
  );
}
