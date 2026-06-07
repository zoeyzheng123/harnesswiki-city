import { useRef, useState } from "react";
import type { Ref } from "react";
import type { GenerationRecord } from "../lib/contracts";
import { videoForRecord } from "../lib/videos";
import { elementLabel, pts, signedPts, tierFor } from "../lib/format";
import { MetricLabel, Panel, TierBadge } from "./primitives";
import { VideoPlayer, type VideoPlayerHandle } from "./VideoPlayer";

function ScoreChip({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <span className="rounded-md border border-line bg-surface-1/50 px-2 py-0.5 font-mono text-xs">
      <span className="text-faint">{label} </span>
      <span className={`tabular-nums ${tone}`}>{value}</span>
    </span>
  );
}

function Side({
  record,
  label,
  accent,
  playerRef,
}: {
  record: GenerationRecord;
  label: string;
  accent: string;
  playerRef: Ref<VideoPlayerHandle>;
}) {
  const video = videoForRecord(record);
  const total = record.score.total_score ?? Math.round((record.score.weighted_total ?? 0) * 100);
  const tier = tierFor(total);
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="mx-auto w-40 shrink-0 sm:mx-0">
        {video && <VideoPlayer ref={playerRef} src={video.src} hook={record.concept.hook} accent={accent} />}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <MetricLabel>
          Generation {record.generation_number} · {label}
        </MetricLabel>
        <div className="flex flex-wrap items-center gap-1.5">
          <ScoreChip label="score" value={pts(total)} tone="text-ink" />
          <TierBadge tier={tier} />
          <span className="rounded-md border border-line px-2 py-0.5 font-mono text-xs text-muted">
            {elementLabel(record.concept.format)}
          </span>
        </div>
        <p className="text-sm leading-snug text-muted">{record.concept.angle}</p>
      </div>
    </div>
  );
}

function WaitingComparison({ nextGeneration }: { nextGeneration: number }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="mx-auto grid aspect-[9/16] w-40 shrink-0 place-items-center rounded-xl border border-dashed border-line bg-surface-1/40 p-3 text-center sm:mx-0">
        <div>
          <svg width="22" height="22" viewBox="0 0 24 24" className="mx-auto text-faint" fill="none" aria-hidden="true">
            <path d="M4 12h16M14 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="mt-2 font-mono text-[0.625rem] text-faint">step to gen {nextGeneration}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-2">
        <MetricLabel>Current comparison pending</MetricLabel>
        <p className="text-sm leading-snug text-muted">
          The first cut establishes the baseline. Step once to compare the next output against it.
        </p>
      </div>
    </div>
  );
}

export function OutputCompare({
  baseline,
  current,
  best,
  bestUnlocked,
}: {
  baseline: GenerationRecord;
  current: GenerationRecord;
  best: GenerationRecord;
  bestUnlocked: boolean;
}) {
  const baseRef = useRef<VideoPlayerHandle>(null);
  const comparisonRef = useRef<VideoPlayerHandle>(null);
  const [playingBoth, setPlayingBoth] = useState(false);

  const comparison = bestUnlocked ? best : current;
  const comparisonLabel = bestUnlocked ? "best" : "current";
  const sameAsBaseline = comparison.id === baseline.id;
  const baseTotal = baseline.score.total_score ?? Math.round((baseline.score.weighted_total ?? 0) * 100);
  const comparisonTotal = comparison.score.total_score ?? Math.round((comparison.score.weighted_total ?? 0) * 100);
  const scoreDelta = comparisonTotal - baseTotal;
  const baseTier = tierFor(baseTotal);
  const comparisonTier = tierFor(comparisonTotal);
  const canPlayBoth = !sameAsBaseline;

  const playBoth = () => {
    if (!canPlayBoth) return;
    if (playingBoth) {
      baseRef.current?.pause();
      comparisonRef.current?.pause();
      setPlayingBoth(false);
    } else {
      baseRef.current?.restart();
      comparisonRef.current?.restart();
      setPlayingBoth(true);
    }
  };

  return (
    <Panel
      title={
        bestUnlocked
          ? "Output: baseline vs best"
          : sameAsBaseline
            ? "Output: first generated cut"
            : "Output: baseline vs current"
      }
      subtitle={
        bestUnlocked
          ? "The short-form video the harness produced, first generation versus last"
          : "The active generation compared with the original baseline"
      }
    >
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-5">
        <Side record={baseline} label="baseline" accent="var(--color-muted)" playerRef={baseRef} />

        <div className="flex flex-col items-center justify-center gap-3 border-line/70 lg:border-x lg:px-5">
          <button
            type="button"
            onClick={playBoth}
            disabled={!canPlayBoth}
            className="rounded-md px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wide text-ink uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: "var(--color-primary)", boxShadow: "0 6px 22px -8px var(--color-primary)" }}
          >
            {playingBoth ? "Pause both" : "Play both"}
          </button>
          <div className="flex flex-col items-center gap-2 font-mono text-sm tabular-nums">
            <div className={scoreDelta > 0 ? "text-positive" : scoreDelta < 0 ? "text-negative" : "text-faint"}>
              {scoreDelta === 0 ? "baseline" : `${scoreDelta > 0 ? "▲" : "▼"} ${signedPts(scoreDelta)}`}{" "}
              <span className="text-faint">score</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TierBadge tier={baseTier} />
              <span className="text-faint">→</span>
              <TierBadge tier={comparisonTier} />
            </div>
          </div>
          <p className="max-w-[15rem] text-center text-xs leading-relaxed text-muted">
            {bestUnlocked
              ? "Same sound, five generations apart: a peak-motion open, a seamless loop, and a question worth arguing about."
              : sameAsBaseline
                ? "The baseline is the reference cut. The next generation shows whether the first rewrite paid off."
                : "Current output is the receipt for the latest rewrite, before the final best cut is unlocked."}
          </p>
        </div>

        {sameAsBaseline ? (
          <WaitingComparison nextGeneration={baseline.generation_number + 1} />
        ) : bestUnlocked ? (
          <Side record={best} label={comparisonLabel} accent="var(--color-primary)" playerRef={comparisonRef} />
        ) : (
          <Side record={current} label={comparisonLabel} accent="var(--color-primary)" playerRef={comparisonRef} />
        )}
      </div>
    </Panel>
  );
}
