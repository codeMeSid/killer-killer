"use client";

import { useSyncExternalStore } from "react";

/** A case video served from public/cases/<slug>/. Click to play; never autoplays with sound. Captions are burned into every clip, so the .vtt track is off by default (default doubled them on screen); it stays selectable for assistive tech. */
export function CaseVideo({ slug, src, poster, captions }: { slug: string; src: string; poster?: string; captions: string }) {
  const base = `/cases/${slug}/`;
  return (
    <video controls playsInline preload="metadata" poster={poster && base + poster} className="w-full border border-blue/40 bg-background">
      <source src={base + src} type="video/mp4" />
      <track kind="captions" srcLang="en" label="English" src={base + captions} />
    </video>
  );
}

const reduced = (cb: () => void) => {
  const m = matchMedia("(prefers-reduced-motion: reduce)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** Silent looping teaser for a case card. Reduced motion: no autoplay, no loop, so the card shows the still first frame. */
export function CaseTeaser({ slug, src, className = "" }: { slug: string; src: string; className?: string }) {
  const still = useSyncExternalStore(reduced, () => matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  return <video key={String(still)} muted loop={!still} autoPlay={!still} playsInline preload="metadata" aria-hidden src={`/cases/${slug}/${src}`} className={className} />;
}
