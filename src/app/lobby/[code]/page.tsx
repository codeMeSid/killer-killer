import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LobbyScreen } from "@/components/lobby-screen";

export const metadata: Metadata = { title: "Lobby — killer-killer" };

type Props = PageProps<"/lobby/[code]">;

/** Awaits params, so it streams inside <Suspense> (cache-components rule). */
async function Screen({ params }: Props) {
  const { code } = await params;
  if (!/^[A-Z0-9]{8}$/.test(code)) notFound();
  return <LobbyScreen key={code} code={code} />;
}

export default function LobbyPage(props: Props) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense>
        <Screen {...props} />
      </Suspense>
    </main>
  );
}
