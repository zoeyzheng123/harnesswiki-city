import { motion, useReducedMotion } from "motion/react";
import type { MemoryArchiveEntry } from "../../lib/archive";
import {
  CATEGORY_LABELS,
  TIER_LABELS,
  elementLabel,
  humanize,
  signedDelta,
  signedPts,
  truncate,
  type CategoryKey,
} from "../../lib/format";
import { DURATION, EASE_OUT_EXPO } from "../../styles/motion";
import { MetricLabel } from "../primitives";

const MAX_MIDDLE = 4;
const W = 320;

function categoryLabel(key: string | undefined): string {
  if (!key) return "score";
  return CATEGORY_LABELS[key as CategoryKey] ?? humanize(key);
}

type NodeLine = { text: string; emphasis?: boolean; color?: string };

function GraphNode({
  x,
  y,
  w,
  h,
  cx,
  color,
  dashed = false,
  dim = false,
  lines,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  color: string;
  dashed?: boolean;
  dim?: boolean;
  lines: NodeLine[];
}) {
  return (
    <g opacity={dim ? 0.6 : 1}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill="color-mix(in oklch, var(--color-surface-1) 82%, transparent)"
        stroke={color}
        strokeWidth={1}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      <text x={cx} y={y + h / 2} textAnchor="middle" style={{ fontFamily: "var(--font-mono)" }}>
        {lines.map((ln, i) => (
          <tspan
            key={i}
            x={cx}
            dy={i === 0 ? -3 : 15}
            style={{
              fontSize: ln.emphasis ? "12px" : "9px",
              fontWeight: ln.emphasis ? 600 : 400,
              fill: ln.color ?? (ln.emphasis ? "var(--color-ink)" : "var(--color-faint)"),
              textTransform: ln.emphasis ? "none" : "uppercase",
            }}
          >
            {ln.text}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/**
 * A quiet, schematic, fully deterministic belief diagram (no force sim):
 * lesson → the element weights it moved → the score category it lifts. For a
 * refused belief the weight nodes render dashed/dimmed ("proposed") and the
 * outcome reads "held vX — score not chased": the one frame where a belief did
 * not propagate into the harness.
 */
export function BeliefGraph({ entry }: { entry: MemoryArchiveEntry }) {
  const reduce = useReducedMotion();
  const refused = entry.status === "refused";

  const changed = Object.entries(entry.changedWeights)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, MAX_MIDDLE);
  const overflow = Object.keys(entry.changedWeights).length - changed.length;
  const M = changed.length;

  const H = Math.max(150, M * 44 + 44);
  const midY = H / 2;
  const middle = changed.map(([key, delta], i) => ({
    key,
    delta,
    x: 160,
    y: (H * (i + 1)) / (M + 1),
  }));

  const outcomeColor = refused
    ? "var(--color-flag)"
    : entry.status === "review"
      ? "var(--color-negative)"
      : entry.status === "flag"
        ? "var(--color-flag)"
        : "var(--color-positive)";

  const outcomeLine1 = refused
    ? `held ${entry.record.harness_state_version_before}`
    : truncate(categoryLabel(entry.record.score.lowest_scoring_category), 14);
  const outcomeLine2 = refused
    ? "score not chased"
    : entry.scoreDelta === null
      ? `${entry.score} · ${TIER_LABELS[entry.tier]}`
      : `${signedPts(entry.scoreDelta)} · ${TIER_LABELS[entry.tier]}`;

  const edges =
    M === 0
      ? [{ key: "l-r", x1: 100, y1: midY, x2: 220, y2: midY }]
      : middle.flatMap((c, i) => [
          { key: `l-${i}`, x1: 100, y1: midY, x2: c.x - 36, y2: c.y },
          { key: `${i}-r`, x1: c.x + 36, y1: c.y, x2: 220, y2: midY },
        ]);

  return (
    <section aria-label="Belief graph">
      <div className="flex items-center justify-between gap-2">
        <MetricLabel>Belief graph</MetricLabel>
        <span className="font-mono text-[0.625rem] text-faint">lesson → weights → lift</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ height: "auto" }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Belief g${entry.generationNumber}. ${
          M === 0 ? "No weight change." : `${M} element weight${M > 1 ? "s" : ""} ${refused ? "proposed but not applied." : "moved."}`
        } Outcome: ${outcomeLine1}, ${outcomeLine2}.`}
        className="mt-2"
      >
        {edges.map((e, i) => (
          <motion.line
            key={e.key}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            className="belief-edge"
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: DURATION.settle, ease: EASE_OUT_EXPO, delay: reduce ? 0 : 0.12 + i * 0.04 }}
          />
        ))}

        <GraphNode
          x={8}
          y={midY - 26}
          w={92}
          h={52}
          cx={54}
          color="var(--color-memory)"
          lines={[{ text: "belief" }, { text: `g${entry.generationNumber}`, emphasis: true }]}
        />

        {middle.map((node) => (
          <GraphNode
            key={node.key}
            x={node.x - 36}
            y={node.y - 16}
            w={72}
            h={32}
            cx={node.x}
            color="var(--color-memory)"
            dashed={refused}
            dim={refused}
            lines={[
              { text: truncate(elementLabel(node.key), 11) },
              {
                text: signedDelta(node.delta),
                emphasis: true,
                color: refused
                  ? "var(--color-faint)"
                  : node.delta >= 0
                    ? "var(--color-positive)"
                    : "var(--color-negative)",
              },
            ]}
          />
        ))}

        <GraphNode
          x={220}
          y={midY - 30}
          w={92}
          h={60}
          cx={266}
          color={outcomeColor}
          lines={[
            { text: outcomeLine1, emphasis: true, color: outcomeColor },
            { text: outcomeLine2 },
          ]}
        />
      </svg>
      {overflow > 0 && (
        <p className="mt-1 font-mono text-[0.625rem] text-faint">
          +{overflow} more weight change{overflow > 1 ? "s" : ""} not shown
        </p>
      )}
    </section>
  );
}
