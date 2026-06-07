import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { GenerationRecord, TrendContext } from "../lib/contracts";
import { elementLabel, pts, tierFor, TIER_LABELS } from "../lib/format";

type DistrictState = "idle" | "active" | "done" | "rejected";

const SWEEP_MS = 280;

const DISTRICTS = [
  { key: "scout", name: "Trend Scout", role: "reads the signal", color: "var(--color-scout)" },
  { key: "generator", name: "Content Gen", role: "drafts the concept", color: "var(--color-generator)" },
  { key: "critic", name: "Reward Critic", role: "scores out of 100", color: "var(--color-critic)" },
  { key: "meta", name: "Meta-Agent", role: "rewrites the harness", color: "var(--color-meta)" },
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

function StatusDot({ state, color }: { state: DistrictState; color: string }) {
  if (state === "idle") {
    return <span className="size-2.5 rounded-full border border-faint" />;
  }
  const fill = state === "rejected" ? "var(--color-flag)" : color;
  return (
    <span className="relative inline-flex size-2.5 items-center justify-center">
      {state === "active" && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: fill }}
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className="size-2.5 rounded-full" style={{ backgroundColor: fill, boxShadow: `0 0 10px ${fill}` }} />
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

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {DISTRICTS.map((d, i) => {
        let state: DistrictState =
          record === null ? "idle" : i < active ? "done" : i === active ? "active" : "idle";
        if (state === "done" && d.key === "meta" && rejectedMeta) state = "rejected";
        if ((state === "done" || state === "active") && d.key === "critic" && autoFailed) state = "rejected";

        const lit = state === "done" || state === "active" || state === "rejected";
        const accentColor = state === "rejected" ? "var(--color-flag)" : d.color;

        return (
          <motion.div
            key={d.key}
            className="relative overflow-hidden rounded-lg border bg-surface-0/60 p-3"
            style={{
              borderColor: lit ? accentColor : "var(--color-line)",
              boxShadow: state === "active" ? `0 0 0 1px ${accentColor}, 0 8px 30px -12px ${accentColor}` : "none",
            }}
            animate={{ scale: state === "active" ? 1.015 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <span
              className="absolute inset-x-0 top-0 h-0.5"
              style={{ backgroundColor: accentColor, opacity: lit ? 0.9 : 0.15 }}
            />
            <div className="flex items-center justify-between gap-2">
              <span
                className="font-display text-sm font-semibold"
                style={{ color: lit ? accentColor : "var(--color-muted)" }}
              >
                {d.name}
              </span>
              <StatusDot state={state} color={d.color} />
            </div>
            <p className="mt-0.5 text-xs text-muted">{d.role}</p>
            <p
              className="mt-2 truncate font-mono text-xs tabular-nums"
              style={{ color: state === "rejected" ? "var(--color-flag)" : lit ? "var(--color-ink)" : "var(--color-faint)" }}
            >
              {valueFor(d.key, record, trend)}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
