"use client";

import { useCallback, useSyncExternalStore } from "react";

// Retro sound effects, synthesized with WebAudio: no audio files to load. On by default; the toggle
// lives in localStorage ("kk:sound") and every screen's Sound control. Browsers keep audio suspended
// until a gesture, so the first tap or key anywhere unlocks it (see unlockOnGesture).

const KEY = "kk:sound";
const EVENT = "kk:sound";
let ctx: AudioContext | null = null;

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // storage blocked: the toggle still works until reload
  }
  enabled = on;
  window.dispatchEvent(new Event(EVENT));
}

let enabled: boolean | null = null;
const isOn = () => (enabled ??= read());

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !isOn()) return null;
  try {
    ctx ??= new AudioContext();
  } catch {
    return null;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx.state === "running" ? ctx : null;
}

/** Resume the audio context on the first real gesture. Safe to call from every screen. */
export function unlockOnGesture() {
  const unlock = () => {
    try {
      ctx ??= new AudioContext();
      void ctx.resume();
    } catch {
      // no WebAudio: stay silent
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  return unlock;
}

function envelope(a: AudioContext, peak: number, attack: number, decay: number) {
  const g = a.createGain();
  const t = a.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(a.destination);
  return g;
}

function noise(a: AudioContext, seconds: number) {
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * seconds), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buffer;
  return src;
}

function tone(a: AudioContext, type: OscillatorType, from: number, to: number, seconds: number, out: AudioNode) {
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(to, a.currentTime + seconds);
  o.connect(out);
  o.start();
  o.stop(a.currentTime + seconds + 0.05);
}

export const sfx = {
  /** Channel-change snow. */
  static(seconds = 0.35) {
    const a = audio();
    if (!a) return;
    const src = noise(a, seconds);
    const band = a.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2400;
    band.Q.value = 0.6;
    src.connect(band).connect(envelope(a, 0.12, 0.01, seconds));
    src.start();
  },
  /** A key or relay: lock-in, typewriter. */
  clack(gain = 0.12) {
    const a = audio();
    if (!a) return;
    const src = noise(a, 0.04);
    const hp = a.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    src.connect(hp).connect(envelope(a, gain, 0.002, 0.035));
    src.start();
  },
  /** A soft beep: selection moves. */
  blip() {
    const a = audio();
    if (!a) return;
    tone(a, "square", 660, 990, 0.07, envelope(a, 0.05, 0.005, 0.07));
  },
  /** Dread: a death, sabotage exposed, the killer revealed. */
  sting() {
    const a = audio();
    if (!a) return;
    const out = envelope(a, 0.16, 0.02, 1.4);
    const lp = a.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1800, a.currentTime);
    lp.frequency.exponentialRampToValueAtTime(140, a.currentTime + 1.4);
    lp.connect(out);
    tone(a, "sawtooth", 110, 98, 1.4, lp);
    tone(a, "sawtooth", 116.5, 103, 1.4, lp);
  },
  /** The tube warming up. */
  thump() {
    const a = audio();
    if (!a) return;
    tone(a, "sine", 70, 32, 0.45, envelope(a, 0.22, 0.01, 0.45));
  },
};

const subscribe = (fn: () => void) => {
  const fromOtherTab = () => {
    enabled = null;
    fn();
  };
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fromOtherTab);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fromOtherTab);
  };
};

/** The sound toggle's state, shared by every control on the page. */
export function useSound(): [boolean, () => void] {
  const on = useSyncExternalStore(subscribe, isOn, () => true);
  const toggle = useCallback(() => setSound(!isOn()), []);
  return [on, toggle];
}
