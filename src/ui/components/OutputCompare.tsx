import { useRef, useState } from "react";
import type { Ref } from "react";
import type { GenerationRecord } from "../lib/contracts";
import { videoForRecord } from "../lib/videos";
import { dec, elementLabel, pct, signedDelta } from "../lib/format";
import { MetricLabel, Panel } from "./primitives";
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
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="mx-auto w-40 shrink-0 sm:mx-0">
        {video && <VideoPlayer ref={playerRef} src={video.src} hook={record.concept.hook} accent={accent} />}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <MetricLabel>
          Generation {record.generation_number} · {label}
        </MetricLabel>
        <div className="flex flex-wrap gap-1.5">
          <ScoreChip label="wt" value={dec(record.score.weighted_total)} tone="text-accent" />
          <ScoreChip label="win" value={pct(record.score.predicted_win_prob ?? 0.5)} tone="text-primary-bright" />
          <span className="rounded-md border border-line px-2 py-0.5 font-mono text-xs text-muted">
            {elementLabel(record.concept.format)}
          </span>
        </div>
        <p className="text-sm leading-snug text-muted">{record.concept.angle}</p>
      </div>
    </div>
  );
}

function LockedBest({ generationNumber }: { generationNumber: number }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="mx-auto grid aspect-[9/16] w-40 shrink-0 place-items-center rounded-xl border border-dashed border-line bg-surface-1/40 p-3 text-center sm:mx-0">
        <div>
          <svg width="22" height="22" viewBox="0 0 24 24" className="mx-auto text-faint" fill="none" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <p className="mt-2 font-mono text-[0.625rem] text-faint">reach gen {generationNumber}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-2">
        <MetricLabel>Generation {generationNumber} · best</MetricLabel>
        <p className="text-sm leading-snug text-muted">
          The improved cut unlocks as the harness climbs. Run the loop to generation {generationNumber}.
        </p>
      </div>
    </div>
  );
}

export function OutputCompare({
  baseline,
  best,
  bestUnlocked,
}: {
  baseline: GenerationRecord;
  best: GenerationRecord;
  bestUnlocked: boolean;
}) {
  const baseRef = useRef<VideoPlayerHandle>(null);
  const bestRef = useRef<VideoPlayerHandle>(null);
  const [playingBoth, setPlayingBoth] = useState(false);

  const winDelta = (best.score.predicted_win_prob ?? 0.5) - (baseline.score.predicted_win_prob ?? 0.5);
  const wtDelta = best.score.weighted_total - baseline.score.weighted_total;

  const playBoth = () => {
    if (!bestUnlocked) return;
    if (playingBoth) {
      baseRef.current?.pause();
      bestRef.current?.pause();
      setPlayingBoth(false);
    } else {
      baseRef.current?.restart();
      bestRef.current?.restart();
      setPlayingBoth(true);
    }
  };

  return (
    <Panel
      title="Output: baseline vs best"
      subtitle="The short-form video the harness produced, first generation versus last"
    >
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-5">
        <Side record={baseline} label="baseline" accent="var(--color-muted)" playerRef={baseRef} />

        <div className="flex flex-col items-center justify-center gap-3 border-line/70 lg:border-x lg:px-5">
          <button
            type="button"
            onClick={playBoth}
            disabled={!bestUnlocked}
            className="rounded-md px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wide text-ink uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: "var(--color-primary)", boxShadow: "0 6px 22px -8px var(--color-primary)" }}
          >
            {playingBoth ? "Pause both" : "Play both"}
          </button>
          <div className="text-center font-mono text-sm tabular-nums">
            <div className="text-positive">▲ {signedDelta(winDelta)} <span className="text-faint">win</span></div>
            <div className="text-positive">▲ {signedDelta(wtDelta)} <span className="text-faint">wt</span></div>
          </div>
          <p className="max-w-[15rem] text-center text-xs leading-relaxed text-muted">
            Same audience, five generations apart: a sharper hook, the listicle bias gone, win probability up.
          </p>
        </div>

        {bestUnlocked ? (
          <Side record={best} label="best" accent="var(--color-primary)" playerRef={bestRef} />
        ) : (
          <LockedBest generationNumber={best.generation_number} />
        )}
      </div>
    </Panel>
  );
}
