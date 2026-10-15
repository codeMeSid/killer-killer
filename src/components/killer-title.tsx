const KILLER = `\
██╗  ██╗██╗██╗     ██╗     ███████╗██████╗
██║ ██╔╝██║██║     ██║     ██╔════╝██╔══██╗
█████╔╝ ██║██║     ██║     █████╗  ██████╔╝
██╔═██╗ ██║██║     ██║     ██╔══╝  ██╔══██╗
██║  ██╗██║███████╗███████╗███████╗██║  ██║
╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝`;

/** Orange KILLER ASCII art in phosphor. `animated` flickers it in with one glitch (homepage only). */
export function KillerTitle({ animated = false }: { animated?: boolean }) {
  return (
    <h1 aria-label="KILLER" className={animated ? "motion-safe:animate-flicker-in" : undefined}>
      <pre
        aria-hidden
        className={`font-art text-[8px] font-normal leading-relaxed text-orange [text-shadow:0_0_0.6em_color-mix(in_srgb,var(--orange)_55%,transparent)] sm:text-xs lg:text-sm ${
          animated ? "motion-safe:animate-glitch motion-safe:[animation-delay:1.1s]" : ""
        }`}
      >
        {KILLER}
      </pre>
    </h1>
  );
}
