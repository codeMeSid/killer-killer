import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StoryScreen } from "@/components/story-screen";

export const metadata: Metadata = { title: "Story — killer-killer" };

type Props = PageProps<"/story/[code]">;

/** Awaits params, so it streams inside <Suspense> (cache-components rule). */
async function Screen({ params }: Props) {
  const { code } = await params;
  if (!/^[A-Z0-9]{8}$/.test(code)) notFound();
  return <StoryScreen key={code} code={code} />;
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
