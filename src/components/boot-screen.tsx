"use client";

import { useEffect, useState, type ReactNode } from "react";

const LINES = [
  "KILLER-KILLER BASIC V1",
  "64K RAM SYSTEM  38911 BYTES FREE",
  "READY.",
  'LOAD "KILLER",8,1',
  "SEARCHING FOR KILLER",
  "LOADING",
  "READY.",
  "RUN",
];
const STEP_MS = 240;
const KEY = "kk:booted";

function bootedBefore() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * The home computer starting up: a few lines of BASIC and a tape-loader stripe, then `children`
 * (the title and menu). About two seconds the first time per session, instant after that, and any
 * key or tap skips it. The key that skips is swallowed so it can't also pick a menu item.
 */
export function BootScreen({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(0);
  const done = shown > LINES.length;

  useEffect(() => {
    if (done) return;
    const finish = () => {
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        // storage blocked: boot again next visit
      }
      setShown(LINES.length + 1);
    };
    const t = setTimeout(() => (bootedBefore() ? finish() : shown >= LINES.length ? finish() : setShown((n) => n + 1)), shown === 0 && bootedBefore() ? 0 : STEP_MS);
    const skip = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      finish();
    };
    window.addEventListener("keydown", skip, { capture: true });
    window.addEventListener("pointerdown", skip, { capture: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", skip, { capture: true });
      window.removeEventListener("pointerdown", skip, { capture: true });
    };
  }, [shown, done]);

  if (done) return <>{children}</>;

  return (
    <section aria-label="Starting up" className="flex w-full max-w-3xl flex-1 flex-col gap-1 px-4 pt-10 font-pixel text-body text-blue sm:px-8 sm:text-ui">
      {LINES.slice(0, shown).map((line, i) => (
        <p key={i} className={line === "READY." ? "text-white" : ""}>
          {line}
        </p>
      ))}
      {shown >= 6 && <div aria-hidden className="raster my-3 h-6 w-full motion-safe:animate-raster" />}
      <span aria-hidden className="inline-block h-[1lh] w-[0.6em] bg-blue motion-safe:animate-blink" />
      <p className="mt-auto pb-8 text-meta text-blue">Press any key</p>
    </section>
  );
}
