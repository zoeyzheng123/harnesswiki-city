import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GenerationRecord, TrendContext } from "../lib/contracts";
import type { LessonEntry } from "../lib/selectors";
import {
  TIER_COLOR,
  TIER_LABELS,
  elementLabel,
  pts,
  signedPts,
  tierFor,
  truncate,
  type Tier,
} from "../lib/format";
import { Badge, MetricLabel, TierBadge } from "./primitives";
import { fadeRise, springSoft } from "../styles/motion";

type CityBuildingKind = "trend" | "concept" | "critic" | "meta" | "memory";
type CityWindowState = "standby" | "active" | "ok" | "review" | "flag" | "refused";
type AttentionBubbleType = "new" | "ok" | "review" | "flag" | "refused";

type BuildingConfig = {
  kind: CityBuildingKind;
  eyebrow: string;
  title: string;
  role: string;
  color: string;
};

type Bubble = {
  type: AttentionBubbleType;
  icon: string;
  label: string;
  ariaLabel: string;
};

type CityNode = BuildingConfig & {
  value: string;
  state: CityWindowState;
  windows: CityWindowState[];
  bubble: Bubble | null;
  disabled: boolean;
};

type WikiArchiveEntry = {
  id: string;
  generationNumber: number;
  score: number;
  tier: Tier;
  lesson: LessonEntry["lesson"];
  record: GenerationRecord;
  elementKeys: string[];
  status: "ok" | "review" | "flag" | "refused";
  statusLabel: string;
};

const SWEEP_MS = 250;
const WINDOW_COUNT = 6;

const BUILDINGS: BuildingConfig[] = [
  {
    kind: "trend",
    eyebrow: "Scout",
    title: "Trend Tower",
    role: "context enters",
    color: "var(--color-scout)",
  },
  {
    kind: "concept",
    eyebrow: "Generator",
    title: "Concept Studio",
    role: "short gets drafted",
    color: "var(--color-generator)",
  },
  {
    kind: "critic",
    eyebrow: "Critic",
    title: "Critic Court",
    role: "score and gates",
    color: "var(--color-critic)",
  },
  {
    kind: "meta",
    eyebrow: "Meta",
    title: "Meta Workshop",
    role: "harness rewrite",
    color: "var(--color-meta)",
  },
  {
    kind: "memory",
    eyebrow: "Memory",
    title: "Memory Archive",
    role: "wiki learns",
    color: "var(--color-memory)",
  },
];

const STATE_LABEL: Record<CityWindowState, string> = {
  standby: "Standby",
  active: "Active",
  ok: "OK",
  review: "Review",
  flag: "Flag",
  refused: "Refused",
};

const STATE_CLASS: Record<CityWindowState, string> = {
  standby: "border-line/70 bg-bg/45 text-faint",
  active: "border-accent bg-accent/15 text-accent",
  ok: "border-positive/60 bg-positive/14 text-positive",
  review: "border-negative/60 bg-negative/12 text-negative",
  flag: "border-flag/70 bg-flag/14 text-flag",
  refused: "border-flag/70 bg-flag/10 text-flag",
};

function totalScore(record: GenerationRecord): number {
  return record.score.total_score ?? Math.round((record.score.weighted_total ?? 0) * 100);
}

function recordStatus(record: GenerationRecord, previous: GenerationRecord | undefined): CityWindowState {
  if ((record.score.auto_fails_triggered?.length ?? 0) > 0 || record.score.policy_flag) return "flag";
  if (record.harness_diff && !record.harness_diff.accepted) return "refused";
  if (previous && totalScore(record) < totalScore(previous)) return "review";
  return "ok";
}

function lessonStatus(record: GenerationRecord, previous: GenerationRecord | undefined): WikiArchiveEntry["status"] {
  if ((record.score.auto_fails_triggered?.length ?? 0) > 0 || record.score.policy_flag) return "flag";
  if (record.harness_diff && !record.harness_diff.accepted) return "refused";
  if (previous && totalScore(record) < totalScore(previous)) return "review";
  return "ok";
}

