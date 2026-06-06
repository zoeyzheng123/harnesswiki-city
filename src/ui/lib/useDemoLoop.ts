import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The demo-loop state machine — what sells the 3-minute pitch. `step` is the
 * number of generations revealed (0 = pre-run). Play advances one generation
 * per tick; the districts header runs its own pulse sweep on each new step.
 * Replays the synthetic arc now; when the real loop lands it replays real
 * history through the same control (data.ts is the only thing that changes).
 */
const STEP_MS = 1600;

export type DemoLoop = {
  step: number;
  total: number;
  isPlaying: boolean;
  atStart: boolean;
  atEnd: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  stepForward: () => void;
  reset: () => void;
};

export function useDemoLoop(total: number): DemoLoop {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    clearTimer();
  }, [clearTimer]);

  const stepForward = useCallback(() => {
    pause();
    setStep((s) => (s < total ? s + 1 : s));
  }, [pause, total]);

  const reset = useCallback(() => {
    pause();
    setStep(0);
  }, [pause]);

  const play = useCallback(() => {
    setStep((s) => (s >= total ? 0 : s));
    setIsPlaying(true);
  }, [total]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  useEffect(() => {
    if (!isPlaying) return;
    timer.current = window.setInterval(() => {
      setStep((s) => (s < total ? s + 1 : s));
    }, STEP_MS);
    return clearTimer;
  }, [isPlaying, total, clearTimer]);

  useEffect(() => {
    if (step >= total && isPlaying) {
      setIsPlaying(false);
      clearTimer();
    }
  }, [step, total, isPlaying, clearTimer]);

  return {
    step,
    total,
    isPlaying,
    atStart: step === 0,
    atEnd: step >= total,
    play,
    pause,
    toggle,
    stepForward,
    reset,
  };
}
