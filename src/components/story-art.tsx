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
 * that answers the pointer. Everywhere but the case card it also idles on its own tour, like a
 * screensaver; the kernel skips the tour under reduced motion and sleeps while offscreen.
 * `caption` shows what the figure reads out (its names go to `read`, never into the drawing).
 */
export function StoryArt({
  slug,
  variant,
  caption = false,
  className = "",
}: {
  slug: string;
  variant: ArtVariant;
  caption?: boolean;
  className?: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [means, setMeans] = useState("");
  const [read, setRead] = useState("");

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
        let last = "";
        const readout = {
          get textContent() {
            return last;
          },
          set textContent(text: string) {
            if (text === last) return;
            last = text;
            if (caption) setRead(text);
          },
        };
        const handle = decl.mount({ stage: el, svg, read: readout }, decl.range[1]);
        const tour = variant === "card" ? null : HL.tour(el, decl.tour ?? HL.LAP);
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
  }, [slug, variant, caption]);

  return (
    <figure className={`flex flex-col gap-2 ${SIZE[variant]} ${className}`}>
      <div ref={stage} role="img" aria-label={means || "Story art"} className="story-art relative aspect-[5/4] w-full" />
      {caption && (
        <figcaption aria-hidden className="min-h-[1lh] font-pixel text-body text-blue">
          {read}
        </figcaption>
      )}
    </figure>
  );
}
