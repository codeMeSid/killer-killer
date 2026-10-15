"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

export type Beat = {
  text: string;
  ink: "white" | "red";
  /** Deaths stutter in once. */
  flicker?: boolean;
  /** The clock, set inline before the sentence as a word-slot (first beat of a round). */
  slot?: string;
};

const TYPE_MS = 34;
const SEAM_TOP = { white: "[--seam-top:var(--white)]", red: "[--seam-top:var(--red)]" };

/** Splits narration into sentences: the TV shows one at a time. */
export function sentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+(?=\S)/).map((s) => s.trim()).filter(Boolean);
}

// Hold long enough to read from the couch: ~230 words a minute, never under 2.4s.
const holdFor = (text: string) => Math.max(2400, 1200 + text.split(/\s+/).length * 260);

const PREFERRED_VOICES = ["Daniel", "Google UK English Male", "Arthur", "Fred", "Alex"];
function narratorVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  for (const name of PREFERRED_VOICES) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en")) ?? null;
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Plays beats one sentence at a time at poster scale: typewriter, hold, next. The previous
 * sentence dims to blue above. With `voice` on, each beat is also spoken and the next waits for it.
 * Enter: finish typing → next beat → (at the end) `onEnd`.
 */
export function Narrator({ beats, voice, onEnd, end }: { beats: Beat[]; voice: boolean; onEnd: () => void; end: ReactNode }) {
  const [i, setI] = useState(0);
  const [chars, setChars] = useState(0);
  const [spoken, setSpoken] = useState(false);
  const [instant] = useState(reducedMotion);
  const beat = beats[i] as Beat | undefined;
  const typed = !beat || instant || chars >= beat.text.length;
  const finished = i >= beats.length;

  const next = useCallback(() => {
    setI((x) => x + 1);
    setChars(0);
    setSpoken(false);
  }, []);

  // Typewriter.
  useEffect(() => {
    if (typed) return;
    const t = setInterval(() => setChars((c) => c + 1), TYPE_MS);
    return () => clearInterval(t);
  }, [typed, i]);

  // Voice: speak the whole beat as it starts typing.
  useEffect(() => {
    if (!voice || !beat || typeof speechSynthesis === "undefined") return;
    const u = new SpeechSynthesisUtterance(beat.text);
    u.voice = narratorVoice();
    u.rate = 0.85;
    u.pitch = 0.6;
    u.onend = u.onerror = () => setSpoken(true);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    return () => {
      u.onend = u.onerror = null;
      speechSynthesis.cancel();
    };
  }, [voice, beat]);

  // Hold, then move on by itself.
  useEffect(() => {
    if (!beat || !typed || (voice && !spoken)) return;
    const t = setTimeout(next, voice ? 700 : holdFor(beat.text));
    return () => clearTimeout(t);
  }, [beat, typed, voice, spoken, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      if (finished) onEnd();
      else if (!typed) setChars(beat!.text.length);
      else next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, typed, beat, next, onEnd]);

  const previous = i > 0 ? beats[Math.min(i, beats.length) - 1] : null;

  return (
    <div className="flex flex-col gap-8">
      <p aria-hidden className="min-h-[3lh] max-w-3xl text-body text-blue transition-opacity">
        {previous && !finished ? previous.text : ""}
      </p>
      {beat ? (
        <p
          key={i}
          aria-live="polite"
          className={`seam-ink max-w-4xl text-statement font-bold ${SEAM_TOP[beat.ink]} ${beat.flicker ? "motion-safe:animate-flicker-in" : ""}`}
        >
          {beat.slot && (
            <span className="mr-[0.4em] inline-block border border-blue/40 px-[0.3em] text-blue [-webkit-text-fill-color:var(--blue)]">
              {beat.slot}
            </span>
          )}
          {instant ? beat.text : beat.text.slice(0, chars)}
          {!typed && <span aria-hidden className="ml-[0.05em] inline-block w-[0.5em] bg-white motion-safe:animate-caret">&nbsp;</span>}
        </p>
      ) : (
        <div className="motion-safe:animate-rise">{end}</div>
      )}
    </div>
  );
}
