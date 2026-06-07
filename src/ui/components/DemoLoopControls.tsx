import type { DemoLoop } from "../lib/useDemoLoop";
import { emitSensoryCue, type SensoryCue } from "../lib/sensory";

const PRIMARY =
  "rounded-md px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wide uppercase text-ink transition-colors";
const GHOST =
  "rounded-md border border-line px-3 py-1.5 font-mono text-xs font-medium tracking-wide uppercase text-muted transition-colors hover:border-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-muted";
const KBD = "rounded border border-line px-1 py-px text-muted";

export function DemoLoopControls({ loop, version }: { loop: DemoLoop; version: string }) {
  const { step, total, isPlaying, atStart, atEnd, toggle, stepForward, skipToEnd, reset } = loop;
  const playLabel = isPlaying ? "Pause" : atEnd ? "Replay loop" : atStart ? "Run loop" : "Resume";
  const withCue =
    (cue: SensoryCue, action: () => void) =>
    () => {
      emitSensoryCue(cue);
      action();
    };

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
      <div className="flex items-center gap-3 font-mono text-xs tracking-wide text-muted uppercase">
        <span className="tabular-nums">
          gen <span className="text-ink">{step}</span>/{total}
        </span>
        <span className="tabular-nums">
          harness <span className="text-accent">{version}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full"
            style={{
              backgroundColor: isPlaying ? "var(--color-positive)" : "var(--color-faint)",
              boxShadow: isPlaying ? "0 0 8px var(--color-positive)" : "none",
            }}
          />
          {isPlaying ? "live" : "idle"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={withCue(isPlaying ? "pause" : "run", toggle)}
          title={`${isPlaying ? "Pause" : "Play"} (space)`}
          className={PRIMARY}
          style={{ backgroundColor: "var(--color-primary)", boxShadow: "0 6px 22px -8px var(--color-primary)" }}
        >
          {playLabel}
        </button>
        <button type="button" onClick={withCue("step", stepForward)} disabled={atEnd} title="Step forward (right arrow)" className={GHOST}>
          Step
        </button>
        <button type="button" onClick={withCue("skip", skipToEnd)} disabled={atEnd} title="Skip to final generation (End)" className={GHOST}>
          Skip
        </button>
        <button type="button" onClick={withCue("reset", reset)} disabled={atStart} title="Reset (R)" className={GHOST}>
          Reset
        </button>
      </div>
      <p className="hidden w-full justify-end gap-3 font-mono text-[0.625rem] tracking-wide text-faint lg:flex" aria-hidden="true">
        <span>
          <kbd className={KBD}>space</kbd> play
        </span>
        <span>
          <kbd className={KBD}>←</kbd>
          <kbd className={KBD}>→</kbd> step
        </span>
        <span>
          <kbd className={KBD}>end</kbd> skip
        </span>
        <span>
          <kbd className={KBD}>r</kbd> reset
        </span>
      </p>
      <p className="sr-only">
        Keyboard shortcuts: Space plays or pauses; Right and Left arrows step forward and back; End skips to the final
        generation; R resets.
      </p>
    </div>
  );
}
