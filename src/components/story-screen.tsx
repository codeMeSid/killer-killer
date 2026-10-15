"use client";

import { useEffect, useRef, useState } from "react";
import { FillButton } from "@/components/fill-button";
import { PhaseBar, type Ink } from "@/components/phase-bar";
import { RoomLoading } from "@/components/room-loading";
import { WaitingDots } from "@/components/waiting-dots";
import type { PlayerView, ViewOption } from "@/lib/engine/view";
import { postJson, useRoom, useWakeLock } from "@/lib/use-room";

const HOLD_MS = 1200;

export function StoryScreen({ code }: { code: string }) {
  const { view, error } = useRoom(code);
  useWakeLock();
  if (!view) return <RoomLoading error={error?.message ?? null} />;
  if (view.role !== "player" || !view.me) return <RoomLoading error={null} />;
  return <Controller view={view} />;
}

function Pips({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-blue">{label} </span>
      <span aria-hidden className="tracking-widest">
        {"●".repeat(Math.min(value, max))}
        <span className="text-blue">{"○".repeat(Math.max(0, max - value))}</span>
      </span>
      <span className="sr-only">
        {value} of {max}
      </span>
    </span>
  );
}

export function Controller({ view }: { view: PlayerView }) {
  const me = view.me!;
  const choosing = view.status === "playing" && view.phase === "choosing";
  const ink: Ink = !me.alive ? "red" : choosing && !view.myPick ? "orange" : view.myPick && choosing ? "green" : "white";

  // A buzz when a new round opens for you, and when you die.
  const seen = useRef({ options: false, alive: me.alive });
  useEffect(() => {
    const buzz = (p: number | number[]) => "vibrate" in navigator && navigator.vibrate(p);
    if (view.options && !seen.current.options) buzz(120);
    if (!me.alive && seen.current.alive) buzz([300, 120, 300]);
    seen.current = { options: !!view.options, alive: me.alive };
  }, [view.options, me.alive]);

  return (
    <>
      <PhaseBar ink={ink}>
        <Pips label="luck" value={me.luck} max={me.luckMax} />
        <Pips label="truth" value={me.stat} max={me.statMax} />
      </PhaseBar>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 pt-8 pb-10 sm:px-8">
        {!me.alive ? (
          <section className="flex flex-col gap-4">
            <h1 className="text-display font-bold text-red motion-safe:animate-flicker-in">You fell.</h1>
            <p className="text-body text-white">You can still watch. The story goes on without you.</p>
          </section>
        ) : view.options ? (
          <Choose key={`${view.clock.step}`} view={view} options={view.options} />
        ) : view.myPick && choosing ? (
          <Locked view={view} />
        ) : (
          <section className="flex flex-col gap-4 motion-safe:animate-rise">
            <h1 className="text-statement font-bold text-white">Eyes on the screen.</h1>
            <p className="text-body text-blue">
              Your choices will appear here when the narrator is done
              <WaitingDots />
            </p>
          </section>
        )}

        <Identity view={view} />
        <Knowledge view={view} />
      </div>
    </>
  );
}

