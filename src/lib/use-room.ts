"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResponse } from "@/lib/api";
import type { RoomView } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/client";

export type { RoomView };

export async function postJson<T>(url: string, body: unknown = {}): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { success: false, errorMessage: "The line went dead. Check your connection.", errorCode: 0, payload: null };
  }
}

async function fetchView(code: string): Promise<{ view: RoomView } | { error: { message: string; code: number } }> {
  try {
    const res = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
    const body = (await res.json()) as ApiResponse<RoomView>;
    if (body.success && body.payload) return { view: body.payload };
    return { error: { message: body.errorMessage, code: body.errorCode } };
  } catch {
    return { error: { message: "The line went dead. Reconnecting…", code: 0 } };
  }
}

type Presence = { agent: number; itemId: string | null };

/**
 * Live room state. Supabase Realtime only rings a doorbell; the view is always fetched from the
 * server, so a reconnect or refresh simply refetches. Presence (key = agent) carries who is online
 * and which item each agent is reading; none of it touches the database.
 */
export function useRoom(code: string) {
  const router = useRouter();
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<{ message: string; code: number } | null>(null);
  const [online, setOnline] = useState<Set<number>>(() => new Set());
  const [reading, setReading_] = useState<Map<string, number[]>>(() => new Map());
  const chan = useRef<RealtimeChannel | null>(null);
  const mine = useRef<Presence>({ agent: 0, itemId: null });
  const refetch = useRef<() => Promise<unknown>>(async () => {});

  useEffect(() => {
    let live = true;
    let client: ReturnType<typeof createClient> | null = null;
    let beat: ReturnType<typeof setInterval> | undefined;
    // State is only ever set in these promise callbacks, never synchronously in the effect.
    const refresh = () =>
      fetchView(code).then((res) => {
        if (!live) return null;
        if ("view" in res) {
          setView(res.view);
          setError(null);
          return res.view;
        }
        setError(res.error);
        return null;
      });

    refetch.current = refresh;
    void refresh().then(async (first) => {
      if (!live || !first) return;
      client = createClient();
      // Private channel: Realtime checks room membership (RLS on realtime.messages) with this JWT.
      await client.realtime.setAuth();
      if (!live) return;
      mine.current = { agent: first.me, itemId: mine.current.itemId };
      const ch = client.channel(`room:${code}`, { config: { private: true, presence: { key: String(first.me) } } });
      chan.current = ch;
      const sync = () => {
        if (!live) return;
        const on = new Set<number>();
        const map = new Map<string, number[]>();
        for (const [key, metas] of Object.entries(ch.presenceState<Presence>())) {
          const agent = Number(key);
          on.add(agent);
          const itemId = metas[metas.length - 1]?.itemId;
          if (itemId) map.set(itemId, [...(map.get(itemId) ?? []), agent].sort((a, b) => a - b));
        }
        setOnline(on);
        setReading_(map);
      };
      // Re-read presence on every doorbell too: a late presence_diff once left a guest on "one agent online".
      ch.on("broadcast", { event: "state" }, () => {
        void refresh();
        // Re-assert our own presence too: a reordered leave/join once left a guest on "three agents" for minutes.
        void ch.track(mine.current);
        sync();
      }).on("presence", { event: "sync" }, sync);
      ch.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        void ch.track(mine.current);
        clearInterval(beat);
        beat = setInterval(() => void ch.track(mine.current), 10_000); // heals any lost presence diff
        // Missed pings while offline are caught up on every (re)subscribe.
        void refresh();
      });
    });

    return () => {
      live = false;
      clearInterval(beat);
      if (client && chan.current) void client.removeChannel(chan.current);
      chan.current = null;
      // Next keeps hidden routes mounted in <Activity>; wipe so the next visit starts clean.
      setView(null);
      setError(null);
      setOnline(new Set());
      setReading_(new Map());
    };
  }, [code]);

  // A device with no seat in this room belongs on the join screen.
  useEffect(() => {
    if (error && (error.code === 401 || error.code === 403)) router.replace(`/join?code=${code}`);
  }, [error, code, router]);

  /** Tell the team which item this agent has open (null = none). */
  const setReading = useCallback((itemId: string | null) => {
    mine.current = { ...mine.current, itemId };
    void chan.current?.track(mine.current);
  }, []);

  /** Pull the room now. The sender of a change calls this itself rather than wait for its own doorbell. */
  const refresh = useCallback(() => refetch.current(), []);

  return { view, error, online, reading, setReading, refresh };
}

/** Keeps the screen awake while mounted. The game waits forever for picks, so phones must not sleep. */
export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        if (document.visibilityState === "visible" && "wakeLock" in navigator) lock = await navigator.wakeLock.request("screen");
      } catch {
        // Denied or unsupported (low battery, old browser): the game still works, the screen may dim.
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, []);
}

export { capitalize, inWords } from "@/lib/words";

export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export const DIFFICULTY_INK: Record<string, string> = { easy: "text-green", medium: "text-orange", hard: "text-red" };
