import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { GenerationRecord, TrendContext } from "../lib/contracts";
import { elementLabel, pts, tierFor, TIER_LABELS } from "../lib/format";
import { Badge, MetricLabel } from "./primitives";

type DistrictState = "idle" | "active" | "done" | "rejected";

const SWEEP_MS = 280;

const DISTRICTS = [
  { key: "scout", step: "Trend", name: "Trend Scout", role: "reads the signal", color: "var(--color-scout)" },
  { key: "generator", step: "Concept", name: "Content Gen", role: "drafts the concept", color: "var(--color-generator)" },
  { key: "critic", step: "Score", name: "Reward Critic", role: "scores out of 100", color: "var(--color-critic)" },
  { key: "meta", step: "Rewrite", name: "Meta-Agent", role: "updates memory", color: "var(--color-meta)" },
] as const;

function valueFor(key: string, record: GenerationRecord | null, trend: TrendContext | undefined): string {
  if (!record) return "standby";
  switch (key) {
    case "scout":
      return trend ? `${trend.platform} · ${trend.audience}` : "—";
    case "generator":
      return elementLabel(record.concept.format);
    case "critic": {
      const af = record.score.auto_fails_triggered ?? [];
      if (af.length > 0) return `${af[0]} · 0`;
      const total = record.score.total_score ?? Math.round((record.score.weighted_total ?? 0) * 100);
      return `${pts(total)} · ${TIER_LABELS[tierFor(total)]}`;
    }
    case "meta":
      return record.harness_diff?.accepted
        ? `${record.harness_diff.from_version} → ${record.harness_diff.to_version}`
        : "refused diff";
    default:
      return "—";
  }
}

function StatusNode({
  state,
  color,
  index,
  reduce,
}: {
  state: DistrictState;
  color: string;
  index: number;
  reduce: boolean;
}) {
  if (state === "idle") {
    return (
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface-0 text-faint">
        <span className="font-mono text-[0.6875rem] tabular-nums">{index}</span>
      </span>
    );
  }
  const fill = state === "rejected" ? "var(--color-flag)" : color;
  return (
    <span className="relative grid size-9 shrink-0 place-items-center rounded-full border bg-bg" style={{ borderColor: fill }}>
      {state === "active" && !reduce && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: fill }}
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className="relative grid size-7 place-items-center rounded-full font-mono text-[0.6875rem] text-bg tabular-nums" style={{ backgroundColor: fill, boxShadow: `0 0 16px ${fill}` }}>
        {state === "rejected" ? "!" : index}
      </span>
    </span>
  );
}

export function DistrictsHeader({
  record,
  trend,
}: {
  record: GenerationRecord | null;
  trend: TrendContext | undefined;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!record) {
      setActive(-1);
      return;
    }
    if (reduce) {
      setActive(DISTRICTS.length);
      return;
    }
    setActive(0);
    const timers = DISTRICTS.map((_, i) =>
      window.setTimeout(() => setActive(i + 1), (i + 1) * SWEEP_MS),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [record, reduce]);

  const rejectedMeta = record?.harness_diff && !record.harness_diff.accepted;
  const autoFailed = (record?.score.auto_fails_triggered?.length ?? 0) > 0;
  const progressPct =
    !record || active <= 0
      ? 0
      : active >= DISTRICTS.length
        ? 100
        : Math.round((active / (DISTRICTS.length - 1)) * 100);

  return (
    <section
      className="material-surface relative overflow-hidden rounded-xl border border-line/80 bg-surface-0/70 p-4 backdrop-blur-sm"
      style={{ boxShadow: "var(--glow-soft)" }}
      aria-label="Generation signal path"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <MetricLabel>Signal path</MetricLabel>
          <h2 className="mt-1 font-display text-lg text-ink">Trend → Concept → Score → Rewrite</h2>
        </div>
        <Badge tone={record ? "accent" : "neutral"}>
          {record ? `generation ${record.generation_number}` : "standby"}
        </Badge>
      </div>

      <div className="relative">
        <span className="absolute bottom-6 left-[1.125rem] top-6 w-px bg-line/70 md:hidden" aria-hidden="true" />
        <span className="absolute left-[12.5%] right-[12.5%] top-[1.125rem] hidden h-px bg-line/70 md:block" aria-hidden="true" />
        <motion.span
          className="absolute left-[12.5%] top-[1.125rem] hidden h-px origin-left md:block"
          style={{
            background: "linear-gradient(90deg, var(--color-scout), var(--color-generator), var(--color-critic), var(--color-meta))",
            boxShadow: "0 0 20px color-mix(in oklch, var(--color-accent) 45%, transparent)",
          }}
          initial={false}
          animate={{ width: `${progressPct * 0.75}%` }}
          transition={reduce ? { duration: 0 } : { duration: 0.42, ease: "easeOut" }}
          aria-hidden="true"
        />

        <ol className="relative z-10 grid gap-3 md:grid-cols-4">
          {DISTRICTS.map((d, i) => {
            let state: DistrictState =
              record === null ? "idle" : i < active ? "done" : i === active ? "active" : "idle";
            if (state === "done" && d.key === "meta" && rejectedMeta) state = "rejected";
            if ((state === "done" || state === "active") && d.key === "critic" && autoFailed) state = "rejected";

            const lit = state === "done" || state === "active" || state === "rejected";
            const accentColor = state === "rejected" ? "var(--color-flag)" : d.color;

            return (
              <motion.li
                key={d.key}
                className="relative"
                animate={{ y: state === "active" ? -2 : 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.3 }}
              >
                <div
                  className="grid min-h-[6.75rem] grid-cols-[auto_1fr] gap-3 rounded-lg border bg-surface-0/80 p-3 md:grid-cols-1"
                  style={{
                    borderColor: lit ? accentColor : "var(--color-line)",
                    boxShadow: state === "active" ? `0 0 0 1px ${accentColor}, 0 12px 34px -18px ${accentColor}` : "none",
                  }}
                >
                  <StatusNode state={state} color={d.color} index={i + 1} reduce={Boolean(reduce)} />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <MetricLabel className={lit ? "" : "text-faint"}>{d.step}</MetricLabel>
                      <span
                        className="hidden h-px flex-1 md:block"
                        style={{ backgroundColor: lit ? accentColor : "var(--color-line)", opacity: lit ? 0.45 : 0.25 }}
                      />
                    </div>
                    <h3
                      className="mt-1 font-display text-sm font-semibold"
                      style={{ color: lit ? accentColor : "var(--color-muted)" }}
                    >
                      {d.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted">{d.role}</p>
                    <p
                      className="mt-2 truncate font-mono text-xs tabular-nums"
                      style={{ color: state === "rejected" ? "var(--color-flag)" : lit ? "var(--color-ink)" : "var(--color-faint)" }}
                    >
                      {valueFor(d.key, record, trend)}
                    </p>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
