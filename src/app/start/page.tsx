import type { Metadata } from "next";
import { CasePicker } from "@/components/case-picker";
import { Machine } from "@/components/machine";

export const metadata: Metadata = { title: "Pick a case · killer-killer" };

export default function StartPage() {
  return (
    <Machine kind="computer">
      <main className="flex flex-1 flex-col">
        <CasePicker />
      </main>
    </Machine>
  );
}
