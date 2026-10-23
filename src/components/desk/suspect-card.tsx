import type { CaseFile } from "@/mysteries/types";

export function SuspectCard({ suspect }: { suspect: CaseFile["suspects"][number] }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-pixel text-statement text-white">{suspect.name}</h2>
      <p className="text-ui text-orange">{suspect.role}</p>
      <dl className="flex flex-col gap-4 text-body text-white">
        <div>
          <dt className="text-meta text-blue">Relation to the victim</dt>
          <dd>{suspect.relation}</dd>
        </div>
        <div>
          <dt className="text-meta text-blue">Alibi</dt>
          <dd>{suspect.alibi}</dd>
        </div>
        <div>
          <dt className="text-meta text-blue">Note</dt>
          <dd>{suspect.note}</dd>
        </div>
      </dl>
    </div>
  );
}
