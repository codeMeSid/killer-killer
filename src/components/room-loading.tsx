import Link from "next/link";
import { PhaseBar } from "@/components/phase-bar";
import { WaitingDots } from "@/components/waiting-dots";

/** Shown while a game screen fetches its first view, or when the room can't be reached. */
export function RoomLoading({ error }: { error: string | null }) {
  return (
    <>
      <PhaseBar ink={error ? "red" : "white"} />
      <div className="flex flex-1 flex-col justify-center gap-4 px-4 sm:px-8">
        {error ? (
          <>
            <p role="alert" className="text-statement font-bold text-red">
              {error}
            </p>
            <Link href="/" className="text-body text-white underline-offset-4 hover:underline focus-visible:underline">
              Back to the start
            </Link>
          </>
        ) : (
          <p className="text-body text-blue">
            Opening the room
            <WaitingDots />
          </p>
        )}
      </div>
    </>
  );
}
