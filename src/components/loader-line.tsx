"use client";

import { useEffect, useState } from "react";

const EVERY_MS = 3200;

/**
 * A terminal status line that cycles through the story's own loader phrases ("Checking the rig")
 * while a screen waits. Decorative: the screen states what it is waiting for elsewhere.
 */
export function LoaderLine({ lines, className = "" }: { lines: string[]; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (lines.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % lines.length), EVERY_MS);
    return () => clearInterval(t);
  }, [lines.length]);
  const line = lines[i % Math.max(1, lines.length)] ?? "";
  return (
    <p aria-hidden className={`font-pixel text-blue ${className}`}>
      <span className="text-orange">&gt; </span>
      <span key={i} className="inline-block motion-safe:animate-print">
        {line}
      </span>
      <span className="ml-[0.15em] inline-block w-[0.55em] bg-blue motion-safe:animate-blink">&nbsp;</span>
    </p>
  );
}
