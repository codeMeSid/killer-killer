"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { JoinQr } from "@/components/join-qr";
import { Machine } from "@/components/machine";
import { SoundToggle } from "@/components/sound-toggle";
import { sfx } from "@/lib/sfx";
import { capitalize, formatCode, inWords, postJson, type RoomView } from "@/lib/use-room";
import { LEXICON } from "@/mysteries/catalog";
import type { Item, Lexicon } from "@/mysteries/types";
import { AccusePanel } from "./accuse-panel";
import { Clock } from "./clock";
import { BRIEF, FolderWindow } from "./folder-window";
import { ItemBody } from "./item-view";
import { Reveal } from "./reveal";
import { SuspectCard } from "./suspect-card";

const FALLBACK: Lexicon = {
  schema: "mm-lexicon/1",
  card: "",
  desk: "The desk",
  accuse: "Make the accusation",
  wrong: "Wrong.",
  solved: "Case closed.",
  defeated: "The trail goes cold.",
  loaders: [],
  full: "Every place is taken.",
  no_room: "No case with that code.",
  gone: "That case file is gone.",
};

export type DeskInitial = { sel?: string; open?: boolean; accuse?: boolean; draft?: { who?: number[]; motive?: string } };

const noop = () => () => {};

/**
 * The case desk: folders left, the open file right (phone: list, then full-screen file with Back).
 * Everything is open from the start. Host alone accuses; a wrong guess flashes on every device.
 * Props are plain data so dev scenes render it without a database.
 */
