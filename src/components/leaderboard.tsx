"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApiResponse } from "@/lib/api";
import { mmss } from "@/components/desk/clock";
import { CATALOG } from "@/mysteries/catalog";

type Row = { team: string; case_slug: string; guesses: number; seconds: number; score: number };
type Boards = { board: Row[] };

function Table({ rows }: { rows: Row[] }) {
  return rows.length === 0 ? (
    <p className="text-body text-white">No solved cases yet.</p>
  ) : (
    <ol className="flex flex-col text-body text-white">
      {rows.map((r, i) => (
        <li key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-blue/30 py-3">
          <span className="text-ui text-orange tabular-nums">{i + 1}</span>
          <span className="min-w-0 break-words text-ui text-white">{r.team}</span>
          <span className="text-ui text-green tabular-nums">{r.score}</span>
          <span className="col-start-2 col-span-2 text-body text-white">
            {CATALOG.find((c) => c.slug === r.case_slug)?.title ?? r.case_slug} · {r.guesses === 1 ? "First guess" : "Second guess"} · {mmss(r.seconds)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** One global board, all cases. */
export function Leaderboard() {
  const [boards, setBoards] = useState<Boards | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/leaderboard", { cache: "no-store" })
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
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-8 pb-10 sm:px-8 lg:pt-12">
      <Link href="/" className="min-h-11 self-start text-body text-white underline-offset-4 hover:underline focus-visible:underline">
        &lt; Back to the start
      </Link>
      <h1 className="-mt-6 font-pixel text-statement text-white">Leaderboard</h1>
      {error && (
        <p role="alert" className="text-body text-red motion-safe:animate-glitch">
          {error}
        </p>
      )}
      {!boards && !error && <p className="text-body text-white">Loading the board…</p>}
      {boards && <Table rows={boards.board} />}
    </div>
  );
}
