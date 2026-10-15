"use client";

import { useEffect, type ReactNode } from "react";
import { sfx, unlockOnGesture } from "@/lib/sfx";

export type MachineKind = "tv" | "terminal" | "computer";

/**
 * The retro machine a screen runs on (CLAUDE.md §14): TV screens are a CRT television, phones a
 * handheld terminal, the home and case picker an 80s home computer. Sets the pixel face for
 * `font-pixel` and lays the glass over the screen: scanlines (all), vignette + rolling band (TV),
 * and on a TV a power-on and a burst of channel snow each time the screen is entered.
 */
export function Machine({ kind, children, className = "" }: { kind: MachineKind; children: ReactNode; className?: string }) {
  useEffect(() => {
    const unlock = unlockOnGesture();
    if (kind === "tv") {
      sfx.static(0.4);
      sfx.thump();
    }
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [kind]);

  return (
    <div data-machine={kind} className={`relative flex flex-1 flex-col ${className}`}>
      <div className={`flex flex-1 flex-col ${kind === "tv" ? "motion-safe:animate-power-on" : ""}`}>{children}</div>
      {kind === "tv" && (
        <>
          <div aria-hidden className="snow pointer-events-none fixed inset-0 z-50 opacity-0 motion-safe:animate-static-burst" />
          <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
            <div className="machine-band hidden motion-safe:block motion-safe:animate-scan-roll" />
          </div>
        </>
      )}
      <div aria-hidden className="machine-glass pointer-events-none fixed inset-0 z-40 motion-safe:animate-hum" />
    </div>
  );
}
