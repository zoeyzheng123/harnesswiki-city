import { motion, useReducedMotion } from "motion/react";
import type { CurvePoint } from "../lib/selectors";
import { GROWING_AT, VIRAL_AT, TIER_COLOR, pts, signedPts, tierFor } from "../lib/format";
import { CountUp, MetricLabel, TierBadge } from "./primitives";
import { DURATION, EASE_OUT_EXPO, springSoft } from "../styles/motion";

const W = 760;
const H = 300;
const PAD = { t: 28, r: 64, b: 36, l: 40 };
const Y_MIN = 0;
const Y_MAX = 100;

const INNER_W = W - PAD.l - PAD.r;
const INNER_H = H - PAD.t - PAD.b;

function xFor(gen: number, total: number): number {
  const span = Math.max(1, total - 1);
  return PAD.l + ((gen - 1) / span) * INNER_W;
}
function yFor(v: number): number {
  const t = (v - Y_MIN) / (Y_MAX - Y_MIN);
  return PAD.t + (1 - Math.min(1, Math.max(0, t))) * INNER_H;
}
function linePath(coords: { x: number; y: number }[]): string {
  return coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
}

export function HeroCurve({
  points,
  revealed,
  total,
}: {
  points: CurvePoint[];
  revealed: number;
  total: number;
}) {
  const reduce = useReducedMotion();
  const shown = points.slice(0, revealed);
  const latest = shown[shown.length - 1];
  const prev = shown[shown.length - 2];

  const xy = (p: CurvePoint) => ({ x: xFor(p.generation_number, total), y: yFor(p.total_score) });
  const coords = shown.map(xy);

  const score = latest ? latest.total_score : 0;
  const tier = tierFor(score);
  const delta = latest && prev ? latest.total_score - prev.total_score : null;

  const bands: { from: number; to: number; color: string; opacity: number }[] = [
    { from: 0, to: GROWING_AT, color: "var(--color-negative)", opacity: 0.07 },
    { from: GROWING_AT, to: VIRAL_AT, color: "var(--color-critic)", opacity: 0.07 },
    { from: VIRAL_AT, to: 100, color: "var(--color-positive)", opacity: 0.08 },
  ];
  const thresholds = [
    { at: GROWING_AT, label: "growing", color: "var(--color-critic)" },
    { at: VIRAL_AT, label: "viral", color: "var(--color-positive)" },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-line/80 bg-surface-0/70 p-5 backdrop-blur-sm sm:p-6"
      style={{ boxShadow: "var(--glow-soft)" }}
    >
      {/* Headline */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <MetricLabel>Total score</MetricLabel>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-mono text-5xl tabular-nums sm:text-6xl" style={{ color: latest ? TIER_COLOR[tier] : "var(--color-muted)" }}>
              {latest ? <CountUp value={score} format={pts} /> : "—"}
              <span className="text-2xl text-faint">/100</span>
            </span>
            {latest ? (
              <span className="flex flex-col gap-1.5">
                <TierBadge tier={tier} />
                {delta !== null && (
                  <span className={`font-mono text-xs tabular-nums ${delta >= 0 ? "text-positive" : "text-negative"}`}>
                    {delta >= 0 ? "▲" : "▼"} {signedPts(delta)} from gen {prev?.generation_number}
                  </span>
                )}
              </span>
            ) : (
              <span className="font-mono text-sm text-faint">awaiting first generation</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 font-mono text-[0.6875rem] tracking-wide text-muted uppercase">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-positive" /> viral 85+
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-critic" /> growing 65+
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-negative" /> seed jail
          </span>
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full"
        style={{ height: "auto" }}
        role="img"
        aria-label={
          `ACOE total score across ${total} generations. ` +
          (latest
            ? `Generation ${latest.generation_number}: ${pts(score)} of 100, ${tier === "seed_jail" ? "seed jail" : tier} tier.`
            : "Awaiting the first generation.") +
          (shown.some((p) => p.auto_failed)
            ? " One generation auto-failed (AF-01) and its total was overridden to 0."
            : "")
        }
      >
        {/* tier bands */}
        {bands.map((b) => (
          <rect
            key={b.from}
            x={PAD.l}
            width={INNER_W}
            y={yFor(b.to)}
            height={yFor(b.from) - yFor(b.to)}
            fill={b.color}
            opacity={b.opacity}
          />
        ))}

        {/* y labels at 0 / 100 */}
        {[0, 100].map((g) => (
          <text key={g} x={PAD.l - 8} y={yFor(g) + 3} textAnchor="end" className="fill-faint font-mono" style={{ fontSize: 11 }}>
            {g}
          </text>
        ))}

        {/* tier thresholds */}
        {thresholds.map((t) => (
          <g key={t.at}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yFor(t.at)} y2={yFor(t.at)} stroke={t.color} strokeOpacity={0.55} strokeWidth={1} strokeDasharray="2 5" />
            <text x={W - PAD.r + 6} y={yFor(t.at) + 3} className="font-mono" style={{ fontSize: 10, fill: t.color, letterSpacing: "0.04em" }}>
              {t.label}
            </text>
            <text x={W - PAD.r + 6} y={yFor(t.at) + 14} className="fill-faint font-mono" style={{ fontSize: 9 }}>
              {t.at}
            </text>
          </g>
        ))}

        {/* x labels */}
        {Array.from({ length: total }, (_, i) => i + 1).map((g) => (
          <text
            key={g}
            x={xFor(g, total)}
            y={H - PAD.b + 22}
            textAnchor="middle"
            className="fill-faint font-mono"
            style={{ fontSize: 11, opacity: g <= revealed ? 1 : 0.5 }}
          >
            g{g}
          </text>
        ))}

        {/* empty-state ghost arc + hint */}
        {shown.length === 0 && points.length > 0 && (
          <g aria-hidden="true">
            <path d={linePath(points.map(xy))} fill="none" stroke="var(--color-primary-bright)" strokeOpacity={0.16} strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" />
            {points.map((p) => {
              const c = xy(p);
              return <circle key={`ghost-${p.generation_number}`} cx={c.x} cy={c.y} r={2.5} fill="var(--color-primary-bright)" opacity={0.22} />;
            })}
          </g>
        )}
        {shown.length === 0 && (
          <text
            x={PAD.l + INNER_W / 2}
            y={PAD.t + INNER_H / 2}
            textAnchor="middle"
            className="fill-muted font-mono"
            style={{ fontSize: 13, letterSpacing: "0.12em", paintOrder: "stroke", stroke: "var(--color-surface-0)", strokeWidth: 5 }}
          >
            press “Run loop” to watch the score climb
          </text>
        )}

        {/* total_score line */}
        {coords.length > 0 && (
          <motion.path
            d={linePath(coords)}
            fill="none"
            stroke="var(--color-primary-bright)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: DURATION.climb, ease: EASE_OUT_EXPO }}
            style={{ filter: "drop-shadow(0 0 6px oklch(0.64 0.15 242 / 0.55))" }}
          />
        )}

        {/* markers (auto-fail = flag ring + flag fill at the crater) */}
        {shown.map((p, i) => {
          const c = xy(p);
          const isLatest = i === shown.length - 1;
          return (
            <g key={`pt-${p.generation_number}`}>
              {p.auto_failed && <circle cx={c.x} cy={c.y} r={11} fill="none" stroke="var(--color-flag)" strokeWidth={1.5} strokeOpacity={0.85} />}
              <motion.circle
                cx={c.x}
                cy={c.y}
                r={isLatest ? 6 : 4}
                fill={p.auto_failed ? "var(--color-flag)" : "var(--color-primary-bright)"}
                stroke="var(--color-bg)"
                strokeWidth={2}
                initial={isLatest ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={springSoft}
              />
            </g>
          );
        })}

        {/* end-label */}
        {latest && (
          <text
            x={xy(latest).x - 9}
            y={yFor(latest.total_score) - 10}
            textAnchor="end"
            className="font-mono"
            style={{ fontSize: 11, fontWeight: 600, fill: TIER_COLOR[tier], paintOrder: "stroke", stroke: "var(--color-bg)", strokeWidth: 3 }}
          >
            score {pts(latest.total_score)}
          </text>
        )}
      </svg>
    </div>
  );
}
