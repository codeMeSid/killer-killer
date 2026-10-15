/** Slow ominous ellipsis: three dots rising out of the dark in turn. Hidden from screen readers. */
export function WaitingDots() {
  return (
    <span aria-hidden>
      <span className="motion-safe:animate-dot">.</span>
      <span className="motion-safe:animate-dot motion-safe:[animation-delay:0.6s]">.</span>
      <span className="motion-safe:animate-dot motion-safe:[animation-delay:1.2s]">.</span>
    </span>
  );
}
