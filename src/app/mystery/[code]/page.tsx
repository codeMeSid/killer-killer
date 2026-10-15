import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MysteryScreen } from "@/components/mystery-screen";

export const metadata: Metadata = { title: "Mystery — killer-killer" };

type Props = PageProps<"/mystery/[code]">;

/** Awaits params, so it streams inside <Suspense> (cache-components rule). */
async function Screen({ params }: Props) {
  const { code } = await params;
  if (!/^[A-Z0-9]{8}$/.test(code)) notFound();
  return <MysteryScreen key={code} code={code} />;
}

export default function Page(props: Props) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense>
        <Screen {...props} />
      </Suspense>
    </main>
  );
}