function uniqueElementKeys(record: GenerationRecord): string[] {
  const fromConcept = record.concept.elements ?? [];
  const fromDiff = Object.keys(record.harness_diff?.element_weight_changes ?? {});
  return Array.from(new Set([...fromDiff, record.concept.format, ...fromConcept])).filter(Boolean);
}

function recentWindowStates(
  records: GenerationRecord[],
  count: number,
  kind: CityBuildingKind,
  activeIndex: number,
): CityWindowState[] {
  const revealed = records.slice(0, count);
  const recent = revealed.slice(-WINDOW_COUNT);
  const padding = Math.max(0, WINDOW_COUNT - recent.length);
  const states: CityWindowState[] = Array.from({ length: padding }, () => "standby");

  recent.forEach((record, i) => {
    const globalIndex = revealed.length - recent.length + i;
    const previous = globalIndex > 0 ? records[globalIndex - 1] : undefined;
    const isCurrent = globalIndex === count - 1;
    if (isCurrent && BUILDINGS[activeIndex]?.kind === kind) {
      states.push("active");
      return;
    }
    if (kind === "critic") {
      const score = totalScore(record);
      states.push(score >= 85 ? "ok" : score >= 65 ? "review" : "flag");
      return;
    }
    if (kind === "meta") {
      states.push(record.harness_diff && !record.harness_diff.accepted ? "refused" : "ok");
      return;
    }
    if (kind === "memory") {
      states.push(record.lesson ? recordStatus(record, previous) : "standby");
      return;
    }
    states.push(recordStatus(record, previous) === "flag" ? "review" : "ok");
  });

  return states;
}

function bubbleFor(
  kind: CityBuildingKind,
  current: GenerationRecord | null,
  previous: GenerationRecord | undefined,
): Bubble | null {
  if (!current) return null;
  const scoreDelta = previous ? totalScore(current) - totalScore(previous) : null;
  const autoFail = current.score.auto_fails_triggered?.[0];

  if (kind === "critic" && (autoFail || current.score.policy_flag)) {
    return {
      type: "flag",
      icon: "!",
      label: autoFail ?? "policy",
      ariaLabel: `Generation ${current.generation_number} Critic Court flagged ${autoFail ?? "policy risk"}. Open score details.`,
    };
  }
  if (kind === "meta" && current.harness_diff && !current.harness_diff.accepted) {
    return {
      type: "refused",
      icon: "↯",
      label: "refused",
      ariaLabel: `Generation ${current.generation_number} Meta Workshop refused the harness diff. Open rewrite details.`,
    };
  }
  if (kind === "memory" && current.lesson && scoreDelta !== null && scoreDelta < 0) {
    return {
      type: "review",
      icon: "?",
      label: "review",
      ariaLabel: `Generation ${current.generation_number} Memory Archive stored a lesson after a score drop. Open lesson details.`,
    };
  }
  if (kind === "memory" && current.lesson) {
    return {
      type: "ok",
      icon: "OK",
      label: "stored",
      ariaLabel: `Generation ${current.generation_number} Memory Archive stored a lesson. Open lesson details.`,
    };
  }
  if (kind === "concept") {
    return {
      type: "new",
      icon: "+",
      label: "new",
      ariaLabel: `Generation ${current.generation_number} Concept Studio produced a new concept. Open concept details.`,
    };
  }
  return null;
}

function valueFor(
  kind: CityBuildingKind,
  current: GenerationRecord | null,
  trend: TrendContext | undefined,
  lessons: LessonEntry[],
): string {
  if (!current) return "standby";
  switch (kind) {
    case "trend":
      return trend ? `${trend.platform} · ${trend.audience}` : current.trend_context_id;
    case "concept":
      return elementLabel(current.concept.format);
    case "critic": {
      const autoFail = current.score.auto_fails_triggered?.[0];
      if (autoFail) return `${autoFail} · score override`;
      const score = totalScore(current);
      return `${pts(score)}/100 · ${TIER_LABELS[tierFor(score)]}`;
    }
    case "meta":
      return current.harness_diff
        ? current.harness_diff.accepted
          ? `${current.harness_diff.from_version} → ${current.harness_diff.to_version}`
          : "diff refused"
        : "no diff";
    case "memory":
      return current.lesson ? `g${current.lesson.generation_number} rule · ${lessons.length} total` : "awaiting lesson";
    default:
      return "standby";
  }
}

