"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StoryArt } from "@/components/story-art";
import { capitalize, inWords } from "@/lib/use-room";
import { sfx } from "@/lib/sfx";
import { ART } from "@/mysteries/catalog";
import type { Lexicon } from "@/mysteries/types";
import type { RoomView } from "@/lib/rooms";
import { mmss } from "./clock";

/** The end: verdict headline, true story, the solution, time, guesses, ranks, link to the board. */
export function Reveal({ view, words }: { view: RoomView & { ending: NonNullable<RoomView["ending"]> }; words: Lexicon }) {
  const { ending, case: c } = view;
  const solved = view.status === "solved";
  const { solution } = ending;
  const who = solution.killers.length ? solution.killers.map((k) => c.suspects[k]?.name ?? "?").join(" and ") : "No one — suicide or accident";
  const why = c.motives.find((m) => m.id === solution.motive)?.text ?? "";
  const how = c.methods.find((m) => m.id === solution.method)?.text ?? "";

  useEffect(() => {
    if (solved) sfx.chime();
    else sfx.thump();
  }, [solved]);

  return (
    <div className="flex flex-1 flex-col gap-10 px-4 pt-8 pb-10 sm:px-8 lg:pt-12">
      <header className="flex flex-col gap-3">
        <h1 className={`font-pixel text-display motion-safe:animate-glitch ${solved ? "text-green" : "text-red"}`}>{solved ? words.solved : words.defeated}</h1>
        <p className="text-ui text-white">
          Team {view.team} · {mmss(ending.seconds)} · {capitalize(inWords(view.guessesUsed))} {view.guessesUsed === 1 ? "guess" : "guesses"}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-3 border-t border-blue/30 pt-4">
            <h2 className="font-pixel text-ui text-blue">What happened</h2>
            {solution.story.map((p, i) => (
              <p key={i} className="max-w-prose text-body text-white">
                {p}
              </p>
            ))}
          </section>
          <section className="flex flex-col gap-3 border-t border-blue/30 pt-4">
            <h2 className="font-pixel text-ui text-blue">The answer</h2>
            <dl className="flex flex-col gap-3 text-body text-white">
              <div>
                <dt className="text-meta text-blue">Who</dt>
                <dd>{who}</dd>
              </div>
              <div>
                <dt className="text-meta text-blue">Why</dt>
                <dd>{why}</dd>
              </div>
              <div>
                <dt className="text-meta text-blue">How</dt>
                <dd>{how}</dd>
              </div>
            </dl>
          </section>
          {solved && (
            <section className="flex flex-col gap-2 border-t border-blue/30 pt-4 text-body text-white">
              <h2 className="font-pixel text-ui text-blue">Your place</h2>
              {ending.caseRank != null && <p className="text-green">Place {inWords(ending.caseRank)} for this case.</p>}
              {ending.globalRank != null && <p className="text-green">Place {inWords(ending.globalRank)} overall.</p>}
            </section>
          )}
          <div className="flex flex-wrap gap-6 text-body">
            <Link href={`/leaderboard?slug=${view.slug}`} className="min-h-11 text-orange underline underline-offset-4">
              See the leaderboard
            </Link>
            <Link href="/" className="min-h-11 text-white underline-offset-4 hover:underline focus-visible:underline">
              Back to the start
            </Link>
          </div>
        </div>
        {ART[view.slug] && <StoryArt slug={view.slug} variant="end" />}
      </div>
    </div>
  );
}
