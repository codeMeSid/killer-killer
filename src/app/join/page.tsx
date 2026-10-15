import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinForm } from "@/components/join-form";
import { KillerTitle } from "@/components/killer-title";
import { Machine } from "@/components/machine";

export const metadata: Metadata = { title: "Join — killer-killer" };

/** Reads ?code= (the QR link) inside <Suspense>; keyed so a new code starts a fresh form. */
async function Form({ searchParams }: PageProps<"/join">) {
  const raw = (await searchParams).code;
  const code = typeof raw === "string" ? raw.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 8) : "";
  return <JoinForm key={code} initialCode={code} />;
}

export default function JoinPage(props: PageProps<"/join">) {
  return (
    <Machine kind="terminal">
      <main className="flex flex-1 flex-col items-center px-4 pt-8 pb-8 sm:pt-12">
        <KillerTitle />
        <div className="flex w-full flex-1 items-center justify-center py-8 motion-safe:animate-fade-in">
          <Suspense>
            <Form {...props} />
          </Suspense>
        </div>
      </main>
    </Machine>
  );
}
