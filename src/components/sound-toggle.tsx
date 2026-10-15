"use client";

import { useEffect } from "react";
import { useSound } from "@/lib/sfx";

/** Sound on/off, shared by every screen. `keyHint` also binds S (TV screens, keyboard in reach). */
export function SoundToggle({ keyHint = false, className = "" }: { keyHint?: boolean; className?: string }) {
  const [on, toggle] = useSound();

  useEffect(() => {
    if (!keyHint) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyHint, toggle]);

  return (
    <span className={`text-body text-white ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        className="min-h-11 underline-offset-4 transition-opacity hover:underline focus-visible:underline focus-visible:outline-none active:opacity-60"
      >
        Sound {on ? "on" : "off"}
      </button>
      {keyHint && <span aria-hidden> · S</span>}
    </span>
  );
}
