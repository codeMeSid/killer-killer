// The descent made visible: a field of blue glyphs that rises from the bottom edge as the
// setting's clock runs down. Step 0 is the jump, the last step is the deadline (mid-screen).
const STEPS = [
  "[--ground:8svh]",
  "[--ground:13svh]",
  "[--ground:18svh]",
  "[--ground:23svh]",
  "[--ground:28svh]",
  "[--ground:32svh]",
  "[--ground:37svh]",
  "[--ground:42svh]",
  "[--ground:47svh]",
  "[--ground:52svh]",
];

/** Class for the screen root: sets --ground (inherited by the field and by seam-ink text) and animates it. */
export function groundClass(step: number) {
  const i = Math.max(0, Math.min(STEPS.length - 1, step));
  return `${STEPS[i]} motion-safe:transition-[--ground] motion-safe:duration-[4000ms]`;
}

// A fixed, hand-scattered texture so every screen and every refresh shows the same ground.
const ROW_A = ".  :  ·   .   ░  .    :   ·  .  ░   .   :    ·   .  :  ░  .   ·   :  .   .  ░ ";
const ROW_B = "  ·   .  ░   :   .  ·    .  :   ░  .   ·  .    :  ░   .  ·   :   .  ░   ·  .  ";
const ROW_C = "░ . ░ : ░ . ░ · ░ . ░ : ░ . ░ · ░ . ░ : ░ . ░ · ░ . ░ : ░ . ░ · ░ . ░ : ░ . ░ ";
const FIELD = [ROW_C, ...Array.from({ length: 60 }, (_, i) => (i % 2 ? ROW_B : ROW_A))].map((r) => r.repeat(4)).join("\n");

export function Ground() {
  return (
    // Pinned to the viewport, like the seam-ink it lines up with, so scrolling never separates them.
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 h-(--ground) overflow-hidden">
      <pre className="font-art text-meta leading-tight font-normal whitespace-pre text-blue/40">{FIELD}</pre>
    </div>
  );
}
