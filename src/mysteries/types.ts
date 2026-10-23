// Case-file contract (`mm-case-file/1`, `mm-case-solution/1`, `mm-lexicon/1`):
// .claude/skills/murder-mystery-story-tree/references/{schema,lexicon}.md. Mirror them exactly.

export type Difficulty = "easy" | "medium" | "hard";

export type Item = { id: string; title: string } & (
  | { kind: "note"; body: string }
  | { kind: "statement"; speaker: string; lines: { q: string; a: string }[] }
  | { kind: "report"; sections: { heading: string; body: string }[] }
  | { kind: "photo"; svg: string; caption: string }
  | { kind: "log"; rows: { at: string; text: string }[] }
  | { kind: "map"; svg: string; caption: string }
  /** Paths relative to /cases/<slug>/ (public/cases/<slug>/). `captions` = .vtt file. */
  | { kind: "video"; src: string; poster?: string; captions: string }
);

export type FolderKind =
  | "suspects" | "statements" | "reports" | "evidence" | "documents" | "timeline" | "map" | "extras";

/** Public: every device sees it. Nothing in it names the answer. */
export type CaseFile = {
  schema: "mm-case-file/1";
  slug: string;
  title: string;
  difficulty: Difficulty;
  rating: "PG-13" | "mature";
  setting: string;
  tone: string;
  victim: { name: string; summary: string };
  brief: string;
  /** Array index = suspect id. */
  suspects: { name: string; role: string; relation: string; alibi: string; note: string }[];
  folders: { id: string; kind: FolderKind; title: string; items: Item[] }[];
  motives: { id: string; text: string }[];
  methods: { id: string; text: string }[];
  /** Optional rendered media, paths relative to /cases/<slug>/. */
  media?: { teaser?: string };
};

/** Secret: server-only. */
export type Solution = {
  schema: "mm-case-solution/1";
  /** Suspect indexes; [] = suicide/accident. */
  killers: number[];
  motive: string;
  method: string;
  /** Reveal video file in public/cases/<slug>/ (`reveal-<12 hex>.mp4` + .vtt). Secret until ended. */
  reveal?: string;
  story: string[];
  deductions: { claim: string; part: "who" | "why" | "how"; items: string[] }[];
  herrings: { suspect: number; ruled_out_by: string[] }[];
};

/** A story's own words. No digits; at most 60 characters each. */
export type Lexicon = {
  schema: "mm-lexicon/1";
  card: string;
  desk: string;
  accuse: string;
  wrong: string;
  solved: string;
  defeated: string;
  loaders: string[];
  full: string;
  no_room: string;
  gone: string;
};
