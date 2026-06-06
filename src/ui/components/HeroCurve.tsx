import { useId } from "react";
import { motion } from "motion/react";
import type { CurvePoint } from "../lib/selectors";
import { dec, pct } from "../lib/format";
import { CountUp, MetricLabel } from "./primitives";
import { DURATION, EASE_OUT_EXPO, springSoft } from "../styles/motion";

const W = 760;
const H = 300;
const PAD = { t: 28, r: 30, b: 36, l: 46 };
const Y_MIN = 0.4;
const Y_MAX = 0.95;
const BASELINE = 0.5;

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
function areaPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return "";
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (!first || !last) return "";
  const base = H - PAD.b;
  return `${linePath(coords)} L ${last.x.toFixed(1)} ${base} L ${first.x.toFixed(1)} ${base} Z`;
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
  const gid = useId().replace(/:/g, "");
  const shown = points.slice(0, revealed);
  const latest = shown[shown.length - 1];

  const win = (p: CurvePoint) => ({ x: xFor(p.generation_number, total), y: yFor(p.predicted_win_prob) });
  const wt = (p: CurvePoint) => ({ x: xFor(p.generation_number, total), y: yFor(p.weighted_total) });
  const winCoords = shown.map(win);
  const wtCoords = shown.map(wt);

  const winLatest = latest ? latest.predicted_win_prob : BASELINE;
  const delta = winLatest - BASELINE;

  const gridLines = [0.5, 0.6, 0.7, 0.8, 0.9];

  return (
    <div className="relative overflow-hidden rounded-xl border border-line/80 bg-surface-0/70 p-5 backdrop-blur-sm sm:p-6" style={{ boxShadow: "var(--glow-soft)" }}>
      {/* Headline readout */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <MetricLabel>Predicted win probability</MetricLabel>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-mono text-5xl text-primary-bright tabular-nums sm:text-6xl">
              {latest ? <CountUp value={winLatest} format={pct} /> : "—"}
            </span>
            {latest ? (
              <span
                className={`font-mono text-sm tabular-nums ${delta >= 0 ? "text-positive" : "text-negative"}`}
              >
                {delta >= 0 ? "▲" : "▼"} {delta >= 0 ? "+" : "−"}
                {Math.abs(delta).toFixed(2).replace(/^0/, "")} vs baseline
              </span>
            ) : (
              <span className="font-mono text-sm text-faint">awaiting first generation</span>
            )}
          </div>
        </div>
        <div className="flex items-end gap-6">
          <div className="text-right">
            <MetricLabel>Weighted total</MetricLabel>
            <div className="mt-1 font-mono text-3xl text-accent tabular-nums">
              {latest ? <CountUp value={latest.weighted_total} format={(n) => dec(n)} /> : "—"}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 font-mono text-[0.6875rem] tracking-wide text-muted uppercase">
              <span className="h-0.5 w-4 rounded-full bg-primary-bright" /> win prob
            </span>
            <span className="flex items-center gap-2 font-mono text-[0.6875rem] tracking-wide text-muted uppercase">
              <span className="h-0.5 w-4 rounded-full bg-accent" /> weighted total
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" style={{ height: "auto" }} role="img" aria-label={`Score curve across ${total} generations. Win probability now ${pct(winLatest)}.`}>
        <defs>
          <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines + y labels */}
        {gridLines.map((g) => (
          <g key={g}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={yFor(g)}
              y2={yFor(g)}
              stroke="var(--color-line)"
              strokeOpacity={g === BASELINE ? 0 : 0.4}
              strokeWidth={1}
            />
            <text x={PAD.l - 10} y={yFor(g) + 3} textAnchor="end" className="fill-faint font-mono" style={{ fontSize: 11 }}>
              {dec(g, 1)}
            </text>
          </g>
        ))}

        {/* baseline at 0.50 */}
        <line x1={PAD.l} x2={W - PAD.r} y1={yFor(BASELINE)} y2={yFor(BASELINE)} stroke="var(--color-muted)" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="2 5" />
        <text x={W - PAD.r} y={yFor(BASELINE) - 7} textAnchor="end" className="fill-muted font-mono" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          BASELINE 0.50
        </text>

        {/* x labels: all generation slots, dim for the future */}
        {Array.from({ length: total }, (_, i) => i + 1).map((g) => (
          <text
            key={g}
            x={xFor(g, total)}
            y={H - PAD.b + 22}
            textAnchor="middle"
            className={g <= revealed ? "fill-muted font-mono" : "fill-faint font-mono"}
            style={{ fontSize: 11, opacity: g <= revealed ? 1 : 0.5 }}
          >
            g{g}
          </text>
        ))}

        {/* empty-state hint */}
        {shown.length === 0 && (
          <text
            x={PAD.l + INNER_W / 2}
            y={PAD.t + INNER_H / 2}
            textAnchor="middle"
            className="fill-faint font-mono"
            style={{ fontSize: 13, letterSpacing: "0.12em" }}
          >
            press “Run loop” to begin the climb
          </text>
        )}

        {/* area under win-prob */}
        {winCoords.length > 0 && <path d={areaPath(winCoords)} fill={`url(#area-${gid})`} />}

        {/* weighted_total line (accent) */}
        {wtCoords.length > 0 && (
          <motion.path
            d={linePath(wtCoords)}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.85}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: DURATION.climb, ease: EASE_OUT_EXPO }}
          />
        )}

        {/* predicted_win_prob line (primary) */}
        {winCoords.length > 0 && (
          <motion.path
            d={linePath(winCoords)}
            fill="none"
            stroke="var(--color-primary-bright)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: DURATION.climb, ease: EASE_OUT_EXPO }}
            style={{ filter: "drop-shadow(0 0 6px oklch(0.64 0.15 242 / 0.55))" }}
          />
        )}

        {/* markers */}
        {shown.map((p, i) => {
          const c = win(p);
          const isLatest = i === shown.length - 1;
          return (
            <g key={`win-${p.generation_number}`}>
              {p.policy_flag && (
                <circle cx={c.x} cy={c.y} r={11} fill="none" stroke="var(--color-flag)" strokeWidth={1.5} strokeOpacity={0.8} />
              )}
              <motion.circle
                cx={c.x}
                cy={c.y}
                r={isLatest ? 6 : 4}
                fill={p.policy_flag ? "var(--color-flag)" : "var(--color-primary-bright)"}
                stroke="var(--color-bg)"
                strokeWidth={2}
                initial={isLatest ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={springSoft}
              />
            </g>
          );
        })}
        {shown.map((p, i) => {
          const c = wt(p);
          const isLatest = i === shown.length - 1;
          return (
            <motion.circle
              key={`wt-${p.generation_number}`}
              cx={c.x}
              cy={c.y}
              r={isLatest ? 4.5 : 3}
              fill="var(--color-accent)"
              stroke="var(--color-bg)"
              strokeWidth={2}
              initial={isLatest ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              transition={springSoft}
            />
          );
        })}
      </svg>
    </div>
  );
}
