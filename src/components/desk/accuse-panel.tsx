"use client";

import { useState } from "react";
import { FillButton } from "@/components/fill-button";
import { sfx } from "@/lib/sfx";
import { postJson } from "@/lib/use-room";
import type { CaseFile } from "@/mysteries/types";

type Draft = { who: number[]; nobody: boolean; motive: string; method: string };

const pick = (on: boolean) => `pixel-border flex min-h-11 w-[calc(100%-6px)] items-start gap-3 px-3 py-3 text-left text-body transition-[box-shadow] ${on ? "pb-orange text-orange" : "pb-dim text-white"}`;

/** Host-only accusation: who (suspects or no one), why, how. Submit label says what is still missing. */
export function AccusePanel({
  code,
  c,
  guessesLeft,
  onClose,
  onSent,
  initial,
}: {
  code: string;
  c: CaseFile;
  guessesLeft: number;
  onClose: () => void;
  onSent?: () => void;
  initial?: Partial<Draft>;
}) {
  const [d, setD] = useState<Draft>({ who: [], nobody: false, motive: "", method: "", ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = !d.nobody && d.who.length === 0 ? "Pick who did it" : !d.motive ? "Pick why" : !d.method ? "Pick how" : null;

  const recap = [
    d.nobody ? "No one" : d.who.map((i) => c.suspects[i]?.name).join(" and "),
    c.motives.find((m) => m.id === d.motive)?.text,
    c.methods.find((m) => m.id === d.method)?.text,
  ].filter(Boolean).join(" · ");

  const toggle = (i: number) => {
    sfx.blip();
    setD((x) => ({ ...x, nobody: false, who: x.who.includes(i) ? x.who.filter((w) => w !== i) : [...x.who, i].sort((a, b) => a - b) }));
  };

  const submit = async () => {
    if (missing || busy) return;
    setBusy(true);
    setError(null);
    sfx.clack();
    const res = await postJson<{ correct: boolean }>(`/api/rooms/${code}/guesses`, { who: d.who, nobody: d.nobody, motive: d.motive, method: d.method });
    if (res.success) {
      onSent?.(); // sender refetches itself; the doorbell brings the verdict to the other devices
      onClose();
    }
    else {
      setError(res.errorMessage);
      setBusy(false);
    }
  };

  const radios = (name: string, opts: { id: string; text: string }[], value: string, set: (id: string) => void) => (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-3 font-pixel text-ui text-white">{name === "motive" ? "Why" : "How"}</legend>
      {opts.map((o) => (
        <label key={o.id} className={`${pick(value === o.id)} cursor-pointer has-focus-visible:underline`}>
          <input
            type="radio"
            name={name}
            checked={value === o.id}
            onChange={() => {
              sfx.blip();
              set(o.id);
            }}
            className="sr-only"
          />
          <span aria-hidden className="w-[3ch] shrink-0 whitespace-pre">{value === o.id ? "(x)" : "( )"}</span>
          {o.text}
        </label>
      ))}
    </fieldset>
  );

  return (
    <section aria-label="Accusation" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-pixel text-ui text-orange">Make the accusation.</h2>
        <p className="text-body text-white">{guessesLeft === 1 ? "One guess left." : "Two guesses. All three parts must be right."}</p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-3">
  <fieldset className="flex flex-col gap-2">
          <legend className="mb-3 font-pixel text-ui text-white">Who <span className="font-sans text-body text-white">pick one or more</span></legend>
          {c.suspects.map((s, i) => (
            <label key={i} className={`${pick(d.who.includes(i))} cursor-pointer has-focus-visible:underline`}>
              <input type="checkbox" checked={d.who.includes(i)} onChange={() => toggle(i)} className="sr-only" />
              <span aria-hidden className="w-[3ch] shrink-0 whitespace-pre">{d.who.includes(i) ? "[x]" : "[ ]"}</span>
              {s.name}
            </label>
          ))}
          <label className={`${pick(d.nobody)} cursor-pointer has-focus-visible:underline`}>
            <input
              type="checkbox"
              checked={d.nobody}
              onChange={() => {
                sfx.blip();
                setD((x) => ({ ...x, who: [], nobody: !x.nobody }));
              }}
              className="sr-only"
            />
            <span aria-hidden className="w-[3ch] shrink-0 whitespace-pre">{d.nobody ? "[x]" : "[ ]"}</span>
            No one — suicide or accident
          </label>
        </fieldset>
  
        {radios("motive", c.motives, d.motive, (motive) => setD((x) => ({ ...x, motive })))}
        {radios("method", c.methods, d.method, (method) => setD((x) => ({ ...x, method })))}
      </div>

      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-blue/30 bg-background pt-3 pb-[env(safe-area-inset-bottom)] lg:static lg:max-w-lg lg:border-t-0 lg:pt-0">
        <p className="text-body text-white lg:border-t lg:border-blue/30 lg:pt-4">
          <span className="text-blue">Your accusation: </span>
          {recap || "nothing picked yet."}
        </p>
        <FillButton type="button" onClick={submit} disabled={!!missing || busy}>
          {busy ? "Sending…" : (missing ?? "Make the accusation")}
        </FillButton>
        <button type="button" onClick={onClose} className="min-h-11 self-start text-body text-white underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none">
          Back to the file
        </button>
        {error && (
          <p role="alert" className="text-body text-red motion-safe:animate-glitch">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