function cityNodes({
  records,
  step,
  activeIndex,
  current,
  previous,
  trend,
  lessons,
}: {
  records: GenerationRecord[];
  step: number;
  activeIndex: number;
  current: GenerationRecord | null;
  previous: GenerationRecord | undefined;
  trend: TrendContext | undefined;
  lessons: LessonEntry[];
}): CityNode[] {
  return BUILDINGS.map((building, i) => {
    const stageActive = current !== null && activeIndex === i;
    const baseState = !current
      ? "standby"
      : stageActive
        ? "active"
        : building.kind === "critic" || building.kind === "meta" || building.kind === "memory"
          ? recordStatus(current, previous)
          : "ok";
    const state =
      building.kind === "meta" && current?.harness_diff && !current.harness_diff.accepted
        ? "refused"
        : building.kind === "memory" && !current?.lesson
          ? stageActive
            ? "active"
            : "standby"
          : baseState;

    return {
      ...building,
      value: valueFor(building.kind, current, trend, lessons),
      state,
      windows: recentWindowStates(records, step, building.kind, activeIndex),
      bubble: bubbleFor(building.kind, current, previous),
      disabled: !current,
    };
  });
}

function archiveEntries(records: GenerationRecord[], lessons: LessonEntry[]): WikiArchiveEntry[] {
  const indexById = new Map(records.map((record, index) => [record.id, index]));
  return [...lessons].reverse().map((entry) => {
    const index = indexById.get(entry.record.id) ?? -1;
    const previous = index > 0 ? records[index - 1] : undefined;
    const score = totalScore(entry.record);
    const status = lessonStatus(entry.record, previous);
    const statusLabel =
      status === "flag"
        ? entry.record.score.auto_fails_triggered?.[0] ?? "Policy flag"
        : status === "refused"
          ? "Diff refused"
          : status === "review"
            ? "Review"
            : "Lint OK";
    return {
      id: entry.lesson.id,
      generationNumber: entry.lesson.generation_number,
      score,
      tier: tierFor(score),
      lesson: entry.lesson,
      record: entry.record,
      elementKeys: uniqueElementKeys(entry.record).slice(0, 5),
      status,
      statusLabel,
    };
  });
}

function statusTone(status: WikiArchiveEntry["status"]): "positive" | "negative" | "flag" | "accent" {
  if (status === "ok") return "positive";
  if (status === "review") return "negative";
  if (status === "refused" || status === "flag") return "flag";
  return "accent";
}

function AttentionBubble({
  bubble,
  onClick,
}: {
  bubble: Bubble;
  onClick: () => void;
}) {
  const tone =
    bubble.type === "ok" || bubble.type === "new"
      ? "var(--color-positive)"
      : bubble.type === "review"
        ? "var(--color-negative)"
        : "var(--color-flag)";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={bubble.ariaLabel}
      title={bubble.ariaLabel}
      className="absolute -right-2 -top-3 z-20 flex items-center gap-1 rounded-md border bg-bg px-1.5 py-1 font-mono text-[0.625rem] font-semibold tracking-wide uppercase"
      style={{ borderColor: tone, color: tone, boxShadow: `0 0 16px color-mix(in oklch, ${tone} 38%, transparent)` }}
    >
      <span>{bubble.icon}</span>
      <span className="hidden sm:inline">{bubble.label}</span>
    </button>
  );
}

