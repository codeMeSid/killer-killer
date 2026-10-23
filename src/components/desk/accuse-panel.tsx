"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { FillButton } from "@/components/fill-button";
import { sfx } from "@/lib/sfx";
import { PORTRAITS } from "@/mysteries/catalog";
import { postJson } from "@/lib/use-room";
import type { CaseFile } from "@/mysteries/types";

export type Draft = { who: number[]; nobody: boolean; motive: string; method: string };

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const card = (on: boolean) => `pixel-border relative flex w-[calc(100%-6px)] cursor-pointer flex-col gap-2 p-3 text-left text-body transition-[box-shadow] has-focus-visible:underline ${on ? "pb-orange text-orange" : "pb-dim text-white"}`;
const slip = (on: boolean) => `pixel-border relative flex min-h-11 w-[calc(100%-6px)] cursor-pointer items-start gap-3 px-3 py-3 text-left text-body transition-[box-shadow] has-focus-visible:underline ${on ? "pb-green text-white" : "pb-dim text-white"}`;

/** Host-only accusation: who (suspects or no one), why, how. Submit label says what is still missing. */
export function AccusePanel({
  code,
  c,
  guessesLeft,
  onClose,
  onSent,
  d,
  setD,
}: {
  code: string;
  c: CaseFile;
  guessesLeft: number;
  onClose: () => void;
  onSent?: () => Promise<unknown> | void;
  d: Draft;
  setD: Dispatch<SetStateAction<Draft>>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const actions = useRef<HTMLDivElement>(null);
  const toggled = useRef(false);

  // Confirm/Back unmount the focused button; hand focus to the first live one (not on first render).
  useEffect(() => {
    if (!toggled.current) return void (toggled.current = true);
    actions.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
  }, [confirm]);
  const [hit, setHit] = useState(false);

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
    setHit(true);
    setError(null);
    sfx.stamp();
    const res = await postJson<{ correct: boolean }>(`/api/rooms/${code}/guesses`, { who: d.who, nobody: d.nobody, motive: d.motive, method: d.method });
    if (res.success) {
      await onSent?.(); // sender refetches itself (panel stays up till the verdict lands, no blank desk); the doorbell brings it to the others
      onClose();
    }
    else {
      setError(res.errorMessage);
      setBusy(false);
      setHit(false);
      setConfirm(false);
    }
  };

  const radios = (name: string, opts: { id: string; text: string }[], value: string, set: (id: string) => void) => (
    <fieldset role="radiogroup" className="flex flex-col gap-2">
      <legend className="mb-3 font-pixel text-ui text-white">{name === "motive" ? "Why" : "How"}</legend>
      {opts.map((o, n) => (
        <label key={o.id} className={slip(value === o.id)}>
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
          <span aria-hidden className="w-[7ch] shrink-0 font-pixel text-meta text-blue">SLIP {n + 1}</span>
          <span className="flex-1">{o.text}</span>
          {value === o.id && <span aria-hidden className="font-pixel text-ui text-green motion-safe:animate-flicker-in">✓</span>}
        </label>
      ))}
    </fieldset>
  );

  const portraits = PORTRAITS[c.slug] ?? {};

  return (
    <section aria-label="Accusation" className={`flex flex-col gap-8 ${hit ? "motion-safe:animate-glitch" : ""}`}>
      <div className="flex flex-col gap-2">
        <h2 className="font-pixel text-ui text-orange">Make the accusation.</h2>
        <p className="text-body text-white">{guessesLeft === 1 ? "One guess left." : "Two guesses. All three parts must be right."}</p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-3">
        <fieldset className="flex flex-col gap-2 lg:col-span-3">
          <legend className="mb-3 font-pixel text-ui text-white">Who <span className="font-sans text-body text-white">pick one or more</span></legend>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {c.suspects.map((s, i) => {
              const on = d.who.includes(i);
              const src = portraits[String(i)];
              return (
                <label key={i} className={card(on)}>
                  <input type="checkbox" checked={on} onChange={() => toggle(i)} className="sr-only" />
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="aspect-square w-full border border-blue/30 object-cover" />
                  ) : (
                    <span aria-hidden className="flex aspect-square w-full items-center justify-center border border-blue/30 font-pixel text-display text-blue">{initials(s.name)}</span>
                  )}
                  <span className="text-white">{s.name}</span>
                  <span className="text-meta text-white">{s.role}</span>
                  {on && <span aria-hidden className="absolute top-2 right-2 -rotate-6 border-2 border-red bg-background px-1 font-pixel text-meta text-red motion-safe:animate-flicker-in">SUSPECT</span>}
                </label>
              );
            })}
            <label className={card(d.nobody)}>
              <input
                type="checkbox"
                checked={d.nobody}
                onChange={() => {
                  sfx.blip();
                  setD((x) => ({ ...x, who: [], nobody: !x.nobody }));
                }}
                className="sr-only"
              />
              <span aria-hidden className="flex aspect-square w-full items-center justify-center border border-dashed border-blue/30 font-pixel text-display text-blue">?</span>
              <span className="text-white">No one</span>
              <span className="text-meta text-white">Suicide or accident</span>
              {d.nobody && <span aria-hidden className="absolute top-2 right-2 -rotate-6 border-2 border-red bg-background px-1 font-pixel text-meta text-red motion-safe:animate-flicker-in">NO ONE</span>}
            </label>
          </div>
        </fieldset>

        <div className="lg:col-span-3 grid gap-8 lg:grid-cols-2">
          {radios("motive", c.motives, d.motive, (motive) => setD((x) => ({ ...x, motive })))}
          {radios("method", c.methods, d.method, (method) => setD((x) => ({ ...x, method })))}
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-blue/30 bg-background pt-3 pb-[env(safe-area-inset-bottom)] lg:static lg:max-w-lg lg:border-t-0 lg:pt-0">
        {busy && <p role="status" className="text-body text-orange motion-safe:animate-flicker-in">Checking the accusation…</p>}
        <p key={recap} className="pixel-border pb-blue w-[calc(100%-6px)] p-3 text-body text-white motion-safe:animate-print">
          <span className="text-blue">Accusation slip: </span>
          {recap || "nothing picked yet."}
        </p>
        <div ref={actions} className="flex flex-col gap-3">
        {confirm ? (
          <div className="flex flex-col gap-3">
            <p role="status" className="text-body text-white">Two guesses. This is your {guessesLeft === 2 ? "first" : "last"}. Present it?</p>
            <FillButton type="button" onClick={submit} disabled={busy || !!missing}>
              {busy ? "Sending…" : "Present"}
            </FillButton>
            <button type="button" onClick={() => setConfirm(false)} disabled={busy} className="min-h-11 self-start text-body text-white underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none">
              Back
            </button>
          </div>
        ) : (
          <>
            <FillButton type="button" onClick={() => { sfx.clack(); setConfirm(true); }} disabled={!!missing}>
              {missing ?? "Make the accusation"}
            </FillButton>
            <button type="button" onClick={onClose} className="min-h-11 self-start text-body text-white underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none">
              Back to the file
            </button>
          </>
        )}
        </div>
        {error && (
          <p role="alert" className="text-body text-red motion-safe:animate-glitch">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
