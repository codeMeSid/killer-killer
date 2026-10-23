import Link from "next/link";
import { Machine } from "@/components/machine";

/** Shown while the desk fetches its first view, or when the case can't be reached. */
export function RoomLoading({ error }: { error: string | null }) {
  return (
    <Machine kind="computer">
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
          <p className="font-pixel text-statement text-white">
            Opening the file<span className="motion-safe:animate-blink">_</span>
          </p>
        )}
      </div>
    </Machine>
  );
}