/** "You will ____." The picked option drops into the blank; the last word locks it in. */
function Choose({ view, options }: { view: PlayerView; options: ViewOption[] }) {
  const me = view.me!;
  const [slot, setSlot] = useState<string | null>(null);
  const [pushed, setPushed] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chosen = options.find((o) => o.slot === slot) ?? null;
  const targets = view.players.filter((p) => p.alive && p.id !== me.id);
  const needsTarget = chosen?.sabotage === "player";
  const ready = !!chosen && (!needsTarget || !!target) && !sending;

  const lock = async () => {
    if (!ready || !chosen) return;
    setSending(true);
    setError(null);
    const res = await postJson(`/api/rooms/${view.code}/picks`, { slot: chosen.slot, pushed, targetId: needsTarget ? target : null });
    if (!res.success) {
      setError(res.errorMessage);
      setSending(false);
    }
  };

  return (
    <section className="flex flex-col gap-8 motion-safe:animate-rise" aria-label="Your choice">
      <h1 className="text-statement font-bold text-white">
        You will{" "}
        {chosen ? (
          <span className="text-orange">{chosen.text}</span>
        ) : (
          <span className="text-blue" aria-label="blank">
            ______
          </span>
        )}
        .
      </h1>

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Options</legend>
        {options.map((o) => {
          const blocked = o.sabotage === "player" && targets.length === 0;
          return (
            <label
              key={o.slot}
              className={`flex min-h-14 cursor-pointer flex-col justify-center gap-1 border px-4 py-3 transition-colors has-checked:border-orange has-focus-visible:ring-2 has-focus-visible:ring-orange/30 ${
                blocked ? "cursor-not-allowed opacity-40" : ""
              } ${o.slot === slot ? "border-orange" : "border-blue/40"}`}
            >
              <input
                type="radio"
                name="option"
                value={o.slot}
                checked={o.slot === slot}
                disabled={blocked}
                onChange={() => {
                  setSlot(o.slot);
                  setTarget(null);
                }}
                className="sr-only"
              />
              <span className="text-body text-white">{o.text}</span>
              <span className="text-meta">
                <span className="text-blue">{o.tag === "group" ? "together" : "alone"}</span>
                {o.risky && <span className="text-red"> · dangerous</span>}
                {o.sabotage && <span className="text-red"> · betrays the group</span>}
              </span>
            </label>
          );
        })}
      </fieldset>

      {needsTarget && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-body text-white">Who do you turn on?</legend>
          {targets.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-3 text-body text-white has-checked:text-red">
              <input type="radio" name="target" checked={target === p.id} onChange={() => setTarget(p.id)} className="peer sr-only" />
              <span aria-hidden className="invisible text-red before:content-['●'] peer-checked:visible" />
              <span className="peer-focus-visible:underline">
                {p.name}
                {p.character && <span className="text-meta text-blue"> · {p.character.name}</span>}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <label className={`flex items-start gap-3 text-body ${me.luck < 1 ? "opacity-40" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          checked={pushed}
          disabled={me.luck < 1}
          onChange={(e) => setPushed(e.target.checked)}
          className="mt-1 size-5 accent-orange"
        />
        <span className="flex flex-col">
          <span className="text-white">Push your luck</span>
          <span className="text-meta text-blue">Spend one luck for a better chance. It&apos;s gone either way.</span>
        </span>
      </label>

      <div className="flex flex-col gap-3">
        <FillButton type="button" disabled={!ready} onClick={lock}>
          {sending ? "Locking…" : "Lock it in."}
        </FillButton>
        {error && (
          <p role="alert" className="text-meta text-red">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function Locked({ view }: { view: PlayerView }) {
  const waiting = view.players.filter((p) => p.alive && !p.locked).map((p) => p.name);
  const names = waiting.length <= 1 ? waiting.join("") : `${waiting.slice(0, -1).join(", ")} and ${waiting.at(-1)}`;
  return (
    <section className="flex flex-col gap-4 motion-safe:animate-rise">
      <h1 className="text-statement font-bold text-green">Locked in.</h1>
      <p className="text-body text-white">You will {view.myPick!.text}.</p>
      {waiting.length > 0 && (
        <p className="text-body text-blue">
          Waiting on {names}
          <WaitingDots />
        </p>
      )}
    </section>
  );
}

/**
 * Press and hold to see who you are. Released, it hides again, so a phone face-up on the
 * table leaks nothing. The killer's notice only ever appears here.
 */
function Identity({ view }: { view: PlayerView }) {
  const me = view.me!;
  const character = view.players.find((p) => p.id === me.id)?.character ?? null;
  const [shown, setShown] = useState(false);
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const press = () => {
    setHolding(true);
    timer.current = setTimeout(() => setShown(true), HOLD_MS);
  };
  const release = () => {
    if (timer.current) clearTimeout(timer.current);
    setHolding(false);
    setShown(false);
  };

  if (!character && !me.killer) return null;

  return (
    <section aria-label="Who you are" className="flex flex-col gap-4">
      <button
        type="button"
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !holding && press()}
        onKeyUp={release}
        onContextMenu={(e) => e.preventDefault()}
        className="group relative w-full touch-none overflow-hidden border border-blue/40 px-4 py-4 text-left text-body text-white select-none focus-visible:border-white focus-visible:outline-none"
      >
        <span
          aria-hidden
          className={`absolute inset-0 origin-left bg-white/10 ${holding ? "scale-x-100 duration-[1200ms] ease-linear" : "scale-x-0 duration-300"} transition-transform`}
        />
        <span className="relative">{shown ? "Release to hide" : "Hold to see who you are"}</span>
      </button>
      {shown && (
        <div className="flex flex-col gap-2 motion-safe:animate-fade-in">
          {character && (
            <>
              <p className="text-ui font-bold text-white">{character.name}</p>
              <p className="text-body text-white">{character.description}</p>
              <p className="text-meta text-blue">Alibi: {character.alibi}</p>
              <p className="text-meta text-blue">Motive: {character.motive}</p>
            </>
          )}
          {me.killer && (
            <p className="text-ui font-bold text-red">
              You did it. Nobody knows. Steer them wrong without being seen.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** What you know and carry: private finds first, then what the group shares. */
function Knowledge({ view }: { view: PlayerView }) {
  const me = view.me!;
  const rows = [
    ...me.clues.map((text) => ({ text, who: "only you" })),
    ...view.party.clues.map((text) => ({ text, who: "everyone" })),
  ];
  const items = [...me.items.map((i) => ({ ...i, who: "yours" })), ...view.party.items.map((i) => ({ ...i, who: "shared" }))];
  if (rows.length === 0 && items.length === 0) return null;
  return (
    <details className="group flex flex-col gap-4 pt-4">
      <summary className="cursor-pointer list-none text-body text-white focus-visible:underline focus-visible:outline-none">
        What you know <span className="text-blue">· {rows.length + items.length}</span>
      </summary>
      <ul className="mt-6 flex flex-col gap-6">
        {rows.map((r, i) => (
          <li key={`c${i}`} className="flex flex-col gap-1">
            <span className="text-body text-white">{r.text}</span>
            <span className="text-meta text-blue">{r.who}</span>
          </li>
        ))}
        {items.map((it, i) => (
          <li key={`i${i}`} className="flex flex-col gap-1">
            <span className="text-body font-bold text-white">{it.name}</span>
            <span className="text-body text-white">{it.description}</span>
            <span className="text-meta text-blue">{it.who}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
