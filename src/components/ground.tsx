// The clock made visible: a field of blue glyphs that rises from the bottom edge as the setting's
// clock runs down. Step 0 is the start, the last step is the deadline (mid-screen).
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

// A fixed, hand-scattered texture so every screen and every refresh shows the same ground. The story
// picks its glyphs (lexicon `glyphs`: waves for a ship, stars for space); the pattern stays the same.
const ROW_A = "a  b  c   a   d  a    b   c  a  d   a   b    c   a  b  d  a   c   b  a   a  d ";
const ROW_B = "  c   a  d   b   a  c    a  b   d  a   c  a    b  d   a  c   b   a  d   c  a  ";
const ROW_C = "d a d b d a d c d a d b d a d c d a d b d a d c d a d b d a d c d a d b d a d ";

function field(glyphs: string) {
  const g = glyphs.split(/\s+/).filter(Boolean);
  const pick = (k: number) => g[k % g.length] ?? ".";
  const map: Record<string, string> = { a: pick(0), b: pick(1), c: pick(2), d: pick(g.length - 1) };
  const row = (r: string) => r.replace(/[abcd]/g, (k) => map[k]).repeat(4);
  return [ROW_C, ...Array.from({ length: 60 }, (_, i) => (i % 2 ? ROW_B : ROW_A))].map(row).join("\n");
}

export function Ground({ glyphs = ". : · ░" }: { glyphs?: string }) {
  return (
    // Pinned to the viewport, like the seam-ink it lines up with, so scrolling never separates them.
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 h-(--ground) overflow-hidden">
      <pre className="font-art text-meta leading-tight font-normal whitespace-pre text-blue/40">{field(glyphs)}</pre>
    </div>
  );
}