function StateWindows({
  windows,
  color,
  label,
}: {
  windows: CityWindowState[];
  color: string;
  label: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-1" aria-label={`${label} state windows`}>
      {windows.map((state, i) => (
        <span
          key={`${state}-${i}`}
          className={`h-5 rounded-[0.2rem] border ${STATE_CLASS[state]}`}
          title={`${label} window ${i + 1}: ${STATE_LABEL[state]}`}
          aria-label={`${label} window ${i + 1}: ${STATE_LABEL[state]}`}
          style={state === "active" ? { boxShadow: `0 0 14px ${color}` } : undefined}
        />
      ))}
    </div>
  );
}

function CityBuildingNode({
  node,
  index,
  onOpen,
}: {
  node: CityNode;
  index: number;
  onOpen: () => void;
}) {
  const actionable = !node.disabled;
  return (
    <motion.li
      className="relative min-w-0"
      variants={fadeRise}
      animate={{ y: node.state === "active" ? -3 : 0 }}
      transition={springSoft}
    >
      {node.bubble && <AttentionBubble bubble={node.bubble} onClick={onOpen} />}
      <button
        type="button"
        onClick={onOpen}
        disabled={!actionable}
        aria-label={`${node.title}. ${node.value}. ${STATE_LABEL[node.state]} state.${actionable ? " Open details." : ""}`}
        className="city-building material-surface relative flex min-h-[11.25rem] w-full flex-col overflow-hidden rounded-xl border-t-2 p-3 text-left transition-colors disabled:cursor-default"
        style={{
          borderTopColor:
            node.state === "standby" ? `color-mix(in oklch, ${node.color} 40%, var(--color-line))` : node.color,
          backgroundColor:
            node.state === "standby"
              ? "transparent"
              : `color-mix(in oklch, ${node.color} 7%, transparent)`,
          boxShadow:
            node.state === "active"
              ? `0 0 0 1px ${node.color}, 0 18px 44px -24px ${node.color}`
              : node.state === "standby"
                ? "none"
                : `inset 0 0 0 1px color-mix(in oklch, ${node.color} 14%, transparent)`,
        }}
      >
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <MetricLabel>{node.eyebrow}</MetricLabel>
            <h3 className="mt-1 font-display text-base leading-tight" style={{ color: node.state === "standby" ? "var(--color-muted)" : node.color }}>
              {node.title}
            </h3>
          </div>
          <span
            className="grid size-8 shrink-0 place-items-center rounded-md border font-mono text-xs tabular-nums"
            style={{ borderColor: node.color, color: node.state === "standby" ? "var(--color-faint)" : node.color }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="relative z-10 mt-4 mb-6">
          <StateWindows windows={node.windows} color={node.color} label={node.title} />
        </div>

        <div className="relative z-10 mt-auto pt-4">
          <p className="text-xs text-muted">{node.role}</p>
          <p className="mt-1 truncate font-mono text-xs tabular-nums" style={{ color: node.state === "standby" ? "var(--color-faint)" : "var(--color-ink)" }}>
            {node.value}
          </p>
          <span className={`mt-2 inline-flex rounded-md border px-2 py-0.5 font-mono text-[0.625rem] uppercase ${STATE_CLASS[node.state]}`}>
            {STATE_LABEL[node.state]}
          </span>
        </div>
      </button>
    </motion.li>
  );
}

function SignalTrace({
  activeIndex,
  reduce,
}: {
  activeIndex: number;
  reduce: boolean;
}) {
  const progress = activeIndex < 0 ? 0 : Math.min(1, activeIndex / Math.max(1, BUILDINGS.length - 1));
  return (
    <>
      <span className="absolute left-[10%] right-[10%] top-[9rem] hidden h-px bg-line/70 lg:block" aria-hidden="true" />
      <motion.span
        className="absolute left-[10%] top-[9rem] hidden h-px origin-left lg:block"
        style={{
          background: "linear-gradient(90deg, var(--color-scout), var(--color-generator), var(--color-critic), var(--color-meta), var(--color-memory))",
          boxShadow: "0 0 22px color-mix(in oklch, var(--color-accent) 45%, transparent)",
        }}
        initial={false}
        animate={{ width: `${progress * 80}%` }}
        transition={reduce ? { duration: 0 } : { duration: 0.42, ease: "easeOut" }}
        aria-hidden="true"
      />
    </>
  );
}

function ElementLinkChip({ elementKey }: { elementKey: string }) {
  return (
    <span className="rounded-md border border-memory/45 bg-memory/10 px-2 py-0.5 font-mono text-xs text-memory">
      [[{elementLabel(elementKey)}]]
    </span>
  );
}

function WikiLessonArtifact({
  entry,
  previous,
  onOpen,
}: {
  entry: WikiArchiveEntry;
  previous: GenerationRecord | undefined;
  onOpen: () => void;
}) {
  const delta = previous ? entry.score - totalScore(previous) : null;
  return (
    <motion.article
      layout
      variants={fadeRise}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      className="py-3 first:pt-0 last:pb-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="evidence-stamp rounded-md border px-2 py-1 font-mono text-xs tabular-nums"
              style={{ borderColor: TIER_COLOR[entry.tier], color: TIER_COLOR[entry.tier] }}
            >
              g{entry.generationNumber} · {pts(entry.score)}/100
            </span>
            <TierBadge tier={entry.tier} />
            <Badge tone={statusTone(entry.status)}>{entry.statusLabel}</Badge>
          </div>
          <h3 className="mt-2 font-display text-base leading-snug text-ink">{truncate(entry.lesson.rule, 88)}</h3>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-muted transition-colors hover:border-memory hover:text-memory"
          aria-label={`Open generation ${entry.generationNumber} lesson details`}
        >
          inspect
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {entry.elementKeys.length > 0 ? (
          entry.elementKeys.map((key) => <ElementLinkChip key={key} elementKey={key} />)
        ) : (
          <span className="font-mono text-xs text-faint">[[no element tags]]</span>
        )}
      </div>

      <div className="mt-3 grid gap-2 text-sm leading-relaxed">
        <p className="text-muted">
          <span className="font-mono text-xs tracking-wide text-faint uppercase">Evidence </span>
          {truncate(entry.lesson.evidence, 130)}
        </p>
        <p className={entry.status === "refused" ? "text-flag" : "text-positive"}>
          <span className="font-mono text-xs tracking-wide text-faint uppercase">Harness </span>
          {truncate(entry.lesson.harness_change, 120)}
        </p>
        <p className="text-muted">
          <span className="font-mono text-xs tracking-wide text-faint uppercase">Expected </span>
          {truncate(entry.lesson.expected_effect, 120)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-2 font-mono text-xs">
        <span className={delta === null ? "text-faint" : delta >= 0 ? "text-positive" : "text-negative"}>
          {delta === null ? "baseline" : `${delta > 0 ? "▲" : "▼"} ${signedPts(delta)} score`}
        </span>
        <span className="text-faint">source GenerationRecord</span>
      </div>
    </motion.article>
  );
}

function WikiArchivePanel({
  entries,
  records,
  onSelect,
}: {
  entries: WikiArchiveEntry[];
  records: GenerationRecord[];
  onSelect: (record: GenerationRecord) => void;
}) {
  const newest = entries[0];
  return (
    <section
      className="material-surface relative flex min-h-[22rem] flex-col overflow-hidden rounded-xl border border-memory/50 bg-surface-0/78 p-4"
      style={{ boxShadow: "0 0 0 1px color-mix(in oklch, var(--color-memory) 24%, transparent), var(--glow-soft)" }}
      aria-label="Living Wiki Archive"
    >
      <header className="relative z-10 mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <MetricLabel>Living wiki</MetricLabel>
          <h2 className="mt-1 font-display text-lg text-ink">Memory Archive</h2>
          <p className="mt-1 text-sm text-muted">Lessons, wikilinks, evidence, and lint state.</p>
        </div>
        <Badge tone={entries.length ? "accent" : "neutral"} className={entries.length ? "border-memory/50 bg-memory/10 text-memory" : ""}>
          {entries.length} lessons
        </Badge>
      </header>

      {entries.length === 0 ? (
        <div className="relative z-10 grid flex-1 place-items-center rounded-lg border border-dashed border-line/70 p-5 text-center">
          <div>
            <p className="font-display text-base text-ink">Archive quiet</p>
            <p className="mt-1 text-sm text-muted">Run the loop to store the first wiki lesson.</p>
          </div>
        </div>
      ) : (
        <motion.div layout className="relative z-10 flex flex-col divide-y divide-line/60 overflow-y-auto [overflow-anchor:none] pr-1 lg:max-h-[18.5rem]">
          <AnimatePresence initial={false}>
            {entries.map((entry) => {
              const index = records.findIndex((record) => record.id === entry.record.id);
              const previous = index > 0 ? records[index - 1] : undefined;
              return (
                <WikiLessonArtifact
                  key={entry.id}
                  entry={entry}
                  previous={previous}
                  onOpen={() => onSelect(entry.record)}
                />
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {newest && (
        <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
          <Badge tone={statusTone(newest.status)}>{newest.statusLabel}</Badge>
          <span className="font-mono text-xs text-faint">latest source: g{newest.generationNumber}</span>
        </div>
      )}
    </section>
  );
}

export function CityWikiControlDeck({
  records,
  step,
  current,
  previous,
  trend,
  lessons,
  onSelect,
}: {
  records: GenerationRecord[];
  step: number;
  current: GenerationRecord | null;
  previous: GenerationRecord | null;
  trend: TrendContext | undefined;
  lessons: LessonEntry[];
  onSelect: (record: GenerationRecord) => void;
}) {
  const reduce = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(-1);
  const previousRecord = previous ?? undefined;

  useEffect(() => {
    if (!current) {
      setActiveIndex(-1);
      return;
    }
    if (reduce) {
      setActiveIndex(BUILDINGS.length - 1);
      return;
    }
    setActiveIndex(0);
    const timers = BUILDINGS.map((_, i) =>
      window.setTimeout(() => setActiveIndex(i), i * SWEEP_MS),
    );
    const done = window.setTimeout(() => setActiveIndex(BUILDINGS.length - 1), BUILDINGS.length * SWEEP_MS);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(done);
    };
  }, [current, reduce]);

  const nodes = useMemo(
    () =>
      cityNodes({
        records,
        step,
        activeIndex,
        current,
        previous: previousRecord,
        trend,
        lessons,
      }),
    [activeIndex, current, lessons, previousRecord, records, step, trend],
  );
  const archive = useMemo(() => archiveEntries(records, lessons), [records, lessons]);

  const openCurrent = () => {
    if (current) onSelect(current);
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]" aria-label="City Wiki Control Deck">
      <div
        className="material-surface relative overflow-hidden rounded-xl border border-line/80 bg-surface-0/70 p-4 backdrop-blur-sm"
        style={{ boxShadow: "var(--glow-soft)" }}
      >
        <header className="relative z-10 mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <MetricLabel>City control panel</MetricLabel>
            <h2 className="mt-1 font-display text-lg text-ink">Trend → Concept → Score → Rewrite → Memory</h2>
          </div>
          <Badge tone={current ? "accent" : "neutral"}>
            {current ? `generation ${current.generation_number}` : "standby"}
          </Badge>
        </header>

        <div className="relative">
          <SignalTrace activeIndex={activeIndex} reduce={Boolean(reduce)} />
          <motion.ol
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            className="relative z-10 grid gap-3 md:grid-cols-2 lg:grid-cols-5"
          >
            {nodes.map((node, i) => (
              <CityBuildingNode key={node.kind} node={node} index={i} onOpen={openCurrent} />
            ))}
          </motion.ol>
        </div>
      </div>

      <WikiArchivePanel entries={archive} records={records} onSelect={onSelect} />
    </section>
  );
}
