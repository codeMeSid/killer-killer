"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ApiResponse } from "@/lib/api";
import type { HostView, PlayerView } from "@/lib/engine/view";
import { createClient } from "@/lib/supabase/client";

export type RoomView = HostView | PlayerView;

/** Where this viewer belongs right now. Every game screen redirects here when it disagrees. */
export function pathFor(view: RoomView): string {
  if (view.status === "lobby") return `/lobby/${view.code}`;
  if (view.status === "ended" && view.phase === "finale") return `/end/${view.code}`;
  return view.role === "host" ? `/mystery/${view.code}` : `/story/${view.code}`;
}

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

/**
 * Live room state for a screen. Supabase Realtime only rings a doorbell; the view itself is always
 * fetched from the server, so a reconnect or refresh simply refetches. Presence marks who is connected.
 */
export function useRoom(code: string) {
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<{ message: string; code: number } | null>(null);
  const [online, setOnline] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let live = true;
    let channel: { supabase: ReturnType<typeof createClient>; ch: RealtimeChannel } | null = null;
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

    void refresh().then(async (first) => {
      if (!live || !first) return;
      const supabase = createClient();
      // Private channel: Realtime checks room membership (RLS on realtime.messages) with this JWT.
      await supabase.realtime.setAuth();
      if (!live) return;
      const me = first.role === "player" ? first.you.id : "host";
      const ch = supabase.channel(`room:${code}`, { config: { private: true, presence: { key: me } } });
      channel = { supabase, ch };
      ch.on("broadcast", { event: "state" }, () => void refresh())
        .on("presence", { event: "sync" }, () => {
          if (live) setOnline(new Set(Object.keys(ch.presenceState())));
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          void ch.track({ at: Date.now() });
          // Missed pings while offline are caught up on every (re)subscribe.
          void refresh();
        });
    });

    return () => {
      live = false;
      if (channel) void channel.supabase.removeChannel(channel.ch);
      // Next keeps hidden routes mounted in <Activity>; wipe so the next visit starts clean.
      setView(null);
      setError(null);
    };
  }, [code]);

  // Follow the room: lobby → game → ending, per role.
  useEffect(() => {
    if (!view) return;
    const target = pathFor(view);
    if (target !== pathname) router.replace(target);
  }, [view, pathname, router]);

  // A phone with no seat in this room belongs on the join screen.
  useEffect(() => {
    if (error && (error.code === 401 || error.code === 403)) router.replace(`/join?code=${code}`);
  }, [error, code, router]);

  return { view, error, online };
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
