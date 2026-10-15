"use client";

import { useEffect, useRef, useState } from "react";
import { FillButton } from "@/components/fill-button";
import { LoaderLine } from "@/components/loader-line";
import { Machine } from "@/components/machine";
import { PhaseBar, type Ink } from "@/components/phase-bar";
import { RoomLoading } from "@/components/room-loading";
import { SoundToggle } from "@/components/sound-toggle";
import { StoryArt } from "@/components/story-art";
import { clockText } from "@/components/mystery-screen";
import { WaitingDots } from "@/components/waiting-dots";
import type { PlayerView, ViewOption } from "@/lib/engine/view";
import { sfx } from "@/lib/sfx";
import { capitalize, inWords, postJson, useRoom, useWakeLock } from "@/lib/use-room";
import { lexiconFor } from "@/mysteries/catalog";

// The identity card hides itself after this long (the drain bar shows it).
const HIDE_AFTER_MS = 10000;

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
  const words = lexiconFor(view.mystery.slug);
  const choosing = view.status === "playing" && view.phase === "choosing";
  const ink: Ink = !me.alive ? "red" : choosing && !view.myPick ? "orange" : view.myPick && choosing ? "green" : "white";

  // Your move: a buzz and a chime the moment the choices (or the vote) open, so phones can sit face down.
  const yourMove = !!view.options || (!!view.ballot && view.ballot.mine == null);
  const seen = useRef({ move: false, alive: me.alive });
  useEffect(() => {
    const buzz = (p: number | number[]) => "vibrate" in navigator && navigator.vibrate(p);
    if (yourMove && !seen.current.move) {
      buzz([200, 100, 200]);
      sfx.chime();
    }
    if (!me.alive && seen.current.alive) {
      buzz([300, 120, 300]);
      sfx.sting();
    }
    seen.current = { move: yourMove, alive: me.alive };
  }, [yourMove, me.alive]);

  return (
    <Machine kind="terminal">
      <PhaseBar ink={ink}>
        <Pips label="luck" value={me.luck} max={me.luckMax} />
        <Pips label="truth" value={me.stat} max={me.statMax} />
      </PhaseBar>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 pt-6 pb-10 sm:px-8">
        <StorySoFar view={view} />
        {!me.alive ? (
          <section className="flex flex-col gap-4">
            <h1 className="font-pixel text-display text-red motion-safe:animate-glitch">{words.play.dead}</h1>
            <p className="text-body text-white">
              {view.voting ? "The living are voting on who did it." : "You can still watch. The story goes on without you."}
            </p>
          </section>
        ) : view.ballot ? (
          <Vote view={view} />
        ) : view.options ? (
          <Choose key={`${view.clock.step}`} view={view} options={view.options} />
        ) : view.myPick && choosing ? (
          <Locked view={view} loaders={words.play.loaders} />
        ) : (
          <section className="flex flex-col gap-4 motion-safe:animate-rise">
            {me.result && <Result lines={me.result} />}
            <h1 className="font-pixel text-statement text-white motion-safe:animate-print">Eyes on the screen.</h1>
            <p className="text-body text-white">
              {view.clock.step === 0 && view.players.some((p) => p.id === me.id && p.character)
                ? "Tap the box below to see who you are. Nobody else can."
                : "Your choices will appear here when the narrator is done"}
              <WaitingDots />
            </p>
            <StoryArt slug={view.mystery.slug} variant="loader" />
            <LoaderLine lines={words.play.loaders} className="text-ui" />
          </section>
        )}

        <Identity view={view} />
        <Knowledge view={view} />
        <SoundToggle className="self-start" />
      </div>
    </Machine>
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
    if (res.success) sfx.clack(0.18);
    else {
      setError(res.errorMessage);
      setSending(false);
    }
  };

  return (
    <section className="flex flex-col gap-8 motion-safe:animate-rise" aria-label="Your choice">
      <h1 className="font-pixel text-statement text-white">
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
              className={`pixel-border flex min-h-14 cursor-pointer flex-col justify-center gap-1 px-4 py-3 transition-[box-shadow,transform] has-focus-visible:pb-white active:translate-y-px ${
                blocked ? "cursor-not-allowed opacity-40" : ""
              } ${o.slot === slot ? "pb-orange" : "pb-dim"}`}
            >
              <input
                type="radio"
                name="option"
                value={o.slot}
                checked={o.slot === slot}
                disabled={blocked}
                onChange={() => {
                  sfx.blip();
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
          {sending ? "Locking…" : !chosen ? "Pick what you will do" : needsTarget && !target ? "Pick who you turn on" : "Lock it in."}
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

function Locked({ view, loaders }: { view: PlayerView; loaders: string[] }) {
  const waiting = view.players.filter((p) => p.alive && !p.locked).map((p) => p.name);
  const names = waiting.length <= 1 ? waiting.join("") : `${waiting.slice(0, -1).join(", ")} and ${waiting.at(-1)}`;
  return (
    <section className="flex flex-col gap-4 motion-safe:animate-rise">
      <h1 className="font-pixel text-statement text-green motion-safe:animate-flicker-in">Locked in.</h1>
      <p className="text-body text-white">You will {view.myPick!.text}.</p>
      {waiting.length > 0 && (
        <p className="text-body text-blue">
          Waiting on {names}
          <WaitingDots />
        </p>
      )}
      <StoryArt slug={view.mystery.slug} variant="loader" />
      <LoaderLine lines={loaders} className="text-ui" />
    </section>
  );
}

/**
 * Tap to see who you are, tap again to hide. It also hides by itself after a few seconds and
 * whenever the phone is put away, so a phone left face-up on the table leaks nothing. A plain
 * toggle, not a press-and-hold: no gesture to discover, works with one thumb, a keyboard and a
 * screen reader. The killer's notice only ever appears here.
 */
function Identity({ view }: { view: PlayerView }) {
  const me = view.me!;
  const character = view.players.find((p) => p.id === me.id)?.character ?? null;
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(false), HIDE_AFTER_MS);
    const away = () => document.visibilityState === "hidden" && setShown(false);
    document.addEventListener("visibilitychange", away);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", away);
    };
  }, [shown]);

  if (!character && !me.killer) return null;

  return (
    <section aria-label="Who you are" className="flex flex-col gap-4">
      <button
        type="button"
        aria-expanded={shown}
        aria-controls="identity-card"
        onClick={() => {
          sfx.blip();
          setShown((s) => !s);
        }}
        className={`pixel-border relative min-h-14 w-[calc(100%-6px)] overflow-hidden px-4 py-4 text-left font-pixel text-ui text-white transition-[box-shadow,transform] [touch-action:manipulation] focus-visible:pb-white focus-visible:outline-none active:translate-y-px ${
          shown ? "pb-orange" : "pb-dim"
        }`}
      >
        {shown ? "Hide who you are" : "Show who you are"}
        {/* How long until it hides itself: a bar draining along the bottom edge. */}
        {shown && (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 origin-left bg-orange motion-safe:animate-drain" />
        )}
      </button>
      {shown && (
        <div id="identity-card" className="flex flex-col gap-2 motion-safe:animate-[fade-in_250ms_ease-out_both]">
          {character && (
            <>
              <p className="font-pixel text-ui text-white">{character.name}</p>
              <p className="text-body text-white">{character.description}</p>
              <p className="text-body text-white">
                <span className="text-blue">Alibi: </span>
                {character.alibi}
              </p>
              <p className="text-body text-white">
                <span className="text-blue">Motive: </span>
                {character.motive}
              </p>
              {me.secret && (
                <p className="text-body text-white">
                  <span className="text-orange">Your secret: </span>
                  {me.secret}
                </p>
              )}
            </>
          )}
          {me.killer && (
            <p className="font-pixel text-ui text-red motion-safe:animate-glitch">
              You did it. Nobody knows. Steer them wrong without being seen.
            </p>
          )}
          <p className="text-meta text-blue">Hides again by itself.</p>
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
      <summary className="min-h-11 cursor-pointer list-none font-pixel text-ui text-white focus-visible:underline focus-visible:outline-none">
        <span aria-hidden className="text-orange group-open:hidden">&gt; </span>
        <span aria-hidden className="hidden text-orange group-open:inline">v </span>
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

const RECAP_INK = { choice: "text-white", outcome: "text-white", sabotage: "text-red", death: "text-red", evidence: "text-orange" };

/**
 * Everything the TV has narrated, so nobody has to keep up in real time: the current scene pinned on
 * top, then each earlier stretch of the night, newest first and labelled by the clock. Folded by
 * default so the choices stay first.
 */
function StorySoFar({ view }: { view: PlayerView }) {
  const rounds = [...view.history].reverse();
  if (!view.intro && rounds.length === 0) return null;
  return (
    <details className="group/story border-b border-blue/30 pb-4">
      <summary className="min-h-11 cursor-pointer list-none font-pixel text-ui text-white focus-visible:underline focus-visible:outline-none">
        <span aria-hidden className="text-orange group-open/story:hidden">&gt; </span>
        <span aria-hidden className="hidden text-orange group-open/story:inline">v </span>
        Story so far
      </summary>
      <div className="mt-6 flex flex-col gap-8">
        {view.intro && (
          <section className="flex flex-col gap-2">
            <h2 className="font-pixel text-body text-orange">Now · {clockText(view.clock.value, view.clock.unit)}</h2>
            <p className="text-body text-white">{view.intro}</p>
          </section>
        )}
        {rounds.map((r, k) => (
          <details key={rounds.length - k} open={k === 0} className="group/round flex flex-col gap-3">
            <summary className="min-h-11 cursor-pointer list-none font-pixel text-body text-white focus-visible:underline focus-visible:outline-none">
              <span aria-hidden className="text-blue group-open/round:hidden">&gt; </span>
              <span aria-hidden className="hidden text-blue group-open/round:inline">v </span>
              {clockText(r.clock, view.clock.unit)}
            </summary>
            <div className="mt-2 flex flex-col gap-3">
              <p className="text-body text-white">{r.intro}</p>
              {r.recap.map((line, j) => (
                <p key={j} className={`text-body ${RECAP_INK[line.kind]}`}>
                  {line.text}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}

/** What the last round did to you, privately. */
function Result({ lines }: { lines: string[] }) {
  return (
    <section aria-label="What happened to you" className="pixel-border pb-dim flex flex-col gap-2 px-4 py-4 motion-safe:animate-flicker-in">
      <h2 className="font-pixel text-ui text-white">What happened to you</h2>
      {lines.map((line, k) => (
        <p key={k} className="text-body text-white">
          {line}
        </p>
      ))}
    </section>
  );
}

/** The accusation: one name, never your own, final once cast. */
function Vote({ view }: { view: PlayerView }) {
  const ballot = view.ballot!;
  const voting = view.voting!;
  const [choice, setChoice] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ballot.mine != null) {
    return (
      <section className="flex flex-col gap-4 motion-safe:animate-rise">
        <h1 className="font-pixel text-statement text-green motion-safe:animate-flicker-in">Vote cast.</h1>
        <p className="text-body text-white">You named {voting.candidates[ballot.mine]}.</p>
        <p className="text-body text-white">
          {capitalize(inWords(voting.voted))} of {inWords(voting.voters)} voted
          <WaitingDots />
        </p>
      </section>
    );
  }

  const cast = async () => {
    if (choice == null || sending) return;
    setSending(true);
    setError(null);
    const res = await postJson(`/api/rooms/${view.code}/votes`, { index: choice });
    if (res.success) sfx.clack(0.18);
    else {
      setError(res.errorMessage);
      setSending(false);
    }
  };

  return (
    <section className="flex flex-col gap-8 motion-safe:animate-rise" aria-label="Your vote">
      <h1 className="font-pixel text-statement text-white">Who did it?</h1>
      <p className="text-body text-white">The most votes is accused. Your vote is secret until the reveal.</p>
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Accuse</legend>
        {ballot.choices.map((index) => (
          <label
            key={index}
            className={`pixel-border flex min-h-14 cursor-pointer items-center px-4 py-3 text-body text-white transition-[box-shadow,transform] has-focus-visible:pb-white active:translate-y-px ${
              choice === index ? "pb-orange" : "pb-dim"
            }`}
          >
            <input
              type="radio"
              name="accuse"
              checked={choice === index}
              onChange={() => {
                sfx.blip();
                setChoice(index);
              }}
              className="sr-only"
            />
            {voting.candidates[index]}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-3">
        <FillButton type="button" disabled={choice == null || sending} onClick={cast}>
          {sending ? "Voting…" : choice == null ? "Pick who you accuse" : `Accuse ${voting.candidates[choice]}`}
        </FillButton>
        {error && (
          <p role="alert" className="text-body text-red">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
