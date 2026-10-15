"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { MysteryCard } from "@/mysteries";
import { capitalize, DIFFICULTY_INK, inWords, postJson } from "@/lib/use-room";

// Case prints dropped on the headline, each at its own angle. The selected one straightens and comes forward.
const TILTS = ["-rotate-6", "rotate-[5deg]", "-rotate-3", "rotate-[4deg]", "-rotate-[5deg]", "rotate-2"];
// Prints drop in one after another, after the headline has surfaced.
const DELAYS = [
  "motion-safe:[animation-delay:600ms]",
  "motion-safe:[animation-delay:1000ms]",
  "motion-safe:[animation-delay:1400ms]",
  "motion-safe:[animation-delay:1800ms]",
  "motion-safe:[animation-delay:2200ms]",
  "motion-safe:[animation-delay:2600ms]",
];

/**
 * "Pick a case." with the mysteries lying on it as case prints. ←/→/↑/↓ anywhere moves the
 * selection, Enter opens it; clicking a print opens it directly (same grammar as the home menu).
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
      setSelected((i) => (i + step + cards.length) % cards.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards, selected, open]);

  const scattered = cards.length <= 3;

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-8 sm:px-8">
      <h1
        className={`pt-8 text-display font-bold text-white motion-safe:animate-rise sm:pt-12 ${
          scattered ? "lg:text-center" : ""
        }`}
      >
        Pick a
        <br />
        case.
      </h1>

      <ul
        className={`relative mt-10 flex flex-col items-center gap-10 sm:flex-row sm:flex-wrap sm:justify-center ${
          scattered ? "lg:-mt-12 lg:flex-nowrap lg:items-start lg:gap-0" : "lg:gap-12"
        }`}
      >
        {cards.map((card, i) => {
          const active = i === selected;
          return (
            <li
              key={card.slug}
              className={`motion-safe:animate-rise ${DELAYS[i % DELAYS.length]} ${scattered ? "lg:-mx-6" : ""} ${active ? "z-10" : "z-0"}`}
            >
              <button
                type="button"
                onMouseEnter={() => setSelected(i)}
                onFocus={() => setSelected(i)}
                onClick={() => {
                  setSelected(i);
                  void open(card.slug);
                }}
                aria-label={`${card.title}, ${card.difficulty}, ${card.playerCount} players`}
                className={`flex w-[min(80vw,20rem)] flex-col gap-4 border bg-background p-5 text-left transition focus-visible:outline-none lg:w-[min(26vw,21rem)] ${
                  active ? "rotate-0 border-orange lg:scale-105" : `${TILTS[i % TILTS.length]} border-blue/40`
                }`}
              >
                <pre aria-hidden className="font-art text-[10px] font-normal leading-tight text-orange sm:text-[11px]">
                  {card.art}
                </pre>
                <span className="text-ui font-bold text-white">{card.title}</span>
                <span className="text-body text-white">{card.victim} never landed.</span>
                <span className="text-meta">
                  <span className={DIFFICULTY_INK[card.difficulty] ?? "text-white"}>{capitalize(card.difficulty)}</span>
                  <span className="text-blue"> · {capitalize(inWords(card.playerCount))} players</span>
                </span>
                {opening === card.slug && <span className="text-meta text-orange">Opening the file…</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-10 max-w-md text-body text-blue lg:absolute lg:bottom-8 lg:left-8 lg:mt-0">
        Pick a case on this screen. Your friends join it from their phones.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-body text-red lg:absolute lg:right-8 lg:bottom-8 lg:mt-0">
          {error}
        </p>
      )}
    </div>
  );
}
