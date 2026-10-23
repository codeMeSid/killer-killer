import { BootScreen } from "@/components/boot-screen";
import { BrushScene } from "@/components/brush-scene";
import { KillerTitle } from "@/components/killer-title";
import { Machine } from "@/components/machine";
import { ModeMenu } from "@/components/mode-menu";

export default function Home() {
  return (
    <Machine kind="computer">
      <main className="flex flex-1 flex-col items-center">
        <BootScreen>
          <div className="flex w-full flex-1 flex-col items-center gap-8 px-4 pt-10 sm:gap-10 sm:pt-14">
            <KillerTitle animated />
            <BrushScene className="max-h-64 min-h-48 w-full max-w-5xl flex-1 border sm:max-h-none border-blue/30 motion-safe:animate-rise motion-safe:[animation-delay:400ms]" />
            <ModeMenu />
            <p className="pb-8 text-center text-body text-white motion-safe:animate-rise motion-safe:[animation-delay:900ms]">
              Open the file. Read everything. Name who, why and how.
            </p>
          </div>
        </BootScreen>
      </main>
    </Machine>
  );
}
