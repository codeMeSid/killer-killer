"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StoryArt } from "@/components/story-art";
import { sfx } from "@/lib/sfx";
import type { MysteryCard } from "@/mysteries";
import { fill, lexiconFor } from "@/mysteries/catalog";
import { capitalize, DIFFICULTY_INK, inWords, postJson } from "@/lib/use-room";

/**
 * "Pick a case." over a row of cartridges, one per story, each carrying the story's own Hairline
 * figure (it answers the pointer). ←/→/↑/↓ anywhere moves the selection, Enter opens it; clicking a
 * cartridge opens it directly (same grammar as the home menu).
 */
export function CasePicker({ cards }: { cards: MysteryCard[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(
    async (slug: string) => {
      if (opening) return;
      setOpening(slug);
      setError(null);
      sfx.clack();
      const res = await postJson<{ code: string }>("/api/rooms", { mystery: slug });
      if (res.success && res.payload) router.push(`/lobby/${res.payload.code}`);
      else {
        setError(res.errorMessage);
        setOpening(null);
      }
    },
    [opening, router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void open(cards[selected].slug);
        return;
      }
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      sfx.blip();
      setSelected((i) => (i + step + cards.length) % cards.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards, selected, open]);

  return (
    <div className="relative flex flex-1 flex-col gap-10 px-4 pt-8 pb-8 sm:px-8 lg:pt-12">
      <h1 className="font-pixel text-display text-white motion-safe:animate-print">Pick a case.</h1>

      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => {
          const active = i === selected;
          const words = lexiconFor(card.slug);
          return (
            <li key={card.slug} className={`motion-safe:animate-rise ${i ? "motion-safe:[animation-delay:300ms]" : ""}`}>
              <button
                type="button"
                onMouseEnter={() => setSelected(i)}
                onFocus={() => setSelected(i)}
                onClick={() => {
                  setSelected(i);
                  void open(card.slug);
                }}
                aria-label={`${card.title}, ${card.difficulty}, ${card.playerCount} players`}
                className={`pixel-border flex w-[calc(100%-6px)] flex-col text-left transition-[box-shadow,transform] focus-visible:outline-none ${
                  active ? "pb-orange -translate-y-1" : "pb-dim"
                }`}
              >
                <StoryArt slug={card.slug} variant="card" className="border-b border-blue/30" />
                <span className="flex flex-col gap-3 p-5">
                  <span className={`font-pixel text-ui ${active ? "text-orange" : "text-white"}`}>{card.title}</span>
                  <span className="text-body text-white">{fill(words.hook, { victim: card.victim })}</span>
                  <span className="text-body">
                    <span className={DIFFICULTY_INK[card.difficulty] ?? "text-white"}>{capitalize(card.difficulty)}</span>
                    <span className="text-white"> · {capitalize(inWords(card.playerCount))} players</span>
                  </span>
                  {opening === card.slug && <span className="font-pixel text-body text-orange">Loading the cartridge…</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-auto max-w-xl text-body text-blue">Pick a case on this screen. Your friends join it from their phones.</p>
      {error && (
        <p role="alert" className="text-body text-red motion-safe:animate-glitch">
          {error}
        </p>
      )}
    </div>
  );
}
