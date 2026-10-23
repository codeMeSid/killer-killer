"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Cover } from "@/components/cover";
import { CaseTeaser } from "@/components/case-video";
import { FillButton } from "@/components/fill-button";
import { sfx } from "@/lib/sfx";
import { capitalize, DIFFICULTY_INK, postJson } from "@/lib/use-room";
import { CATALOG, COVERS, LEXICON, TEASERS } from "@/mysteries/catalog";

/**
 * Two steps on one page. 1: pick a case cartridge. 2: the card locks small at the top right and the
 * team name opens the room and goes straight to the desk, where the rail shows the join code + QR.
 */
export function CasePicker() {
  const router = useRouter();
  const [locked, setLocked] = useState<number | null>(null);
  const [team, setTeam] = useState("");
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const card = locked === null ? undefined : CATALOG[locked];
  const ready = !!card && team.trim().length > 0 && !opening;

  // Hidden routes stay mounted (<Activity>); wipe on hide so Back starts fresh.
  useEffect(
    () => () => {
      setLocked(null);
      setTeam("");
      setOpening(false);
      setError(null);
    },
    [],
  );

  // Step 2 appears: move focus to the team name.
  useEffect(() => {
    if (locked !== null) input.current?.focus();
  }, [locked]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready || !card) return;
    setOpening(true);
    setError(null);
    sfx.clack();
    const res = await postJson<{ code: string }>("/api/rooms", { slug: card.slug, team: team.trim() });
    if (res.success && res.payload) {
      router.push(`/case/${res.payload.code}`);
      return;
    }
    setError(res.errorMessage);
    setOpening(false);
  };

  return (
    <div className="flex flex-1 flex-col gap-10 px-4 pt-8 pb-8 sm:px-8 lg:pt-12">
      <h1 className="font-pixel text-display text-white motion-safe:animate-print">{card ? "Open the case." : "Pick a case."}</h1>
      <p className="sr-only" aria-live="polite">
        {card ? `${card.title} locked. Name your team.` : ""}
      </p>

      {card ? (
        <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="pixel-border pb-orange flex w-40 flex-col justify-self-end md:order-2 md:w-[calc(100%-6px)] motion-safe:animate-rise">
            {COVERS[card.slug] ? <Cover slug={card.slug} src={COVERS[card.slug]} /> : null}
            <div className="flex flex-col gap-2 p-3">
              <p className="font-pixel text-ui text-orange">{card.title}</p>
              <p className={`text-body ${DIFFICULTY_INK[card.difficulty] ?? "text-white"}`}>{capitalize(card.difficulty)}</p>
              <button
                type="button"
                onClick={() => {
                  sfx.blip();
                  setLocked(null);
                  setError(null);
                }}
                className="min-h-11 self-start text-body text-white underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-orange"
              >
                Change case
              </button>
            </div>
          </div>

          <form onSubmit={onSubmit} className="flex min-w-0 flex-col gap-6 motion-safe:animate-rise">
            <label className="flex w-full max-w-lg flex-col gap-2 text-orange">
              <span className="font-pixel text-ui">
                <span aria-hidden>&gt; </span>Team name
              </span>
              <input
                ref={input}
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                maxLength={24}
                autoComplete="off"
                placeholder="who is on the case?"
                className="w-full border-b border-orange/40 bg-background py-2 text-body text-orange caret-orange outline-none transition-colors [caret-shape:block] placeholder:text-white/60 focus:border-orange"
              />
            </label>
            <div className="flex w-full max-w-lg flex-col gap-3">
              <FillButton type="submit" disabled={!ready}>
                {opening ? "Opening the file…" : !team.trim() ? "Name your team" : "Open case"}
              </FillButton>
              {error && (
                <p role="alert" className="text-body text-red motion-safe:animate-glitch">
                  {error}
                </p>
              )}
            </div>
          </form>
        </div>
      ) : CATALOG.length === 0 ? (
        <p className="text-body text-white">No case files on the shelf yet.</p>
      ) : (
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOG.map((c, i) => (
            <li key={c.slug} className="flex motion-safe:animate-rise">
              <button
                type="button"
                onClick={() => {
                  sfx.blip();
                  setLocked(i);
                }}
                aria-label={`${c.title}, ${c.difficulty}`}
                className="pixel-border pb-dim flex w-[calc(100%-6px)] flex-col self-stretch text-left transition-[box-shadow,transform] hover:pb-orange hover:-translate-y-1 focus-visible:pb-orange focus-visible:outline-none"
              >
                {TEASERS[c.slug] ? <CaseTeaser slug={c.slug} src={TEASERS[c.slug]} className="aspect-video w-full border-b border-blue/30 object-cover" /> : COVERS[c.slug] ? <Cover slug={c.slug} src={COVERS[c.slug]} /> : null}
                <span className="flex flex-1 flex-col gap-3 p-5">
                  <span className="font-pixel text-ui text-white">{c.title}</span>
                  <span className="text-body text-white">{LEXICON[c.slug]?.card ?? c.setting}</span>
                  <span className={`text-body ${DIFFICULTY_INK[c.difficulty] ?? "text-white"}`}>{capitalize(c.difficulty)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-auto max-w-xl text-body text-white">Everyone reads the same file. Your friends join with the code.</p>
    </div>
  );
}
