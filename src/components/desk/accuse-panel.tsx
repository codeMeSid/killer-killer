"use client";

import { useState } from "react";
import { FillButton } from "@/components/fill-button";
import { sfx } from "@/lib/sfx";
import { postJson } from "@/lib/use-room";
import type { CaseFile } from "@/mysteries/types";

type Draft = { who: number[]; nobody: boolean; motive: string; method: string };

const pick = (on: boolean) => `pixel-border flex min-h-11 w-[calc(100%-6px)] items-center gap-3 px-3 py-2 text-left text-body transition-[box-shadow] ${on ? "pb-orange text-orange" : "pb-dim text-white"}`;

/** Host-only accusation: who (suspects or no one), why, how. Submit label says what is still missing. */
export function AccusePanel({
  code,
  c,
  guessesLeft,
  onClose,
  initial,
}: {
  code: string;
  c: CaseFile;
  guessesLeft: number;
  onClose: () => void;
  initial?: Partial<Draft>;
}) {
  const [d, setD] = useState<Draft>({ who: [], nobody: false, motive: "", method: "", ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = !d.nobody && d.who.length === 0 ? "Pick who did it" : !d.motive ? "Pick why" : !d.method ? "Pick how" : null;

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
    if (res.success) onClose(); // the doorbell brings the verdict to every device
    else {
      setError(res.errorMessage);
      setBusy(false);
    }
  };

  const radios = (name: string, opts: { id: string; text: string }[], value: string, set: (id: string) => void) => (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-pixel text-ui text-blue">{name === "motive" ? "Why" : "How"}</legend>
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
          <span aria-hidden>{value === o.id ? "(x)" : "( )"}</span>
          {o.text}
        </label>
      ))}
    </fieldset>
  );

  return (
    <section aria-label="Accusation" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-pixel text-statement text-white">Make the accusation.</h2>
        <p className="text-body text-white">{guessesLeft === 1 ? "One guess left." : "Two guesses. All three parts must be right."}</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-pixel text-ui text-blue">Who</legend>
        {c.suspects.map((s, i) => (
          <label key={i} className={`${pick(d.who.includes(i))} cursor-pointer has-focus-visible:underline`}>
            <input type="checkbox" checked={d.who.includes(i)} onChange={() => toggle(i)} className="sr-only" />
            <span aria-hidden>{d.who.includes(i) ? "[x]" : "[ ]"}</span>
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
          <span aria-hidden>{d.nobody ? "[x]" : "[ ]"}</span>
          No one — suicide or accident
        </label>
      </fieldset>

      {radios("motive", c.motives, d.motive, (motive) => setD((x) => ({ ...x, motive })))}
      {radios("method", c.methods, d.method, (method) => setD((x) => ({ ...x, method })))}

      <div className="flex max-w-lg flex-col gap-3">
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
