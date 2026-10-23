"use client";

import { useRouter } from "next/navigation";
import { FillButton } from "@/components/fill-button";
import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { ApiResponse } from "@/lib/api";
import { sfx } from "@/lib/sfx";
import { capitalize, postJson } from "@/lib/use-room";

const LENGTH = 8;

type Preview = { title: string; difficulty: string; team: string; status: string; slug: string };

/** What the code found, as one line under the boxes. Null `ok` = still looking. */
function describe(p: ApiResponse<Preview> | null): { text: string; ok: boolean | null } {
  if (!p) return { text: "Searching…", ok: null };
  if (!p.success || !p.payload) return { text: p.errorMessage || "No case with that code.", ok: false };
  const { title, difficulty, team, status } = p.payload;
  if (status !== "playing") return { text: "That case is closed.", ok: false };
  return { text: `${title} · ${capitalize(difficulty)} · Team ${team}`, ok: true };
}

/**
 * 8-character alphanumeric join code in GitHub-style OTP boxes (XXXX–XXXX). No name: devices become Agents.
 * Typing advances, Backspace goes back, paste fills. Stored uppercase. A full code is looked up
 * at once, so a wrong code is caught before joining.
 */
export function JoinForm({ initialCode = "" }: { initialCode?: string }) {
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: LENGTH }, (_, i) => initialCode[i] ?? ""));
  const [preview, setPreview] = useState<{ code: string; res: ApiResponse<Preview> } | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const code = digits.join("");
  const complete = code.length === LENGTH;

  useEffect(() => {
    if (!complete) return;
    let live = true;
    fetch(`/api/rooms/${code}/preview`, { cache: "no-store" })
      .then((r) => r.json() as Promise<ApiResponse<Preview>>)
      .catch((): ApiResponse<Preview> => ({ success: false, errorMessage: "The line went dead. Try again.", errorCode: 0, payload: null }))
      .then((res) => live && setPreview({ code, res }));
    return () => {
      live = false;
    };
  }, [code, complete]);

  // Next keeps visited routes alive in a hidden <Activity>, so state would survive a round-trip.
  // Effects clean up when the route is hidden — wipe the form then so every visit starts fresh
  // (back to the QR's code, if it came with one). Never persist what was typed.
  useEffect(
    () => () => {
      setDigits(Array.from({ length: LENGTH }, (_, i) => initialCode[i] ?? ""));
      setError(null);
      setJoining(false);
    },
    [initialCode],
  );

  const focus = (i: number) => boxes.current[Math.min(LENGTH - 1, Math.max(0, i))]?.focus();

  // Writes characters starting at box `start` — one typed key or a whole pasted/autofilled code.
  const fill = (start: number, text: string) => {
    const incoming = text
      .replace(/[^a-z0-9]/gi, "")
      .toUpperCase()
      .slice(0, LENGTH - start)
      .split("");
    if (!incoming.length) return;
    setDigits((d) => {
      const next = [...d];
      incoming.forEach((c, k) => (next[start + k] = c));
      return next;
    });
    focus(start + incoming.length);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      setDigits((d) => d.map((c, k) => (k === i - 1 ? "" : c)));
      focus(i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  };

  const found = complete ? describe(preview?.code === code ? preview.res : null) : null;
  const ready = found?.ok === true && !joining;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setJoining(true);
    setError(null);
    const res = await postJson<{ code: string }>(`/api/rooms/${code}/members`);
    if (res.success && res.payload) {
      sfx.clack();
      router.push(`/case/${res.payload.code}`);
    } else {
      setError(res.errorMessage);
      setJoining(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-lg flex-col gap-8 text-orange">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-pixel text-ui">
          <span aria-hidden>&gt; </span>Join code
        </legend>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {digits.map((d, i) => (
            <Fragment key={i}>
              {i === LENGTH / 2 && (
                <span aria-hidden className="px-1 font-pixel text-ui sm:px-2">
                  -
                </span>
              )}
              <input
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                value={d}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Character ${i + 1}`}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => onKeyDown(i, e)}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw) setDigits((ds) => ds.map((c, k) => (k === i ? "" : c)));
                  else fill(i, raw);
                }}
                className="pixel-border pb-dim h-14 w-7 bg-background text-center font-pixel text-statement text-orange caret-orange outline-none transition-[box-shadow] [caret-shape:block] focus:pb-orange sm:h-20 sm:w-12"
              />
            </Fragment>
          ))}
        </div>
        <p
          key={found?.text}
          aria-live="polite"
          className={`min-h-[2lh] text-body ${found?.ok === false ? "text-red motion-safe:animate-glitch" : found?.ok ? "text-white" : "text-blue"}`}
        >
          {found && <span aria-hidden className="text-orange">&gt; </span>}
          {found?.text ?? ""}
        </p>
      </fieldset>

      <div className="flex flex-col gap-3">
        <FillButton type="submit" disabled={!ready}>
          {joining ? "Joining…" : found?.ok === false ? "Check the code" : "Join Case"}
        </FillButton>
        {error && (
          <p role="alert" className="text-body text-red motion-safe:animate-glitch">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
