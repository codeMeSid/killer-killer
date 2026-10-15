"use client";

import { useEffect, useState } from "react";
import type { ApiResponse } from "@/lib/api";

type Check = { ok: boolean; detail: string };
type Health = { supabase: Check; ably: Check };

export function ServiceStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json() as Promise<ApiResponse<Health>>)
      .then((body) => {
        if (cancelled) return;
        if (body.payload) setHealth(body.payload);
        else setError(body.errorMessage || "Health check failed");
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // A failed fetch is itself a failed check — don't leave the row stuck in "checking".
  const failed = error ? { ok: false, detail: error } : null;
  const rows: Array<[string, Check | null]> = [
    ["Supabase", health?.supabase ?? failed],
    ["Ably", health?.ably ?? failed],
  ];

  return (
    <section className="rounded-2xl border border-blue/40 p-4 sm:p-6">
      <h2 className="text-sm font-semibold tracking-wide text-blue uppercase">Connections</h2>
      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {rows.map(([name, check]) => (
          <div
            key={name}
            className="flex flex-col gap-1 rounded-xl border border-blue/30 p-3 sm:p-4"
          >
            <dt className="flex items-center gap-2 text-base font-medium text-white">
              <span
                aria-hidden
                className={`size-2.5 shrink-0 rounded-full ${
                  check === null
                    ? "animate-pulse bg-blue"
                    : check.ok
                      ? "bg-green"
                      : "bg-red"
                }`}
              />
              {name}
              <span className="sr-only">
                {check === null ? "checking" : check.ok ? "connected" : "failed"}
              </span>
            </dt>
            <dd
              className={`font-mono text-xs break-words ${
                check === null ? "text-blue" : check.ok ? "text-green" : "text-red"
              }`}
            >
              {check?.detail ?? "checking…"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
