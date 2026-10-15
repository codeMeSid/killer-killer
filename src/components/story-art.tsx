"use client";

import { useEffect, useRef, useState } from "react";
import { declare, type HairlineKernel } from "@/lib/hairline";
import HLKernel from "@/lib/hairline/kernel";
import { ART } from "@/mysteries/catalog";

const HL = HLKernel as unknown as HairlineKernel;

export type ArtVariant = "card" | "hero" | "loader" | "end";

const SIZE: Record<ArtVariant, string> = {
  card: "w-full",
  hero: "w-full", // sized by the caller
  loader: "w-44 sm:w-60",
  end: "w-full max-w-[28rem]",
};

/**
 * A story's own Hairline figure (src/mysteries/<slug>/art.ts): an ominous isometric line drawing
 * that plays its tour on a loop, like a screensaver. It is not interactive: pointer events are off
 * and the read-out is discarded, so nobody sees interaction states. The kernel skips the tour under
 * reduced motion (the figure then rests on its composed pose) and sleeps while offscreen.
 */
export function StoryArt({
  slug,
  variant,
  className = "",
}: {
  slug: string;
  variant: ArtVariant;
  className?: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [means, setMeans] = useState("");

  useEffect(() => {
    const load = ART[slug];
    if (!load) return;
    let live = true;
    let cleanup = () => {};
    load()
      .then(({ default: define }) => {
        const el = stage.current;
        if (!live || !el) return;
        const decl = declare(HL, define);
        HL.inject(document);
        el.dataset.hairline = decl.name;
        setMeans(decl.means);
        const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, el);
        const readout = { textContent: "" }; // ponytail: read-out discarded, the art is not interactive
        const handle = decl.mount({ stage: el, svg, read: readout }, decl.range[1]);
        const tour = HL.tour(el, decl.tour ?? HL.LAP);
        cleanup = () => {
          tour?.stop();
          handle.destroy();
          svg.remove();
        };
      })
      .catch((error: unknown) => console.error(`Story art for ${slug} failed`, error));
    return () => {
      live = false;
      cleanup();
    };
  }, [slug]);

  return (
    <figure className={`flex flex-col gap-2 ${SIZE[variant]} ${className}`}>
      <div ref={stage} role="img" aria-label={means || "Story art"} className="story-art pointer-events-none relative aspect-[5/4] w-full" />
    </figure>
  );
}
