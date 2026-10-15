"use client";

import { useRouter } from "next/navigation";
import { FillButton } from "@/components/fill-button";
import { Ground, groundClass } from "@/components/ground";
import { PhaseBar } from "@/components/phase-bar";
import { RoomLoading } from "@/components/room-loading";
import type { EndingKey } from "@/lib/engine/types";
import type { BaseView, HostView, PlayerView } from "@/lib/engine/view";
import { useRoom } from "@/lib/use-room";

// Two-line headlines per ending. The tree's own title runs underneath.
const HEADLINE: Record<EndingKey, [string, string]> = {
  solved: ["Case", "closed."],
  wrong_culprit: ["Wrong", "culprit."],
  culprit_escapes: ["They got", "away."],
};

export function EndScreen({ code }: { code: string }) {
  const { view, error } = useRoom(code);
  if (!view?.ending) return <RoomLoading error={error?.message ?? null} />;
  return view.role === "host" ? <HostEnd view={view} /> : <PlayerEnd view={view} />;
}

function BackHome() {
  const router = useRouter();
  return (
    <div className="max-w-sm">
      <FillButton type="button" onClick={() => router.push("/")}>
        Back to home
      </FillButton>
    </div>
  );
}

/** The cast, reading right: who played whom, and how it ended for them. */
function Cast({ ending }: { ending: NonNullable<BaseView["ending"]> }) {
  return (
    <section className="grid gap-8 lg:grid-cols-12">
      <h2 className="text-ui font-bold text-white lg:col-span-4">Who landed.</h2>
      <ul className="flex flex-col gap-5 lg:col-span-6 lg:col-start-7">
        {ending.fates.map((f) => (
          <li key={f.player} className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 text-body">
            <span className="text-white">
              {f.character ?? f.player}
              {f.character && <span className="text-blue"> · {f.player}</span>}
            </span>
            <span className={f.killer ? "text-orange" : f.alive ? "text-green" : "text-red"}>
              {f.killer ? "the killer" : f.alive ? "landed" : "fell"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HostEnd({ view }: { view: HostView }) {
  const ending = view.ending!;
  const [top, bottom] = HEADLINE[ending.key];
  const solved = ending.key === "solved";
  return (
    <div className={`relative flex min-h-svh flex-1 flex-col overflow-hidden ${groundClass(9)}`}>
      <PhaseBar ink={solved ? "green" : "red"}>
        <span>{view.mystery.title}</span>
      </PhaseBar>
      <div className="relative z-10 flex flex-1 flex-col gap-16 px-4 pt-10 pb-16 sm:px-8">
        {/* Dropped so the second line sinks below the ground line and takes the seam's blue. */}
        <section className="flex flex-col gap-6 pt-[22svh]">
          <h1
            className={`seam-ink text-display font-bold motion-safe:animate-rise ${solved ? "[--seam-top:var(--green)]" : "[--seam-top:var(--red)]"}`}
          >
            {top}
            <br />
            {bottom}
          </h1>
          <p className="text-ui text-white motion-safe:animate-rise motion-safe:[animation-delay:800ms]">{ending.title}</p>
        </section>
        <p className="max-w-3xl text-ui text-white motion-safe:animate-rise motion-safe:[animation-delay:1600ms]">{ending.epilogue}</p>
        <p className="text-statement font-bold text-orange motion-safe:animate-flicker-in motion-safe:[animation-delay:3200ms]">
          {ending.killer.character} did it{ending.killer.player ? `, played by ${ending.killer.player}` : ""}.
        </p>
        <Cast ending={ending} />
        <BackHome />
      </div>
      <Ground />
    </div>
  );
}

export function PlayerEnd({ view }: { view: PlayerView }) {
  const ending = view.ending!;
  const won = view.won === true;
  const killer = view.me?.killer ?? false;
  const why = killer
    ? won
      ? "You got away with it."
      : "They caught you."
    : won
      ? "The truth came down with you."
      : `${ending.killer.character} got away with it.`;
  return (
    <>
      <PhaseBar ink={won ? "green" : "red"} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 pt-8 pb-10 sm:px-8">
        <h1 className={`text-display font-bold motion-safe:animate-flicker-in ${won ? "text-green" : "text-red"}`}>
          You {won ? "win" : "lose"}.
        </h1>
        <p className="text-statement font-bold text-white motion-safe:animate-rise motion-safe:[animation-delay:800ms]">{why}</p>
        <section className="flex flex-col gap-3 motion-safe:animate-rise motion-safe:[animation-delay:1600ms]">
          <h2 className="text-ui font-bold text-white">{ending.title}</h2>
          <p className="text-body text-white">{ending.epilogue}</p>
        </section>
        <Cast ending={ending} />
        <BackHome />
      </div>
    </>
  );
}