export function Desk({
  view,
  online,
  reading,
  onReading,
  lexicon,
  initial,
}: {
  view: RoomView;
  online: number[];
  reading: Record<string, number[]>;
  onReading?: (itemId: string | null) => void;
  lexicon?: Lexicon;
  initial?: DeskInitial;
}) {
  const c = view.case;
  const words = lexicon ?? LEXICON[view.slug] ?? FALLBACK;
  const [sel, setSel] = useState(initial?.sel ?? BRIEF);
  const [open, setOpen] = useState(initial?.open ?? true); // phone: file open (true) or folder list
  const [accusing, setAccusing] = useState(initial?.accuse ?? false);
  const origin = useSyncExternalStore(noop, () => location.origin, () => "");

  // Tell the team which file this agent has open.
  useEffect(() => {
    onReading?.(open && !accusing ? sel : null);
    return () => onReading?.(null);
  }, [sel, open, accusing, onReading]);

  // Sound on verdicts: sting on a wrong guess, only when the count changes.
  const seen = useRef(view.guessesUsed);
  useEffect(() => {
    if (view.guessesUsed > seen.current && view.status === "playing") sfx.sting();
    seen.current = view.guessesUsed;
  }, [view.guessesUsed, view.status]);

  if (view.ending) return (
    <Machine kind="computer">
      <Reveal view={{ ...view, ending: view.ending }} words={words} />
    </Machine>
  );

  const pinned = new Set(view.pins.map((p) => p.itemId));
  const others = (id: string) => (reading[id] ?? []).filter((a) => a !== view.me);
  const othersReading = Object.fromEntries(Object.keys(reading).map((id) => [id, others(id)]));

  const items: Item[] = c.folders.flatMap((f) => f.items);
  const item = items.find((i) => i.id === sel);
  const suspectIdx = sel.startsWith("suspect:") ? Number(sel.slice(8)) : -1;
  const title = sel === BRIEF ? "Brief" : suspectIdx >= 0 ? (c.suspects[suspectIdx]?.name ?? "") : (item?.title ?? "");

  const pickItem = (id: string) => {
    sfx.blip();
    setSel(id);
    setOpen(true);
    setAccusing(false);
  };
  const pin = (id: string) => void postJson(`/api/rooms/${view.code}/pins`, { itemId: id });
  const joinUrl = `${origin}/join?code=${view.code}`;
  const pins = view.pins.filter((p, i, a) => a.findIndex((q) => q.itemId === p.itemId) === i);
  const labelOf = (id: string) => items.find((i) => i.id === id)?.title ?? id;
  const left = 2 - view.guessesUsed;

  return (
    <Machine kind="computer">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-blue/30 px-4 py-2 sm:px-8">
        <h1 className="font-pixel text-ui text-orange">{view.team}</h1>
        <span className="text-body text-white">{formatCode(view.code)}</span>
        <Clock startedAt={view.startedAt} endedAt={view.endedAt} />
        <span className="text-body text-white">
          {capitalize(inWords(online.length))} {online.length === 1 ? "agent" : "agents"} online
        </span>
        <span className="text-body text-blue">You are Agent {view.me}</span>
        <SoundToggle className="ml-auto" />
      </header>

      {view.isHost && (
        <details className="border-b border-blue/30 px-4 py-1 sm:px-8">
          <summary className="min-h-11 cursor-pointer py-2 text-body text-white">Show the join code</summary>
          <div className="flex flex-wrap items-center gap-6 pb-4">
            {origin && <JoinQr url={joinUrl} className="w-40" />}
            <p className="font-pixel text-statement text-orange">{formatCode(view.code)}</p>
          </div>
        </details>
      )}

      {view.lastWrong && (
        <p key={view.guessesUsed} role="alert" className="border-b border-red/40 px-4 py-2 text-ui text-red motion-safe:animate-glitch sm:px-8">
          {words.wrong} One guess left.
        </p>
      )}

      {pins.length > 0 && (
        <nav aria-label="Pinned" className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-blue/30 px-4 py-1 text-body sm:px-8">
          <span className="text-meta text-blue">Pinned</span>
          {pins.map((p) => (
            <button key={p.itemId} type="button" onClick={() => pickItem(p.itemId)} className="min-h-11 text-orange underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none">
              {labelOf(p.itemId)} · Agent {p.agent}
            </button>
          ))}
        </nav>
      )}

      <main className="grid flex-1 gap-0 md:grid-cols-[18rem_minmax(0,1fr)]">
        <div className={`border-blue/30 px-4 py-4 sm:px-8 md:border-r md:px-4 ${open ? "hidden md:block" : "block"}`}>
          <FolderWindow c={c} selected={sel} onSelect={pickItem} pinned={pinned} reading={othersReading} />
          <div className="mt-6 border-t border-blue/30 pt-4">
            {view.isHost ? (
              <button
                type="button"
                onClick={() => {
                  sfx.clack();
                  setAccusing(true);
                  setOpen(true);
                }}
                className="pixel-border pb-orange min-h-14 w-[calc(100%-6px)] py-3 font-pixel text-ui text-orange transition-[box-shadow] hover:pb-white focus-visible:outline-none"
              >
                {words.accuse}
              </button>
            ) : (
              <p className="text-body text-white">Agent 1 makes the accusation.</p>
            )}
            <p className="mt-2 text-body text-white">{left === 1 ? "One guess left." : "Two guesses."}</p>
          </div>
        </div>

        <section aria-label="Open file" className={`min-w-0 flex-col gap-6 px-4 py-4 sm:px-8 ${open ? "flex" : "hidden md:flex"}`}>
          <button type="button" onClick={() => setOpen(false)} className="min-h-11 self-start text-body text-white underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none md:hidden">
            &lt; Back to the folders
          </button>
          {accusing && view.isHost ? (
            <AccusePanel code={view.code} c={c} guessesLeft={left} onClose={() => setAccusing(false)} initial={initial?.draft} />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <h2 className="font-pixel text-statement text-white">{title}</h2>
                {item && (
                  <button
                    type="button"
                    onClick={() => pin(item.id)}
                    aria-pressed={pinned.has(item.id)}
                    className={`min-h-11 text-body underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none ${pinned.has(item.id) ? "text-orange" : "text-white"}`}
                  >
                    {pinned.has(item.id) ? "Unpin" : "Pin"}
                  </button>
                )}
                {others(sel).length > 0 && <span className="text-body text-blue">Agent {others(sel).join(", ")} reading</span>}
              </div>
              {sel === BRIEF ? (
                <div className="flex flex-col gap-4 text-body text-white">
                  <p className="text-ui text-orange">{c.victim.name}</p>
                  <p>{c.victim.summary}</p>
                  <p className="whitespace-pre-line">{c.brief}</p>
                </div>
              ) : suspectIdx >= 0 && c.suspects[suspectIdx] ? (
                <SuspectCard suspect={c.suspects[suspectIdx]} />
              ) : item ? (
                <ItemBody item={item} />
              ) : null}
            </>
          )}
        </section>
      </main>
    </Machine>
  );
}
