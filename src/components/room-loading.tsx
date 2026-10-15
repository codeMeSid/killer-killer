import Link from "next/link";
import { Machine } from "@/components/machine";
import { PhaseBar } from "@/components/phase-bar";
import { WaitingDots } from "@/components/waiting-dots";

/**
 * Shown while a game screen fetches its first view, or when the room can't be reached. The story
 * isn't known yet, so this is the set itself, untuned: a square of snow and "Tuning in".
 */
export function RoomLoading({ error }: { error: string | null }) {
  return (
    <Machine kind="tv">
      <PhaseBar ink={error ? "red" : "white"} />
      <div className="flex flex-1 flex-col justify-center gap-6 px-4 sm:px-8">
        {error ? (
          <>
            <p role="alert" className="font-pixel text-statement text-red motion-safe:animate-glitch">
              {error}
            </p>
            <Link href="/" className="text-body text-white underline-offset-4 hover:underline focus-visible:underline">
              Back to the start
            </Link>
          </>
        ) : (
          <>
            <div aria-hidden className="snow aspect-[5/4] w-40 opacity-40 motion-safe:animate-hum sm:w-56" />
            <p className="font-pixel text-statement text-white">
              Tuning in
              <WaitingDots />
            </p>
          </>
        )}
      </div>
    </Machine>
  );
}
