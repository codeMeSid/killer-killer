"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FillButton } from "@/components/fill-button";
import { Ground, groundClass } from "@/components/ground";
import { Narrator, sentences, type Beat } from "@/components/narrator";
import { PhaseBar, type Ink } from "@/components/phase-bar";
import { RoomLoading } from "@/components/room-loading";
import { WaitingDots } from "@/components/waiting-dots";
import type { HostView } from "@/lib/engine/view";
import { capitalize, inWords, postJson, useRoom, useWakeLock } from "@/lib/use-room";

const VOICE_KEY = "kk:voice";

/** "2400" → "2 400 m"; anything non-numeric is shown as written. */
export function clockText(value: string | null, unit: string) {
  if (value == null) return "";
  const n = Number(value);
  const shown = Number.isFinite(n) ? n.toLocaleString("en-GB").replace(/,/g, " ") : value;
  return unit ? `${shown} ${unit}` : shown;
}

/** Counts the clock down from `from` to `to` over ~4s in coarse steps, alongside the ground rising. */
function useCountdown(from: string | null, to: string | null) {
  const target = Number(to);
  const start = Number(from);
  const animate = Number.isFinite(target) && Number.isFinite(start) && start !== target;
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const steps = 10;
    let k = 0;
    const t = setInterval(() => {
      k += 1;
      setShown(k >= steps ? null : Math.round(start + ((target - start) * k) / steps));
      if (k >= steps) clearInterval(t);
    }, 400);
    return () => clearInterval(t);
  }, [animate, start, target]);
  return shown == null ? to : String(shown);
}

export function MysteryScreen({ code }: { code: string }) {
  const { view, error, online } = useRoom(code);
  useWakeLock();
  if (!view) return <RoomLoading error={error?.message ?? null} />;
  if (view.role !== "host") return <RoomLoading error={null} />;
  return <Stage view={view} online={online} />;
}

export function Stage({ view, online }: { view: HostView; online: Set<string> }) {
  const [voice, setVoice] = useState(() => {
    try {
      return localStorage.getItem(VOICE_KEY) === "on";
    } catch {
      return false;
    }
  });
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleVoice = useCallback(() => {
    setVoice((v) => {
      try {
        localStorage.setItem(VOICE_KEY, v ? "off" : "on");
      } catch {
        // storage blocked: the toggle still works for this visit
      }
      return !v;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "v" && !e.metaKey && !e.ctrlKey) toggleVoice();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleVoice]);

  const advance = useCallback(async () => {
    if (advancing) return;
    setAdvancing(true);
    setError(null);
    const res = await postJson(`/api/rooms/${view.code}/advance`);
    if (!res.success) setError(res.errorMessage);
    setAdvancing(false);
  }, [advancing, view.code]);

  const clock = useCountdown(view.clock.previous, view.clock.value);
  const clockLabel = clockText(clock, view.clock.unit);
  const step = Math.round((view.clock.step / Math.max(1, view.clock.steps - 1)) * 9);

  const beats = useMemo<Beat[]>(() => {
    const out: Beat[] = [];
    for (const line of view.recap) {
      for (const s of sentences(line.text)) {
        out.push({ text: s, ink: line.kind === "sabotage" || line.kind === "death" ? "red" : "white", flicker: line.kind === "death" });
      }
    }
    if (view.intro) {
      sentences(view.intro).forEach((s, k) =>
        out.push({ text: s, ink: "white", slot: k === 0 ? clockText(view.clock.value, view.clock.unit) : undefined }),
      );
    }
    return out;
  }, [view.recap, view.intro, view.clock.value, view.clock.unit]);

  const choosing = view.phase === "choosing";
  const resolving = view.phase === "resolving";
  const ended = view.status === "ended";
  const ink: Ink = choosing ? "orange" : ended ? "red" : "white";
  const alive = view.players.filter((p) => p.alive);
  const lockedCount = alive.filter((p) => p.locked).length;

  return (
    <div className={`relative flex min-h-svh flex-1 flex-col overflow-hidden ${groundClass(step)}`}>
      <PhaseBar ink={ink}>
        <span className="hidden sm:inline">{view.mystery.title}</span>
        <span className="font-bold">
          <span className="sr-only">{view.clock.label} </span>
          {clockLabel}
        </span>
      </PhaseBar>

      <div className="relative z-10 grid flex-1 content-start gap-12 px-4 pt-10 pb-[calc(var(--ground)+2rem)] sm:px-8 lg:grid-cols-12 lg:pt-16">
        <section className="lg:col-span-8" aria-label="Narration">
          {choosing ? (
            <div className="flex flex-col gap-8 motion-safe:animate-rise">
              <p className="seam-ink text-statement font-bold [--seam-top:var(--orange)]">
                Choose on your phones.
              </p>
              <p className="max-w-3xl text-body text-white">{view.intro}</p>
              <p className="text-body text-blue">
                {capitalize(inWords(lockedCount))} of {inWords(alive.length)} locked in
                <WaitingDots />
              </p>
            </div>
          ) : resolving ? (
            <p className="text-statement font-bold text-white">
              The wind takes your choices
              <WaitingDots />
            </p>
          ) : (
            <Narrator
              key={`${view.status}-${view.clock.value}-${view.recap.length}`}
              beats={beats}
              voice={voice}
              onEnd={advance}
              end={
                <div className="flex max-w-md flex-col gap-4">
                  <p className="text-statement font-bold text-white">
                    {ended ? "The ground is here." : "Everyone ready?"}
                  </p>
                  <FillButton type="button" onClick={advance} disabled={advancing}>
                    {ended ? "Reveal the ending" : "Open the choices"}
                  </FillButton>
                  <p className="text-meta text-blue">or press Enter</p>
                  {error && (
                    <p role="alert" className="text-meta text-red">
                      {error}
                    </p>
                  )}
                </div>
              }
            />
          )}
        </section>

        <aside aria-label="Players" className="lg:col-span-3 lg:col-start-10">
          <ul className="flex flex-col gap-6">
            {view.players.map((p) => {
              const offline = !online.has(p.id);
              const status = !p.alive ? "fallen" : offline ? "offline" : choosing ? (p.locked ? "locked in" : "thinking") : null;
              return (
                <li key={p.id} className="flex flex-col">
                  <span className={`text-ui font-bold ${p.alive ? "text-white" : "text-red line-through"}`}>{p.name}</span>
                  {p.character && <span className="text-meta text-blue">{p.character.name}</span>}
                  {status && (
                    <span
                      className={`text-meta ${
                        status === "locked in" ? "text-green" : status === "thinking" ? "text-blue" : "text-red"
                      }`}
                    >
                      {status}
                      {status === "thinking" && <WaitingDots />}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <Ground />

      <p className="absolute right-4 bottom-3 z-10 text-meta text-blue sm:right-8">
        <button
          type="button"
          onClick={toggleVoice}
          aria-pressed={voice}
          className="underline-offset-4 transition-opacity hover:underline focus-visible:underline focus-visible:outline-none active:opacity-60"
        >
          Voice {voice ? "on" : "off"}
        </button>
        <span aria-hidden> · V</span>
      </p>
    </div>
  );
}
