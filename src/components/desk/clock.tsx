"use client";

import { useEffect, useState } from "react";

export const mmss = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  return `${h ? `${h}:` : ""}${m}:${String(s % 60).padStart(2, "0")}`;
};

/** Counts up from `startedAt`; frozen at `endedAt`. Renders dashes until mounted (no hydration drift). */
export function Clock({ startedAt, endedAt }: { startedAt: string; endedAt: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    if (endedAt) return;
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endedAt]);
  const end = endedAt ? Date.parse(endedAt) : now;
  const secs = end == null ? null : Math.max(0, Math.round((end - Date.parse(startedAt)) / 1000));
  return (
    <span className="font-pixel text-ui text-white tabular-nums" aria-label="Time on the case">
      {secs == null ? "--:--" : mmss(secs)}
    </span>
  );
}
