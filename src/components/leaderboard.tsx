"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApiResponse } from "@/lib/api";
import { mmss } from "@/components/desk/clock";
import { CATALOG } from "@/mysteries/catalog";

type Row = { team: string; case_slug: string; guesses: number; seconds: number; score: number };
type Boards = { caseBoard: Row[]; globalBoard: Row[] };

function Table({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="font-pixel text-ui text-blue">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-body text-white">No solved cases yet.</p>
      ) : (
        <ol className="flex flex-col text-body text-white">
          {rows.map((r, i) => (
            <li key={i} className="flex items-baseline gap-3 border-t border-blue/30 py-2">
              <span className="w-8 shrink-0 text-orange">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{r.team}</span>
              <span className="shrink-0">{r.guesses === 1 ? "1st guess" : "2nd guess"}</span>
              <span className="shrink-0 tabular-nums">{mmss(r.seconds)}</span>
              <span className="w-12 shrink-0 text-right text-green tabular-nums">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Per-case board (when a slug is given) beside the global board. */
export function Leaderboard({ slug }: { slug: string | null }) {
  const [boards, setBoards] = useState<Boards | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/leaderboard${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<ApiResponse<Boards>>)
      .catch((): ApiResponse<Boards> => ({ success: false, errorMessage: "The line went dead. Try again.", errorCode: 0, payload: null }))
      .then((res) => {
        if (!live) return;
        if (res.success && res.payload) setBoards(res.payload);
        else setError(res.errorMessage);
      });
    return () => {
      live = false;
    };
  }, [slug]);

  const title = CATALOG.find((c) => c.slug === slug)?.title;
  return (
    <div className="flex flex-1 flex-col gap-10 px-4 pt-8 pb-10 sm:px-8 lg:pt-12">
      <h1 className="font-pixel text-statement text-white">Leaderboard</h1>
      {error && (
        <p role="alert" className="text-body text-red motion-safe:animate-glitch">
          {error}
        </p>
      )}
      {!boards && !error && <p className="text-body text-white">Loading the board…</p>}
      {boards && (
        <div className="grid gap-10 lg:grid-cols-2">
          {slug && <Table title={title ?? "This case"} rows={boards.caseBoard} />}
          <Table title="All cases" rows={boards.globalBoard} />
        </div>
      )}
      <Link href="/" className="mt-auto min-h-11 text-body text-white underline-offset-4 hover:underline focus-visible:underline">
        Back to the start
      </Link>
    </div>
  );
}
