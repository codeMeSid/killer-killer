/** Case cover: palette-only SVG drawn by the model, shown via <img> so scripts cannot run. */
export function Cover({ slug, src, className = "" }: { slug: string; src: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/cases/${slug}/${src}`} alt="" className={`aspect-video w-full border-b border-blue/30 object-cover ${className}`} />;
}
