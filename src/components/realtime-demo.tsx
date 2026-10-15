"use client";

import { useEffect, useRef, useState } from "react";
import * as Ably from "ably";

const CHANNEL = "demo:lobby";

type Entry = { id: string; clientId: string; text: string };

export function RealtimeDemo() {
  const [state, setState] = useState<Ably.ConnectionState>("initialized");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

  // Client is built in an effect so it never connects during SSR.
  useEffect(() => {
    const client = new Ably.Realtime({ authUrl: "/api/ably/token", authMethod: "POST" });
    const channel = client.channels.get(CHANNEL);
    channelRef.current = channel;

    client.connection.on((change) => setState(change.current));
    channel.subscribe("message", (msg) =>
      setEntries((prev) => [
        ...prev.slice(-49),
        { id: msg.id ?? crypto.randomUUID(), clientId: msg.clientId ?? "?", text: String(msg.data) },
      ]),
    );

    return () => {
      channel.unsubscribe();
      client.close();
      channelRef.current = null;
    };
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !channelRef.current) return;
    setDraft("");
    await channelRef.current.publish("message", text);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-blue/40 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-blue uppercase">
          Realtime · {CHANNEL}
        </h2>
        <span className={`rounded-full border border-blue/40 px-2 py-0.5 font-mono text-xs ${state === "connected" ? "text-green" : state === "failed" || state === "suspended" ? "text-red" : "text-blue"}`}>
          {state}
        </span>
      </header>

      <ul className="mt-4 flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto sm:min-h-40">
        {entries.length === 0 && (
          <li className="text-sm text-blue">
            No messages yet. Send one — open a second tab to see it arrive.
          </li>
        )}
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl border border-blue/30 p-3 text-sm break-words text-white"
          >
            <span className="font-mono text-xs text-blue">{entry.clientId}</span>
            <p className="mt-1">{entry.text}</p>
          </li>
        ))}
      </ul>

      <form onSubmit={send} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="draft">
          Message
        </label>
        <input
          id="draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Say something…"
          className="min-w-0 flex-1 rounded-xl border border-blue/40 bg-background px-3 py-2.5 text-base text-white outline-none placeholder:text-blue focus-visible:ring-2 focus-visible:ring-blue"
        />
        <button
          type="submit"
          disabled={state !== "connected" || !draft.trim()}
          className="rounded-xl border border-green px-4 py-2.5 text-base font-medium text-green disabled:border-blue disabled:text-blue sm:w-auto"
        >
          Send
        </button>
      </form>
    </section>
  );
}
