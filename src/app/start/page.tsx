import type { Metadata } from "next";
import { CasePicker } from "@/components/case-picker";
import { PhaseBar } from "@/components/phase-bar";
import { mysteryCards } from "@/mysteries";

export const metadata: Metadata = { title: "Pick a case — killer-killer" };

export default function StartPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PhaseBar />
      <CasePicker cards={mysteryCards()} />
    </main>
  );
}
