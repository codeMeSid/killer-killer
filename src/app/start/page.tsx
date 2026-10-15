import type { Metadata } from "next";
import { CasePicker } from "@/components/case-picker";
import { Machine } from "@/components/machine";
import { PhaseBar } from "@/components/phase-bar";
import { mysteryCards } from "@/mysteries";

export const metadata: Metadata = { title: "Pick a case · killer-killer" };

export default function StartPage() {
  return (
    <Machine kind="computer">
      <main className="flex flex-1 flex-col">
        <PhaseBar />
        <CasePicker cards={mysteryCards()} />
      </main>
    </Machine>
  );
}
