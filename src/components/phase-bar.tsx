import Link from "next/link";
import type { ReactNode } from "react";

export type Ink = "white" | "orange" | "red" | "green" | "blue";

const INK: Record<Ink, string> = {
  white: "text-white",
  orange: "text-orange",
  red: "text-red",
  green: "text-green",
  blue: "text-blue",
};

/**
 * The one line of chrome on game screens: wordmark left, context right. Its ink follows the
 * phase (narrating white, choosing orange, recap red, solved green) and changes slowly.
 */
export function PhaseBar({ ink = "white", children }: { ink?: Ink; children?: ReactNode }) {
  return (
    <header className={`flex items-baseline justify-between gap-4 px-4 pt-4 text-meta transition-colors sm:px-8 sm:pt-6 sm:text-body ${INK[ink]}`}>
      <Link href="/" className="shrink-0 font-bold whitespace-nowrap transition-opacity hover:opacity-70 focus-visible:underline focus-visible:outline-none">
        killer-killer
      </Link>
      <div className="flex flex-wrap items-baseline justify-end gap-x-4 gap-y-1 text-right">{children}</div>
    </header>
  );
}
