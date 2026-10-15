"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FillButton } from "@/components/fill-button";
import { JoinQr } from "@/components/join-qr";
import { LoaderLine } from "@/components/loader-line";
import { Machine } from "@/components/machine";
import { PhaseBar } from "@/components/phase-bar";
import { RoomLoading } from "@/components/room-loading";
import { SoundToggle } from "@/components/sound-toggle";
import { StoryArt } from "@/components/story-art";
import { WaitingDots } from "@/components/waiting-dots";
import type { HostView, PlayerView, ViewPlayer } from "@/lib/engine/view";
import { sfx } from "@/lib/sfx";
import { capitalize, DIFFICULTY_INK, formatCode, inWords, postJson, useRoom, useWakeLock } from "@/lib/use-room";
import { fill, lexiconFor } from "@/mysteries/catalog";
import type { Lexicon } from "@/mysteries/types";

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

/** A blip when someone takes a place, a thump when the last one does. */
function useJoinSounds(count: number, capacity: number) {
  const seen = useRef(count);
  useEffect(() => {
    if (count > seen.current) (count >= capacity ? sfx.thump : sfx.blip)();
    seen.current = count;
  }, [count, capacity]);
}

/** The roster as a read-only track: one segment per place, filled as people join. */
function Manifest({
  players,
  capacity,
  online,
  words,
  you,
}: {
  players: ViewPlayer[];
  capacity: number;
  online: Set<string>;
  words: Lexicon["lobby"];
  you?: string;
}) {
  const seats = Array.from({ length: capacity }, (_, i) => players[i] ?? null);
  return (
    <ol aria-label="Players" className={`grid grid-cols-2 gap-x-4 gap-y-8 ${COLS[capacity] ?? "sm:grid-cols-4"}`}>
      {seats.map((p, i) => (
        <li key={p?.id ?? `empty-${i}`} className="flex flex-col gap-3">
          <span aria-hidden className={`h-2 w-full transition-colors duration-[2000ms] ${p ? "bg-white" : "bg-blue/30"}`} />
          {p ? (
            <span className="flex flex-col motion-safe:animate-flicker-in">
              <span className={`font-pixel text-ui ${online.has(p.id) ? "text-white" : "text-red"}`}>{p.name}</span>
              <span className={`text-body ${online.has(p.id) ? "text-white" : "text-red"}`}>
                {p.id === you ? "you" : online.has(p.id) ? words.present : "offline"}
              </span>
            </span>
          ) : (
            <span className="text-body text-blue">{words.empty}</span>
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
  const words = lexiconFor(view.mystery.slug);
  const n = view.mystery.playerCount;
  const k = view.players.length;
  const full = k >= n;
  const host = useSyncExternalStore(noSubscribe, () => window.location.host, () => "");
  const joinUrl = host ? `${window.location.protocol}//${host}/join?code=${view.code}` : "";
  useJoinSounds(k, n);

  const start = async () => {
    if (!full || starting) return;
    setStarting(true);
    setError(null);
    sfx.clack();
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

  // The crawl repeats how to join between the story's own loader lines.
  const crawl = [`Join at ${host || "this address"}/join · code ${formatCode(view.code)}`, ...words.play.loaders].join("   ///   ");

  return (
    <Machine kind="tv">
      <PhaseBar ink={full ? "green" : "white"}>
        <span className="font-pixel">{words.lobby.phase}</span>
      </PhaseBar>
      {/* First screen = how to join and how to start; the story's art and roster sit beside and below. */}
      <div className="flex flex-1 flex-col gap-10 px-4 pt-8 pb-24 sm:px-8">
        <section className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="flex flex-col gap-6 lg:col-span-8">
            <h1
              key={full ? "full" : `wait-${k}`}
              className={`font-pixel text-statement ${full ? "text-green motion-safe:animate-glitch" : "text-red motion-safe:animate-rise"}`}
            >
              {full ? (
                <>
                  {words.lobby.full[0]}
                  <br />
                  {words.lobby.full[1]}
                </>
              ) : (
                <>
                  {fill(words.lobby.seats, { n })}
                  <br />
                  {k === 0 ? words.lobby.nobody : fill(words.lobby.some, { n: k })}
                </>
              )}
            </h1>
            <p className="text-body">
              <span className="font-pixel text-ui text-white">{view.mystery.title}</span>
              <span className={DIFFICULTY_INK[view.mystery.difficulty] ?? ""}> · {capitalize(view.mystery.difficulty)}</span>
              <span className="text-white"> · {capitalize(inWords(n))} players</span>
            </p>
            <section aria-label="Join code" className="flex flex-col gap-3">
              <p className="font-pixel text-display tracking-wider whitespace-nowrap text-white">{formatCode(view.code)}</p>
              <p className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-body">
                <span className="text-white">Scan the square with a phone camera, or open {host}/join and type the code</span>
                <button
                  type="button"
                  onClick={copy}
                  className="text-orange underline underline-offset-4 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 active:opacity-60"
                >
                  {copied ? "Link copied" : "Copy the link"}
                </button>
              </p>
            </section>
            <div className="flex flex-col items-start gap-3 lg:w-[30rem]">
              <FillButton type="button" disabled={!full || starting} onClick={start}>
                {starting ? "Starting…" : full ? "Start the mystery" : fill(words.lobby.waiting, { n: n - k })}
              </FillButton>
              <SoundToggle keyHint />
              {error && (
                <p role="alert" className="text-body text-red motion-safe:animate-glitch">
                  {error}
                </p>
              )}
            </div>
          </div>
          <div className="order-first flex flex-wrap items-end gap-6 sm:flex-nowrap lg:order-none lg:col-span-4 lg:flex-col lg:items-end">
            {joinUrl && <JoinQr url={joinUrl} className="w-40 sm:w-48" />}
            <StoryArt slug={view.mystery.slug} variant="hero" caption className="hidden max-w-[14rem] sm:flex lg:max-w-[24rem]" />
          </div>
        </section>

        <section className="grid gap-8 border-t border-blue/30 pt-8 lg:grid-cols-12">
          <p className="max-w-xl text-body text-white lg:col-span-5">{view.mystery.premise}</p>
          <div className="lg:col-span-7">
            <Manifest players={view.players} capacity={n} online={online} words={words.lobby} />
          </div>
        </section>
      </div>

      <div aria-hidden className="fixed inset-x-0 bottom-0 z-30 overflow-hidden border-t border-blue/30 bg-background py-3">
        <p className="flex w-max font-pixel text-body whitespace-nowrap text-blue motion-safe:animate-ticker">
          <span className="pr-16">{crawl}</span>
          <span className="pr-16">{crawl}</span>
        </p>
      </div>
    </Machine>
  );
}

export function PlayerLobby({ view, online }: { view: PlayerView; online: Set<string> }) {
  const words = lexiconFor(view.mystery.slug);
  const n = view.mystery.playerCount;
  const k = view.players.length;
  return (
    <Machine kind="terminal">
      <PhaseBar>
        <span className="font-pixel text-blue">{formatCode(view.code)}</span>
      </PhaseBar>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 pt-8 pb-10 sm:px-8 sm:pt-12">
        <h1 className="font-pixel text-display text-white motion-safe:animate-print lg:text-statement">
          {words.lobby.joined[0]}
          <br />
          {words.lobby.joined[1]}
        </h1>
        <div className="flex flex-col gap-1 motion-safe:animate-rise motion-safe:[animation-delay:500ms]">
          <p className="font-pixel text-ui text-white">{view.mystery.title}</p>
          <p className="text-body">
            <span className={DIFFICULTY_INK[view.mystery.difficulty] ?? ""}>{capitalize(view.mystery.difficulty)}</span>
            <span className="text-white"> · {capitalize(inWords(n))} players</span>
          </p>
        </div>
        <StoryArt slug={view.mystery.slug} variant="loader" />
        <Manifest players={view.players} capacity={n} online={online} words={words.lobby} you={view.you.id} />
        <div className="flex flex-col gap-3">
          <p className="text-body text-white">
            {k >= n ? "Everyone's here. Waiting for the host to start" : fill(words.lobby.waiting, { n: n - k })}
            <WaitingDots />
          </p>
          <LoaderLine lines={words.play.loaders} className="text-ui" />
          <p className="text-body text-white">Keep this screen open. Your choices will appear here.</p>
          <SoundToggle className="self-start" />
        </div>
      </div>
    </Machine>
  );
}
