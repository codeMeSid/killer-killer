"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { sfx } from "@/lib/sfx";

export type Beat = {
  text: string;
  /** red: a death or exposed sabotage. orange: the finale evidence. */
  ink: "white" | "red" | "orange";
  /** Deaths and exposed sabotage hit: a glitch and a sting. */
  hit?: "death" | "sabotage";
  /** The clock, set inline before the sentence (first beat of a new scene). */
  slot?: string;
};

const INK = { white: "text-white", red: "text-red", orange: "text-orange" };
// Narration ends, then the room gets a beat to look up before the choices open by themselves.
const END_PAUSE_MS = 2500;
const AFTER_SPEECH_MS = 600;

/** Splits narration into sentences: the page builds up one at a time. */
export function sentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+(?=\S)/).map((s) => s.trim()).filter(Boolean);
}

// Text only: long enough to read from the sofa, about 190 words a minute.
const holdFor = (text: string) => 1500 + text.split(/\s+/).length * 320;

// ---------------------------------------------------------------- the browser voice

const PREFERRED_VOICES = ["Daniel", "Google UK English Male", "Arthur", "Oliver", "Alex"];
let cachedVoice: SpeechSynthesisVoice | null | undefined;
let speaking: SpeechSynthesisUtterance | null = null; // held so Chrome can't garbage-collect it and drop `onend`

function narratorVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  if (voices.length === 0) return null; // the list loads late; `voiceschanged` clears the cache
  cachedVoice =
    voices.find((v) => /premium|enhanced|natural/i.test(v.name)) ??
    PREFERRED_VOICES.map((n) => voices.find((v) => v.name.includes(n))).find(Boolean) ??
    voices[0];
  return cachedVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  speechSynthesis.addEventListener?.("voiceschanged", () => {
    cachedVoice = undefined;
  });
}

const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
/** Chrome refuses speech until the page has had a click or key press (autoplay rules). */
const activated = () =>
  typeof navigator === "undefined" ||
  ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true);

/** Speaks one beat. `done` runs once when it ends (or fails); `blocked` when autoplay rules refuse it. */
function speak(text: string, done: () => void, blocked: () => void): () => void {
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  speaking = u;
  u.voice = narratorVoice();
  u.rate = 0.95;
  u.pitch = 0.85;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    done();
  };
  u.onend = finish;
  u.onerror = (e) => (e.error === "not-allowed" ? blocked() : finish());
  // Chrome drops a speak() issued in the same tick as cancel(), so only cancel what is live and speak a tick later.
  if (synth.speaking || synth.pending) synth.cancel();
  const start = setTimeout(() => synth.speak(u), 50);
  // Some engines never fire onend; don't let one stuck sentence stall the room.
  const watchdog = setTimeout(finish, holdFor(text) + 8000);
  return () => {
    clearTimeout(start);
    clearTimeout(watchdog);
    u.onend = u.onerror = null;
    if (speaking === u) {
      speaking = null;
      synth.cancel();
    }
  };
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Narration as a page that builds up: each sentence fades in and stays, the current one lit and the
 * earlier ones dimmed, so nobody loses the thread. With `voice` on, each sentence is spoken and the
 * next waits for it; otherwise it holds long enough to read aloud. When the last one has been read,
 * `onEnd` runs by itself after a short pause. Enter skips ahead.
 */
export function Narrator({
  beats,
  voice,
  onEnd,
  end,
  onVoiceBlocked,
}: {
  beats: Beat[];
  voice: boolean;
  onEnd: () => void;
  end: ReactNode;
  /** Autoplay rules refused speech (a refreshed tab with no click yet). */
  onVoiceBlocked?: (blocked: boolean) => void;
}) {
  const [i, setI] = useState(0);
  // A refreshed tab has had no click yet, so speech would be refused: start on text timing.
  const [blocked, setBlocked] = useState(() => !activated());
  const beat = beats[i] as Beat | undefined;
  const text = beat?.text;
  const finished = i >= beats.length;
  const current = useRef<HTMLLIElement>(null);
  const ended = useRef(false);
  const endRef = useRef(onEnd);
  useEffect(() => {
    endRef.current = onEnd;
  });

  const talking = voice && canSpeak() && !blocked;

  // The hit lands as the beat appears.
  useEffect(() => {
    if (beat?.hit === "death") sfx.sting();
    if (beat?.hit === "sabotage") sfx.static(0.25);
    current.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
    // Keyed on the index: a refetch rebuilds the beat objects, and must not replay the hit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // Speak, or hold, then move on by itself. Keyed on the index and text, never the beat object,
  // so a doorbell refetch mid-sentence doesn't restart the voice or the timer.
  useEffect(() => {
    if (text === undefined) return;
    const next = () => setI((x) => x + 1);
    if (!talking) {
      const t = setTimeout(next, holdFor(text));
      return () => clearTimeout(t);
    }
    let pause: ReturnType<typeof setTimeout> | undefined;
    const stop = speak(
      text,
      () => (pause = setTimeout(next, AFTER_SPEECH_MS)),
      () => setBlocked(true),
    );
    return () => {
      stop();
      clearTimeout(pause);
    };
  }, [i, text, talking]);

  // A click or key press unlocks speech; the current sentence is then spoken.
  useEffect(() => {
    onVoiceBlocked?.(blocked);
    if (!blocked) return;
    const unlock = () => setBlocked(false);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [blocked, onVoiceBlocked]);

  // All read: the choices (or the vote, or the ending) open by themselves.
  useEffect(() => {
    if (!finished || ended.current) return;
    const t = setTimeout(() => {
      ended.current = true;
      endRef.current();
    }, END_PAUSE_MS);
    return () => clearTimeout(t);
  }, [finished]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      if (!finished) setI((x) => x + 1);
      else if (!ended.current) {
        ended.current = true;
        endRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished]);

  const shown = beats.slice(0, Math.min(i + 1, beats.length));

  return (
    <div className="flex flex-col gap-10">
      <ol className="flex max-w-4xl flex-col gap-4" aria-live="polite">
        {shown.map((b, k) => {
          const now = k === i;
          return (
            <li
              key={k}
              ref={now ? current : undefined}
              className={`text-ui transition-opacity duration-700 motion-safe:animate-[fade-in_300ms_ease-out_both] ${INK[b.ink]} ${
                now || b.ink !== "white" ? "" : "opacity-60"
              } ${now && b.hit ? "motion-safe:animate-glitch" : ""}`}
            >
              {b.slot && (
                <span className="mr-[0.6em] inline-block border border-blue/40 px-[0.4em] font-pixel text-blue">{b.slot}</span>
              )}
              {b.text}
            </li>
          );
        })}
      </ol>
      {finished && <div className="motion-safe:animate-rise">{end}</div>}
    </div>
  );
}
