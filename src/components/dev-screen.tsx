"use client";

import { HostEnd, PlayerEnd } from "@/components/end-screen";
import { HostLobby, PlayerLobby } from "@/components/lobby-screen";
import { Stage } from "@/components/mystery-screen";
import { Controller } from "@/components/story-screen";
import type { HostView, PlayerView } from "@/lib/engine/view";

export type DevScene =
  | "lobby-host"
  | "lobby-player"
  | "mystery-narrate"
  | "mystery-choose"
  | "mystery-resolving"
  | "mystery-vote"
  | "story-narrate"
  | "story-choose"
  | "story-killer"
  | "story-locked"
  | "story-dead"
  | "story-vote"
  | "story-voted"
  | "end-host"
  | "end-player";

/** Renders one game screen from a prebuilt view (dev gallery only; see app/dev/screens). */
export function DevScreen({ scene, view, online }: { scene: DevScene; view: unknown; online: string[] }) {
  const on = new Set(online);
  if (scene === "lobby-host") return <HostLobby view={view as HostView} online={on} />;
  if (scene === "lobby-player") return <PlayerLobby view={view as PlayerView} online={on} />;
  if (scene.startsWith("mystery")) return <Stage view={view as HostView} online={on} />;
  if (scene.startsWith("story")) return <Controller view={view as PlayerView} />;
  if (scene === "end-host") return <HostEnd view={view as HostView} />;
  return <PlayerEnd view={view as PlayerView} />;
}
