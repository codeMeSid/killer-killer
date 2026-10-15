"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sfx } from "@/lib/sfx";

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
      sfx.clack();
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
      sfx.blip();
      setSelected((i) => (i + step + OPTIONS.length) % OPTIONS.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, selected]);

  return (
    <fieldset className="flex flex-col gap-5 font-arcade text-meta sm:text-body">
      <legend className="sr-only">Choose mode</legend>
      {OPTIONS.map((o, i) => (
        <label
          key={o.value}
          onClick={(e) => {
            // Label clicks are re-dispatched to the radio, and arrow keys fire synthetic radio
            // clicks too — act only on the real click on the label itself.
            if (e.target instanceof HTMLInputElement) return;
            sfx.clack();
            if (o.href) router.push(o.href);
          }}
          className={`flex min-h-11 cursor-pointer items-center gap-3 text-red uppercase transition-colors has-checked:text-orange has-focus-visible:underline motion-safe:animate-rise ${
            i === 1 ? "motion-safe:[animation-delay:500ms]" : "motion-safe:[animation-delay:250ms]"
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
          {o.label}
          <span aria-hidden className="invisible inline-block h-[1.1em] w-[0.7em] bg-orange peer-checked:visible motion-safe:animate-blink" />
        </label>
      ))}
    </fieldset>
  );
}
