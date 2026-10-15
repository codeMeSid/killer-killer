"use client";

import { useRouter } from "next/navigation";
import { FillButton } from "@/components/fill-button";
import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { ApiResponse } from "@/lib/api";
import { capitalize, inWords, postJson } from "@/lib/use-room";

const LENGTH = 8;

type Preview = { title: string; difficulty: string; playerCount: number; seatsLeft: number; status: string };

/** What the code found, as one line under the boxes. Null `ok` means still looking. */
function describe(p: ApiResponse<Preview> | null): { text: string; ok: boolean | null } {
  if (!p) return { text: "Looking for that flight…", ok: null };
  if (!p.success || !p.payload) return { text: p.errorMessage || "No mystery with that code.", ok: false };
  const { title, difficulty, seatsLeft, status } = p.payload;
  if (status !== "lobby") return { text: "That flight has left.", ok: false };
  if (seatsLeft === 0) return { text: "Every seat is taken.", ok: false };
  return { text: `${title} · ${capitalize(difficulty)} · ${capitalize(inWords(seatsLeft))} ${seatsLeft === 1 ? "seat" : "seats"} left`, ok: true };
}

/**
 * 8-character alphanumeric join code in GitHub-style OTP boxes (XXXX–XXXX), then a name.
 * Typing advances, Backspace goes back, paste fills. Stored uppercase. A full code is looked up
 * at once, so a wrong code is caught before the name is typed.
 */
export function JoinForm({ initialCode = "" }: { initialCode?: string }) {
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: LENGTH }, (_, i) => initialCode[i] ?? ""));
  const [name, setName] = useState("");
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
      setName("");
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
  const ready = found?.ok === true && name.trim().length > 0 && !joining;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setJoining(true);
    setError(null);
    const res = await postJson<{ code: string }>(`/api/rooms/${code}/players`, { name: name.trim() });
    if (res.success && res.payload) router.push(`/lobby/${res.payload.code}`);
    else {
      setError(res.errorMessage);
      setJoining(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-lg flex-col gap-8 text-orange">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm sm:text-base">Join code</legend>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {digits.map((d, i) => (
            <Fragment key={i}>
              {i === LENGTH / 2 && (
                <span aria-hidden className="px-1 text-xl sm:px-2 sm:text-3xl">
                  –
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
                className="h-14 w-8 rounded-md border border-orange/40 bg-background text-center text-2xl font-bold text-orange caret-orange outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/30 sm:h-20 sm:w-13 sm:text-4xl"
              />
            </Fragment>
          ))}
        </div>
        <p aria-live="polite" className={`min-h-6 text-meta sm:text-body ${found?.ok === false ? "text-red" : "text-blue"}`}>
          {found?.text ?? ""}
        </p>
      </fieldset>

      <label className="flex w-full flex-col gap-2 text-sm sm:text-base">
        <span>Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          autoComplete="off"
          placeholder="who are you?"
          className="w-full border-b border-orange/40 bg-background py-2 text-base text-orange caret-orange outline-none transition-colors placeholder:text-orange/40 focus:border-orange sm:text-lg"
        />
      </label>

      <div className="flex flex-col gap-3">
        <FillButton type="submit" disabled={!ready}>
          {joining ? "Boarding…" : "Join Mystery"}
        </FillButton>
        {error && (
          <p role="alert" className="text-meta text-red sm:text-body">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
