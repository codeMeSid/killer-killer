import { CaseVideo } from "@/components/case-video";
import type { Item } from "@/mysteries/types";

// Scene art is a static p5.brush image shown via <img>, which can't run scripts (CLAUDE.md §12).
const svgSrc = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/** The body of one file, by kind. Title and pin live in the header above it. */
export function ItemBody({ item, slug }: { item: Item; slug: string }) {
  switch (item.kind) {
    case "note":
      return <p className="whitespace-pre-line text-body text-white">{item.body}</p>;
    case "statement":
      return (
        <div className="flex flex-col gap-5">
          <p className="text-ui text-orange">{item.speaker}</p>
          {item.lines.map((l, i) => (
            <div key={i} className="flex flex-col gap-1 text-body">
              <p className="text-blue">{l.q}</p>
              <p className="text-white">{l.a}</p>
            </div>
          ))}
        </div>
      );
    case "report":
      return (
        <div className="flex flex-col gap-6">
          {item.sections.map((s, i) => (
            <section key={i} className="flex flex-col gap-2 border-t border-blue/30 pt-3">
              <h3 className="font-pixel text-ui text-orange">{s.heading}</h3>
              <p className="whitespace-pre-line text-body text-white">{s.body}</p>
            </section>
          ))}
        </div>
      );
    case "photo":
    case "map":
      return (
        <figure className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- data-URI SVG, nothing to optimise */}
          <img src={svgSrc(item.svg)} alt="" className="w-full border border-blue/40 bg-background" />
          <figcaption className="text-body text-white">{item.caption}</figcaption>
        </figure>
      );
    case "video":
      return <CaseVideo slug={slug} src={item.src} poster={item.poster} />;
    case "log":
      return (
        <ul className="flex flex-col text-body">
          {item.rows.map((r, i) => (
            <li key={i} className="flex flex-col gap-0.5 border-t border-blue/30 py-2 sm:flex-row sm:gap-4">
              <span className="shrink-0 text-orange sm:w-28">{r.at}</span>
              <span className="text-white">{r.text}</span>
            </li>
          ))}
        </ul>
      );
  }
}
