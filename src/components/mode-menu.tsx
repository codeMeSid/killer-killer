"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const OPTIONS = [
  { value: "start", label: "Start Mystery", href: "/start" },
  { value: "join", label: "Join Mystery", href: "/join" },
] as const;

/**
 * Terminal-style picker. ↑/↓/←/→ anywhere on the page moves the selection, Enter opens it.
 * Clicking an option selects and opens it in one go.
 */
export function ModeMenu() {
  const router = useRouter();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const open = (i: number) => {
      const href = OPTIONS[i].href;
      if (href) router.push(href);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        open(selected);
        return;
      }
      // A focused radio already handles arrows natively; don't move twice.
      if (e.target instanceof HTMLInputElement && e.target.type === "radio") return;
      const step =
        e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      setSelected((i) => (i + step + OPTIONS.length) % OPTIONS.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, selected]);

  return (
    <fieldset className="flex flex-col gap-3 text-base sm:text-lg">
      <legend className="sr-only">Choose mode</legend>
      {OPTIONS.map((o, i) => (
        <label
          key={o.value}
          onClick={(e) => {
            // Label clicks are re-dispatched to the radio, and arrow keys fire synthetic radio
            // clicks too — act only on the real click on the label itself.
            if (e.target instanceof HTMLInputElement) return;
            if (o.href) router.push(o.href);
          }}
          className={`flex cursor-pointer items-center gap-3 text-red transition-colors has-checked:text-orange has-focus-visible:underline motion-safe:animate-option ${
            i === 1 ? "motion-safe:[animation-delay:6.4s]" : ""
          }`}
        >
          <input
            type="radio"
            name="mode"
            value={o.value}
            checked={selected === i}
            onChange={() => setSelected(i)}
            className="peer sr-only"
          />
          <span aria-hidden className="invisible before:content-['●'] peer-checked:visible" />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
