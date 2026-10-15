/**
 * A story's own words (`mm-lexicon/1`), written by the murder-mystery-story-tree skill next to its tree.
 * They theme statements, statuses and loaders; buttons keep plain verb + object labels.
 * Placeholders: `{n}` a count in words ("two"), `{N}` the same capitalised ("Two"), `{victim}`.
 * No digits anywhere (CLAUDE.md §13). Contract: .claude/skills/murder-mystery-story-tree/references/lexicon.md.
 */
export type Lexicon = {
  schema: "mm-lexicon/1";
  /** Case-card line under the title: "{victim} never landed." */
  hook: string;
  /** 2–4 single glyphs, space-separated, for the rising ground field. */
  glyphs: string;
  lobby: {
    /** TV header word while people join. */
    phase: string;
    seats: string;
    nobody: string;
    some: string;
    full: [string, string];
    /** Phone headline once seated, two lines. */
    joined: [string, string];
    /** Seat status for someone connected. */
    present: string;
    empty: string;
    waiting: string;
  };
  join: { started: string; full: string; left: string; joining: string; nameTaken: string };
  play: { resolving: string; finale: string; fallen: string; dead: string; loaders: string[] };
  end: { cast: string; alive: string; dead: string; truth: string };
};
