"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { FillButton } from "@/components/fill-button";
import { StoryArt } from "@/components/story-art";
import { sfx } from "@/lib/sfx";
import { capitalize, DIFFICULTY_INK, postJson } from "@/lib/use-room";
import { ART, CATALOG, LEXICON } from "@/mysteries/catalog";

/**
 * "Pick a case." A row of cartridges (one per case, each with its Hairline figure while selected),
 * then the team name. Submitting creates the room; this device becomes the host and agent one.
 */
export function CasePicker() {
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const [team, setTeam] = useState("");
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const card = CATALOG[selected];
  const ready = !!card && team.trim().length > 0 && !opening;

  // Hidden routes stay mounted (<Activity>); wipe on hide so Back starts fresh.
  useEffect(
    () => () => {
      setTeam("");
      setOpening(false);
      setError(null);
    },
    [],
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setOpening(true);
    setError(null);
    sfx.clack();
    const res = await postJson<{ code: string }>("/api/rooms", { slug: card.slug, team: team.trim() });
    if (res.success && res.payload) router.push(`/case/${res.payload.code}`);
    else {
      setError(res.errorMessage);
      setOpening(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-10 px-4 pt-8 pb-8 sm:px-8 lg:pt-12">
      <h1 className="font-pixel text-display text-white motion-safe:animate-print">Pick a case.</h1>

      {CATALOG.length === 0 ? (
        <p className="text-body text-white">No case files on the shelf yet.</p>
      ) : (
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOG.map((c, i) => {
            const active = i === selected;
            return (
              <li key={c.slug} className="flex motion-safe:animate-rise">
                <button
                  type="button"
                  onClick={() => {
                    sfx.blip();
                    setSelected(i);
                  }}
                  aria-pressed={active}
                  aria-label={`${c.title}, ${c.difficulty}`}
                  className={`pixel-border flex w-[calc(100%-6px)] flex-col self-stretch text-left transition-[box-shadow,transform] focus-visible:outline-none ${
                    active ? "pb-orange -translate-y-1" : "pb-dim"
                  }`}
                >
                  {ART[c.slug] && <StoryArt slug={c.slug} variant="card" play={active} className="border-b border-blue/30" />}
                  <span className="flex flex-1 flex-col gap-3 p-5">
                    <span className={`font-pixel text-ui ${active ? "text-orange" : "text-white"}`}>{c.title}</span>
                    <span className="text-body text-white">{LEXICON[c.slug]?.card ?? c.setting}</span>
                    <span className={`text-body ${DIFFICULTY_INK[c.difficulty] ?? "text-white"}`}>{capitalize(c.difficulty)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <label className="flex w-full max-w-lg flex-col gap-2 text-orange">
        <span className="font-pixel text-ui">
          <span aria-hidden>&gt; </span>Team name
        </span>
        <input
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          maxLength={24}
          autoComplete="off"
          placeholder="who is on the case?"
          className="w-full border-b border-orange/40 bg-background py-2 text-body text-orange caret-orange outline-none transition-colors [caret-shape:block] placeholder:text-orange/60 focus:border-orange"
        />
      </label>

      <div className="flex w-full max-w-lg flex-col gap-3">
        <FillButton type="submit" disabled={!ready}>
          {opening ? "Opening the file…" : !card ? "No case to open" : !team.trim() ? "Name your team" : "Start Case"}
        </FillButton>
        {error && (
          <p role="alert" className="text-body text-red motion-safe:animate-glitch">
            {error}
          </p>
        )}
      </div>

      <p className="mt-auto max-w-xl text-body text-blue">Everyone reads the same file. Your friends join with the code.</p>
    </form>
  );
}
