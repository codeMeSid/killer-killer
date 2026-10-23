import type { CaseFile } from "@/mysteries/types";

export const BRIEF = "brief";
export const suspectId = (i: number) => `suspect:${i}`;

/** The file tree: Brief first, then every folder with its items. Suspects get a synthetic folder when the case has none. */
export function FolderWindow({
  c,
  selected,
  onSelect,
  pinned,
  reading = {},
}: {
  c: CaseFile;
  selected: string | null;
  onSelect: (id: string) => void;
  pinned: Set<string>;
  /** Item id -> other agents reading it right now. */
  reading?: Record<string, number[]>;
}) {
  const hasSuspects = c.folders.some((f) => f.kind === "suspects");
  const row = (id: string, label: string) => (
    <li key={id}>
      <button
        type="button"
        onClick={() => onSelect(id)}
        aria-current={selected === id}
        className={`grid min-h-11 w-full grid-cols-[1.25ch_minmax(0,1fr)] gap-x-2 py-1.5 pl-3 text-left text-body transition-colors hover:text-orange focus-visible:text-orange focus-visible:outline-none ${
          selected === id ? "text-orange" : "text-white"
        }`}
      >
        <span aria-hidden>{selected === id ? ">" : ""}</span>
        <span className="min-w-0">{label}</span>
        {(reading[id]?.length || pinned.has(id)) && (
          <span className="col-start-2 flex gap-3 text-meta">
            {reading[id]?.length ? <span className="text-blue">Agent {reading[id].join(", ")} reading</span> : null}
            {pinned.has(id) && <span className="text-orange">Pinned</span>}
          </span>
        )}
      </button>
    </li>
  );
  return (
    <nav aria-label="Case file" className="flex flex-col gap-5">
      <ul>{row(BRIEF, "Brief")}</ul>
      {!hasSuspects && (
        <section>
          <h2 className="font-pixel text-ui text-blue">Suspects</h2>
          <ul>{c.suspects.map((s, i) => row(suspectId(i), s.name))}</ul>
        </section>
      )}
      {c.folders.map((f) => (
        <section key={f.id}>
          <h2 className="font-pixel text-ui text-blue">{f.title}</h2>
          <ul>{f.items.map((it) => row(it.id, it.title))}</ul>
        </section>
      ))}
    </nav>
  );
}
