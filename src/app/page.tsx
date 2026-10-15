import { KillerTitle } from "@/components/killer-title";
import { ModeMenu } from "@/components/mode-menu";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-10 px-4 pt-8 sm:gap-14 sm:pt-12">
      <KillerTitle animated />
      <ModeMenu />
    </main>
  );
}
