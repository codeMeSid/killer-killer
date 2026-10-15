const KILLER = `\
██╗  ██╗██╗██╗     ██╗     ███████╗██████╗
██║ ██╔╝██║██║     ██║     ██╔════╝██╔══██╗
█████╔╝ ██║██║     ██║     █████╗  ██████╔╝
██╔═██╗ ██║██║     ██║     ██╔══╝  ██╔══██╗
██║  ██╗██║███████╗███████╗███████╗██║  ██║
╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝`;

/** Orange KILLER ASCII art. `animated` plays the ominous descent (homepage only). */
export function KillerTitle({ animated = false }: { animated?: boolean }) {
  return (
    <h1 aria-label="KILLER" className={animated ? "motion-safe:animate-descend" : undefined}>
      <pre
        aria-hidden
        className="font-art text-[8px] font-normal leading-relaxed text-orange sm:text-xs lg:text-sm"
      >
        {KILLER}
      </pre>
    </h1>
  );
}
