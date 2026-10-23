import { BootScreen } from "@/components/boot-screen";
import { KillerTitle } from "@/components/killer-title";
import { Machine } from "@/components/machine";
import { ModeMenu } from "@/components/mode-menu";

export default function Home() {
  return (
    <Machine kind="computer">
      <main className="flex flex-1 flex-col items-center">
        <BootScreen>
          <div className="flex flex-1 flex-col items-center gap-12 px-4 pt-10 sm:gap-16 sm:pt-16">
            <KillerTitle animated />
            <ModeMenu />
            <p className="mt-auto pb-8 text-center text-body text-blue motion-safe:animate-rise motion-safe:[animation-delay:900ms]">
              Open the file. Read everything. Name who, why and how.
            </p>
          </div>
        </BootScreen>
      </main>
    </Machine>
  );
}
