"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { FillButton } from "@/components/fill-button";
import { JoinQr } from "@/components/join-qr";
import { PhaseBar } from "@/components/phase-bar";
import { RoomLoading } from "@/components/room-loading";
import { WaitingDots } from "@/components/waiting-dots";
import type { HostView, PlayerView, ViewPlayer } from "@/lib/engine/view";
import { capitalize, DIFFICULTY_INK, formatCode, inWords, postJson, useRoom, useWakeLock } from "@/lib/use-room";

const noSubscribe = () => () => {};

const COLS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
};

export function LobbyScreen({ code }: { code: string }) {
  const { view, error, online } = useRoom(code);
  useWakeLock();
  if (!view) return <RoomLoading error={error?.message ?? null} />;
  return view.role === "host" ? <HostLobby view={view} online={online} /> : <PlayerLobby view={view} online={online} />;
}

/** The plane's manifest as a read-only track: one segment per seat, filled as people board. */
function Manifest({ players, capacity, online, you }: { players: ViewPlayer[]; capacity: number; online: Set<string>; you?: string }) {
  const seats = Array.from({ length: capacity }, (_, i) => players[i] ?? null);
  return (
    <ol aria-label="Manifest" className={`grid grid-cols-2 gap-x-4 gap-y-8 ${COLS[capacity] ?? "sm:grid-cols-4"}`}>
      {seats.map((p, i) => (
        <li key={p?.id ?? `empty-${i}`} className="flex flex-col gap-3">
          <span aria-hidden className={`h-2 w-full transition-colors duration-[2000ms] ${p ? "bg-white" : "bg-blue/30"}`} />
          {p ? (
            <span className="flex flex-col motion-safe:animate-flicker-in">
              <span className={`text-ui font-bold ${online.has(p.id) ? "text-white" : "text-red"}`}>{p.name}</span>
              <span className="text-meta text-blue">
                {p.id === you ? "you" : online.has(p.id) ? "aboard" : "offline"}
              </span>
            </span>
          ) : (
            <span className="text-meta text-blue">empty seat</span>
          )}
        </li>
      ))}
    </ol>
  );
}

export function HostLobby({ view, online }: { view: HostView; online: Set<string> }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const n = view.mystery.playerCount;
  const k = view.players.length;
  const full = k >= n;
  const host = useSyncExternalStore(noSubscribe, () => window.location.host, () => "");
  const joinUrl = host ? `${window.location.protocol}//${host}/join?code=${view.code}` : "";

  const start = async () => {
    if (!full || starting) return;
    setStarting(true);
    setError(null);
    const res = await postJson(`/api/rooms/${view.code}/start`);
    if (!res.success) {
      setError(res.errorMessage);
      setStarting(false);
    }
    // On success the doorbell rings and useRoom moves this screen to /mystery.
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) void start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
    } catch {
      setError("Couldn't copy. Read the code out instead.");
    }
  };

  return (
    <>
      <PhaseBar ink={full ? "green" : "white"}>
        <span>Boarding</span>
      </PhaseBar>
      <div className="flex flex-1 flex-col gap-10 px-4 pt-8 pb-10 sm:px-8">
        <section className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <h1
              key={full ? "full" : `wait-${k}`}
              className={`text-statement font-bold ${full ? "text-green motion-safe:animate-flicker-in" : "text-red motion-safe:animate-rise"}`}
            >
              {full ? (
                <>
                  All aboard.
                  <br />
                  Ready to jump.
                </>
              ) : (
                <>
                  {capitalize(inWords(n))} seats.
                  <br />
                  {k === 0 ? "No one aboard." : `${capitalize(inWords(k))} aboard.`}
                </>
              )}
            </h1>
            <div className="flex flex-col gap-1">
              <p className="text-ui font-bold text-white">{view.mystery.title}</p>
              <p className="text-meta">
                <span className={DIFFICULTY_INK[view.mystery.difficulty] ?? ""}>{capitalize(view.mystery.difficulty)}</span>
                <span className="text-blue"> · {capitalize(inWords(n))} players</span>
              </p>
            </div>
            <p className="max-w-xl text-body text-white">{view.mystery.premise}</p>
          </div>
          <div className="motion-safe:animate-rise motion-safe:[animation-delay:600ms] lg:col-span-5 lg:justify-self-end">
            {joinUrl && <JoinQr url={joinUrl} className="w-56 sm:w-64" />}
          </div>
        </section>

        <section aria-label="Join code" className="flex flex-col gap-3">
          <p className="text-display font-bold tracking-wider text-white">{formatCode(view.code)}</p>
          <p className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-body">
            <span className="text-blue">Scan the square with a phone camera, or open {host}/join and type the code</span>
            <button
              type="button"
              onClick={copy}
              className="text-white underline-offset-4 transition-opacity hover:underline focus-visible:underline focus-visible:outline-none active:opacity-60"
            >
              {copied ? "Link copied" : "Copy the link"}
            </button>
          </p>
        </section>

        <Manifest players={view.players} capacity={n} online={online} />

        <div className="flex flex-col gap-3 lg:ml-auto lg:w-96">
          <FillButton type="button" disabled={!full || starting} onClick={start}>
            {starting ? "Starting…" : "Start the mystery"}
          </FillButton>
          {!full && (
            <p className="text-meta text-blue">
              Waiting for {inWords(n - k)} more aboard
              <WaitingDots />
            </p>
          )}
          {error && (
            <p role="alert" className="text-meta text-red">
              {error}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export function PlayerLobby({ view, online }: { view: PlayerView; online: Set<string> }) {
  const n = view.mystery.playerCount;
  const k = view.players.length;
  return (
    <>
      <PhaseBar>
        <span className="text-blue">{formatCode(view.code)}</span>
      </PhaseBar>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 pt-8 pb-10 sm:px-8 sm:pt-12">
        <h1 className="text-display font-bold text-white motion-safe:animate-rise">
          You&apos;re
          <br />
          aboard.
        </h1>
        <div className="flex flex-col gap-1 motion-safe:animate-rise motion-safe:[animation-delay:500ms]">
          <p className="text-ui font-bold text-white">{view.mystery.title}</p>
          <p className="text-meta">
            <span className={DIFFICULTY_INK[view.mystery.difficulty] ?? ""}>{capitalize(view.mystery.difficulty)}</span>
            <span className="text-blue"> · {capitalize(inWords(n))} players</span>
          </p>
        </div>
        <Manifest players={view.players} capacity={n} online={online} you={view.you.id} />
        <div className="flex flex-col gap-2">
          <p className="text-body text-white">
            {k >= n ? "Everyone's here. Waiting for the host to start" : `Waiting for ${inWords(n - k)} more aboard`}
            <WaitingDots />
          </p>
          <p className="text-meta text-blue">Keep this screen open. Your choices will appear here.</p>
        </div>
      </div>
    </>
  );
}
