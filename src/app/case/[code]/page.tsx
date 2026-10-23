import type { Metadata } from "next";
import { Suspense } from "react";
import { CaseScreen } from "@/components/desk/case-screen";
import { RoomLoading } from "@/components/room-loading";

export const metadata: Metadata = { title: "The case · killer-killer" };

/** Reads the route param inside <Suspense> (Next 16 cacheComponents). */
async function Screen({ params }: PageProps<"/case/[code]">) {
  return <CaseScreen code={(await params).code.toUpperCase()} />;
}

export default function CasePage(props: PageProps<"/case/[code]">) {
  return (
    <Suspense fallback={<RoomLoading error={null} />}>
      <Screen {...props} />
    </Suspense>
  );
}
