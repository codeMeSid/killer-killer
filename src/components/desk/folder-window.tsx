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
        className={`flex min-h-11 w-full items-center gap-2 py-1 pl-3 text-left text-body transition-colors hover:text-orange focus-visible:text-orange focus-visible:outline-none ${
          selected === id ? "text-orange" : "text-white"
        }`}
      >
        <span aria-hidden>{selected === id ? ">" : " "}</span>
        <span className="min-w-0 flex-1">{label}</span>
        {reading[id]?.length ? <span className="text-meta text-blue">Agent {reading[id].join(", ")}</span> : null}
        {pinned.has(id) && <span className="text-meta text-orange">Pinned</span>}
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
