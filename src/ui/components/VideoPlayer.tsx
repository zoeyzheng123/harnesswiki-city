import { forwardRef, useImperativeHandle, useRef, useState } from "react";

/** Imperative handle so a parent can sync two players ("Play both"). */
export type VideoPlayerHandle = {
  play: () => void;
  pause: () => void;
  restart: () => void;
};

/**
 * A 9:16 short-form video player. Real local file, muted by default (so
 * programmatic play is never blocked), with a graceful poster fallback if the
 * file isn't present yet so the UI never shows a broken element.
 */
export const VideoPlayer = forwardRef<
  VideoPlayerHandle,
  { src: string; hook: string; accent?: string; className?: string }
>(function VideoPlayer({ src, hook, accent = "var(--color-primary)", className = "" }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [errored, setErrored] = useState(false);
  const [progress, setProgress] = useState(0);

  useImperativeHandle(
    ref,
    () => ({
      play: () => void videoRef.current?.play().catch(() => {}),
      pause: () => videoRef.current?.pause(),
      restart: () => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = 0;
        void v.play().catch(() => {});
      },
    }),
    [],
  );

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };

  return (
    <div
      className={`relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-line bg-surface-1 ${className}`}
      style={{ boxShadow: "var(--glow-soft)" }}
    >
      {!errored && (
        <video
          ref={videoRef}
          src={src}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-contain"
          onError={() => setErrored(true)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setProgress(v.duration ? v.currentTime / v.duration : 0);
          }}
        />
      )}

      {/* Poster fallback (file missing): reads as an intentional frame, not an error. */}
      {errored && (
        <div
          className="absolute inset-0 flex flex-col justify-end p-4"
          style={{
            background: `radial-gradient(130% 80% at 50% 0%, color-mix(in oklch, ${accent} 28%, transparent), transparent 60%), var(--color-surface-1)`,
          }}
        >
          <p
            className="font-display text-base leading-snug font-semibold text-ink"
            style={{ textShadow: "0 1px 10px oklch(0 0 0 / 0.65)" }}
          >
            {hook}
          </p>
          <p className="mt-2 font-mono text-[0.625rem] text-faint">video pending · {src}</p>
        </div>
      )}

      {/* Full-area play/pause (keyboard-focusable) */}
      {!errored && (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause video" : "Play video"}
          className="absolute inset-0 z-10"
        />
      )}

      {/* Center play glyph when paused */}
      {!errored && !playing && (
        <span className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-bg/55 ring-1 ring-white/15 backdrop-blur-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-ink)" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      )}

      {/* Progress + mute */}
      {!errored && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 px-3 pt-6 pb-2.5"
          style={{ background: "linear-gradient(to top, oklch(0.13 0.018 250 / 0.85), transparent)" }}
        >
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: accent }} />
          </div>
          <button
            type="button"
            onClick={() => {
              const v = videoRef.current;
              const next = !muted;
              setMuted(next);
              if (v) v.muted = next;
            }}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className="text-ink/80 transition-colors hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9v6h3l4 4V5L7 9H4z" fill="currentColor" />
              {muted ? (
                <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              ) : (
                <path d="M15.5 9.5a4 4 0 010 5M18 7.5a7 7 0 010 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              )}
            </svg>
          </button>
        </div>
      )}
    </div>
  );
});
