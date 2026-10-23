"use client";

import { RoomLoading } from "@/components/room-loading";
import { useRoom, useWakeLock } from "@/lib/use-room";
import { Desk } from "./desk";

/** The live desk for one room: fetches the view, listens for the doorbell and presence. */
export function CaseScreen({ code }: { code: string }) {
  const { view, error, online, reading, setReading, refresh } = useRoom(code);
  useWakeLock();
  if (!view) return <RoomLoading error={error?.message ?? null} />;
  return <Desk view={view} online={[...online]} reading={Object.fromEntries(reading)} onReading={setReading} onChanged={refresh} />;
}
