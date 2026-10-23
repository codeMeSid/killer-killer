"use client";

import { useEffect, useRef } from "react";

const WHITE = "#E5E5E5";
const BLUE = "#2472C8";
const ORANGE = "#D97757";
const OBSIDIAN = "#0B1215";

/**
 * Home-page painting: a lighthouse on a rock, fog and sea hatched in blue, the beam wash in orange,
 * (claw marks dropped: read as a render bug). Brushwork by p5.brush (standalone build, no p5). Painted once per size and
 * never animated, so it costs nothing at idle and respects reduced motion. Palette hues only.
 */
export function BrushScene({ className = "" }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const paint = async () => {
      // Dynamic import: the brush engine loads only here, never in the main bundle.
      const brush = await import("p5.brush/standalone");
      if (!live) return;
      el.replaceChildren();
      const W = Math.round(el.clientWidth);
      const H = Math.round(el.clientHeight);
      if (W < 80 || H < 80) return;
      try {
        brush.createCanvas(W, H, { parent: el, pixelDensity: Math.min(window.devicePixelRatio || 1, 2) });
      } catch {
        return; // no WebGL: the page still reads without the painting
      }
      // One uniform scale so the tower never stretches; tower sits at 62% of the width.
      const s = Math.min(W / 360, H / 280);
      const ox = W * 0.62 - 395 * s;
      const oy = (H - 280 * s) / 2;
      const x = (v: number) => ox + v * s;
      const y = (v: number) => oy + v * s;
      brush.scaleBrushes(Math.min(3, Math.max(1.2, s * 2)));
      brush.angleMode(brush.DEGREES);
      brush.seed(1013);
      brush.clear(OBSIDIAN);
      brush.push();
      brush.translate(-W / 2, -H / 2);

      // Sea: horizon rule, then blue hatching that thins toward the shore.
      brush.set("HB", BLUE, 0.9);
      brush.line(0, y(176), W, y(176));
      brush.noFill();
      brush.hatchStyle("HB", BLUE, 0.7);
      brush.hatch(Math.max(5, 7 * s), 0, { rand: 0.04 });
      brush.rect(0, y(182), W, H - y(182), "corner");
      brush.noHatch();

      // Fog: sparse slanted blue strokes above the horizon.
      brush.hatchStyle("charcoal", BLUE, 0.35);
      brush.hatch(Math.max(16, 34 * s), 80, { rand: 0.3 });
      brush.rect(0, y(110), W, 60 * s, "corner");
      brush.noHatch();

      // Rock: white outline, orange wash.
      const rock = [[300, 280], [330, 200], [370, 176], [420, 190], [450, 236], [480, 280]].map(([a, b]) => [x(a), y(b)]);
      brush.fill(ORANGE, 40);
      brush.fillBleed(0.3, "out");
      brush.set("2B", WHITE, 0.9);
      brush.polygon(rock);

      // Tower: tapered white outline, lamp room glowing orange.
      brush.noFill();
      brush.set("2B", WHITE, 1.8);
      brush.polygon([[362, 180], [376, 74], [414, 74], [428, 180]].map(([a, b]) => [x(a), y(b)]));
      brush.line(x(370), y(130), x(420), y(130));
      brush.fill(ORANGE, 220);
      brush.fillBleed(0.4, "out");
      brush.set("2B", ORANGE, 1.6);
      brush.rect(x(378), y(48), 34 * s, 26 * s, "corner");
      brush.line(x(372), y(48), x(418), y(48));
      brush.line(x(395), y(30), x(395), y(48));

      // Beam: two wide orange washes fanning from the lamp.
      brush.noStroke();
      brush.fill(ORANGE, 60);
      brush.fillBleed(0.5, "out");
      brush.polygon([[x(412), y(60)], [W, y(8)], [W, y(96)]]);
      brush.fill(ORANGE, 30);
      brush.polygon([[x(380), y(60)], [0, y(18)], [0, y(100)]]);

      // Moon.
      brush.noFill();
      brush.set("rotring", WHITE, 0.7);
      brush.circle(Math.max(x(120), 40), y(70), 26 * s);

      brush.pop();
      brush.render();
    };

    void paint();
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void paint(), 250);
    });
    ro.observe(el);
    return () => {
      live = false;
      clearTimeout(timer);
      ro.disconnect();
      el.replaceChildren();
    };
  }, []);

  return <div ref={host} role="img" aria-label="A lighthouse on a rock at night, its beam sweeping a foggy sea." className={`relative overflow-hidden [&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:h-full [&>canvas]:w-full ${className}`} />;
}
