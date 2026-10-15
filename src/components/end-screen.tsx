"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FillButton } from "@/components/fill-button";
import { Ground, groundClass } from "@/components/ground";
import { Machine } from "@/components/machine";
import { StoryArt } from "@/components/story-art";
import { PhaseBar } from "@/components/phase-bar";
import { RoomLoading } from "@/components/room-loading";
import type { EndingKey } from "@/lib/engine/types";
import type { BaseView, HostView, PlayerView } from "@/lib/engine/view";
import { sfx } from "@/lib/sfx";
import { useRoom } from "@/lib/use-room";
import { lexiconFor } from "@/mysteries/catalog";
import type { Lexicon } from "@/mysteries/types";

// Two-line headlines per ending. The tree's own title runs underneath.
const HEADLINE: Record<EndingKey, [string, string]> = {
  solved: ["Case", "closed."],
  wrong_culprit: ["Wrong", "culprit."],
  culprit_escapes: ["They got", "away."],
};

export function EndScreen({ code }: { code: string }) {
  const { view, error } = useRoom(code);
  if (!view?.ending) return <RoomLoading error={error?.message ?? null} />;
  return view.role === "host" ? <HostEnd view={view} /> : <PlayerEnd view={view} />;
}

function BackHome() {
  const router = useRouter();
  return (
    <div className="max-w-sm">
      <FillButton type="button" onClick={() => router.push("/")}>
        Back to home
      </FillButton>
    </div>
  );
}

/** The sting lands with the reveal, `delay` ms after the screen powers on. */
function useRevealSting(delay: number) {
  useEffect(() => {
    const t = setTimeout(() => sfx.sting(), delay);
    return () => clearTimeout(t);
  }, [delay]);
}

/** The cast, reading right: who played whom, and how it ended for them. */
function Cast({ ending, words }: { ending: NonNullable<BaseView["ending"]>; words: Lexicon["end"] }) {
  return (
    <section className="grid gap-8 border-t border-blue/30 pt-8 lg:grid-cols-12">
      <h2 className="font-pixel text-ui text-white lg:col-span-4">{words.cast}</h2>
      <ul className="flex flex-col gap-5 lg:col-span-6 lg:col-start-7">
        {ending.fates.map((f) => (
          <li key={f.player} className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 text-body">
            <span className="text-white">
              {f.character ?? f.player}
              {f.character && <span className="text-blue"> · {f.player}</span>}
            </span>
            <span className={f.killer ? "text-orange" : f.alive ? "text-green" : "text-red"}>
              {f.killer ? "the killer" : f.alive ? words.alive : words.dead}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HostEnd({ view }: { view: HostView }) {
  const ending = view.ending!;
  const [top, bottom] = HEADLINE[ending.key];
  const solved = ending.key === "solved";
  const words = lexiconFor(view.mystery.slug);
  useRevealSting(3200);
  return (
    <Machine kind="tv" className={`min-h-svh overflow-hidden ${groundClass(9)}`}>
      <PhaseBar ink={solved ? "green" : "red"}>
        <span className="font-pixel">{view.mystery.title}</span>
      </PhaseBar>
      <div className="relative z-10 flex flex-1 flex-col gap-16 px-4 pt-10 pb-16 sm:px-8">
        {/* Dropped so the second line sinks below the ground line and takes the seam's blue. */}
        <section className="grid gap-8 pt-[22svh] lg:grid-cols-12 lg:items-start">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <h1
              className={`seam-ink font-pixel text-display motion-safe:animate-glitch motion-safe:[animation-delay:700ms] ${solved ? "[--seam-top:var(--green)]" : "[--seam-top:var(--red)]"}`}
            >
              {top}
              <br />
              {bottom}
            </h1>
            <p className="font-pixel text-ui text-white motion-safe:animate-rise motion-safe:[animation-delay:800ms]">{ending.title}</p>
          </div>
          <StoryArt slug={view.mystery.slug} variant="end" className="lg:col-span-5 lg:justify-self-end" />
        </section>
        <p className="max-w-3xl text-ui text-white motion-safe:animate-rise motion-safe:[animation-delay:1600ms]">{ending.epilogue}</p>
        <p className="font-pixel text-statement text-orange motion-safe:animate-flicker-in motion-safe:[animation-delay:3200ms]">
          {ending.killer.character} did it{ending.killer.player ? `, played by ${ending.killer.player}` : ""}.
        </p>
        <Cast ending={ending} words={words.end} />
        <BackHome />
      </div>
      <Ground glyphs={words.glyphs} />
    </Machine>
  );
}

export function PlayerEnd({ view }: { view: PlayerView }) {
  const ending = view.ending!;
  const won = view.won === true;
  const killer = view.me?.killer ?? false;
  const words = lexiconFor(view.mystery.slug);
  useRevealSting(400);
  const why = killer
    ? won
      ? "You got away with it."
      : "They caught you."
    : won
      ? words.end.truth
      : `${ending.killer.character} got away with it.`;
  return (
    <Machine kind="terminal">
      <PhaseBar ink={won ? "green" : "red"} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 pt-8 pb-10 sm:px-8">
        <h1 className={`font-pixel text-display motion-safe:animate-glitch ${won ? "text-green" : "text-red"}`}>
          You {won ? "win" : "lose"}.
        </h1>
        <p className="font-pixel text-statement text-white motion-safe:animate-rise motion-safe:[animation-delay:800ms]">{why}</p>
        <section className="flex flex-col gap-3 motion-safe:animate-rise motion-safe:[animation-delay:1600ms]">
          <h2 className="font-pixel text-ui text-white">{ending.title}</h2>
          <p className="text-body text-white">{ending.epilogue}</p>
        </section>
        <Cast ending={ending} words={words.end} />
        <BackHome />
      </div>
    </Machine>
  );
}
