import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useCountUp } from "../lib/useCountUp";
import { signedDelta } from "../lib/format";
import { fadeRise } from "../styles/motion";

/** A small mono, tracked label for the telemetry register. */
export function MetricLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase ${className}`}
    >
      {children}
    </span>
  );
}

/** A surface card. Animates in when nested under a motion stagger container. */
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <motion.section
      variants={fadeRise}
      className={`relative rounded-xl border border-line/80 bg-surface-0/70 p-5 backdrop-blur-sm ${className}`}
      style={{ boxShadow: "var(--glow-soft)" }}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h2 className="font-display text-lg text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </motion.section>
  );
}

/** A number that counts up to its value. Render inside motion-aware contexts. */
export function CountUp({
  value,
  format,
  className = "",
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const text = useCountUp(value, format);
  return <motion.span className={className}>{text}</motion.span>;
}

type StatTone = "ink" | "primary" | "accent" | "positive";

const STAT_COLOR: Record<StatTone, string> = {
  ink: "text-ink",
  primary: "text-primary-bright",
  accent: "text-accent",
  positive: "text-positive",
};

/** Label + count-up value, the atomic readout. */
export function Stat({
  label,
  value,
  format,
  tone = "ink",
  size = "lg",
  sub,
}: {
  label: ReactNode;
  value: number;
  format: (n: number) => string;
  tone?: StatTone;
  size?: "lg" | "xl";
  sub?: ReactNode;
}) {
  return (
    <div>
      <MetricLabel>{label}</MetricLabel>
      <div
        className={`mt-1 font-mono tabular-nums ${STAT_COLOR[tone]} ${
          size === "xl" ? "text-4xl" : "text-3xl"
        }`}
      >
        <CountUp value={value} format={format} />
      </div>
      {sub ? <div className="mt-1 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

type BadgeTone = "neutral" | "positive" | "negative" | "flag" | "accent";

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: "border-line text-muted",
  positive: "border-positive/40 bg-positive/10 text-positive",
  negative: "border-negative/40 bg-negative/10 text-negative",
  flag: "border-flag/50 bg-flag/12 text-flag",
  accent: "border-accent/40 bg-accent/10 text-accent",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.6875rem] font-medium tracking-wide uppercase ${BADGE_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** A signed weight delta, colored by direction (sign always present). */
export function DeltaPill({ value, className = "" }: { value: number; className?: string }) {
  const tone = value > 0 ? "text-positive" : value < 0 ? "text-negative" : "text-faint";
  return (
    <span className={`font-mono text-xs tabular-nums ${tone} ${className}`}>
      {signedDelta(value)}
    </span>
  );
}
