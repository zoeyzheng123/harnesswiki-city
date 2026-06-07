export type SensoryCue = "run" | "pause" | "step" | "skip" | "reset";

const STORAGE_KEY = "harnesswiki.sensoryFeedback";

function sensoryEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

function vibrate(cue: SensoryCue): void {
  if (!("vibrate" in navigator)) return;
  const pattern: Record<SensoryCue, VibratePattern> = {
    run: [14, 34, 14],
    pause: 18,
    step: 12,
    skip: [10, 24, 10, 24, 10],
    reset: 28,
  };
  navigator.vibrate(pattern[cue]);
}

function chime(cue: SensoryCue): void {
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const ctx = new AudioContextClass();
  const gain = ctx.createGain();
  const osc = ctx.createOscillator();
  const now = ctx.currentTime;
  const frequency: Record<SensoryCue, number> = {
    run: 660,
    pause: 330,
    step: 520,
    skip: 740,
    reset: 260,
  };

  osc.frequency.value = frequency[cue];
  osc.type = "sine";
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.035, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
  window.setTimeout(() => void ctx.close().catch(() => {}), 180);
}

/**
 * Disabled by default. To test locally, run:
 * localStorage.setItem("harnesswiki.sensoryFeedback", "on")
 */
export function emitSensoryCue(cue: SensoryCue): void {
  if (!sensoryEnabled()) return;
  try {
    vibrate(cue);
    chime(cue);
  } catch {
    // Sensory feedback is decorative; never interrupt the deterministic demo.
  }
}
