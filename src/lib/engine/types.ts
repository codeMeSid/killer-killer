// Story-tree shape (`mm-story-tree/2`), from the skill's references/schema.md.
// The skill's validate_tree.py is the authority on what a valid tree looks like.

export type Slot = "A" | "B" | "C" | "D";
export type Tag = "group" | "solo";
export type Risk = "safe" | "normal" | "risky";
export type Tier = "easy" | "medium" | "hard";
export type Difficulty = Tier;
export type Role = "investigators" | "suspects";
export type Track = "solved" | "wrong" | "escape";
export type EndingKey = "solved" | "wrong_culprit" | "culprit_escapes";

export type Effect =
  | { type: "grant_clue"; clue_id: string }
  | { type: "grant_item"; item_id: string }
  | { type: "luck"; delta: number }
  | { type: "share_private_clues" };

export type Sabotage =
  | { scope: "player"; effect: "steal_private_clue" | "steal_personal_item" | "drain_luck" }
  | { scope: "group"; effect: "destroy_party_clue" | "destroy_party_item" | "mislead_group" };

export type Outcome = { narration: string; effects: Effect[] };

export type Option = {
  id: string;
  slot: Slot;
  text: string;
  recap: string;
  tag: Tag;
  risk: Risk;
  tier: Tier;
  lethal_on_fail: boolean;
  lethal_if_stat_below: number | null;
  follows_red_herring: boolean;
  decisive: boolean;
  bonus_clue_id: string | null;
  leads_to: string | null;
  on_success: Outcome;
  on_failure: Outcome;
  on_death?: { narration: string };
  sabotage?: Sabotage;
  exposure?: string;
};

export type Variant = {
  slot: Slot;
  /** Limits the variant to one character; absent = open to every player. */
  player_slot?: number;
  requires: { items?: string[]; min_stat?: number };
  option: Option;
};

export type Scene = {
  id: string;
  round: number;
  intro: string;
  /** Investigators mode: the four options every player sees. */
  options?: Option[];
  /** Suspects mode: each character's own four options, keyed by player_slot. */
  personal?: Record<string, Option[]>;
  /** Next-scene ids in tie-break order (rounds 1-7). */
  tie_break_order: string[];
  variants: Variant[];
};

export type Suspect = {
  id: string;
  name: string;
  /** What the narration calls the character (defaults to name). */
  short_name?: string;
  description: string;
  public_alibi: string;
  motive: string;
  /** Private: shown only on this character's own phone. */
  secret?: string;
  player_slot: number | null;
};

export type Clue = {
  id: string;
  kind: "key" | "red_herring";
  clarity: "obvious" | "subtle" | "buried";
  text: string;
  points_to: string;
};

export type Item = {
  id: string;
  name: string;
  description: string;
  luck_on_grant: 0 | 1;
  decisive: boolean;
};

export type Tree = {
  schema: "mm-story-tree/2";
  meta: {
    title: string;
    setting_id: string;
    difficulty: Difficulty;
    player_count: number;
    player_role: Role;
    victim: { name: string; description: string };
    tone: string;
    content_rating: "family" | "pg13" | "mature";
    premise: string;
  };
  rules: unknown;
  world: {
    clock: { label: string; unit: string; values: string[] };
    suspects: Suspect[];
    killer_id: string;
    killer_method: string;
    clues: Clue[];
    items: Item[];
    /** Evidence shown before the vote: proof (solved track, decisive move landed) or frame (wrong track). */
    finale: { proof: string; frame: string; frame_points_to: string };
  };
  scenes: Scene[];
  endings: Record<EndingKey, { title: string; epilogue: string }>;
};

// ---- runtime state (server-only; never sent to a client as-is)

export type PlayerState = {
  id: string;
  name: string;
  /** Suspect player_slot in suspects mode, join seat otherwise. Sabotage resolves in this order. */
  slot: number;
  suspectId: string | null;
  luck: number;
  alive: boolean;
  /** Private clue ids, oldest first (steals take the last). */
  clues: string[];
  /** Personal item ids, oldest first. */
  items: string[];
};

/** `evidence` is the finale proof or frame, read out at the end of round 10. */
export type RecapKind = "choice" | "outcome" | "sabotage" | "death" | "evidence";
export type RecapLine = { kind: RecapKind; text: string; playerId?: string };

/** `accused` is the index into world.suspects the vote named (null: tie, or the story ended before a vote). */
export type Ending = { key: EndingKey; accused: number | null };

/** What one round did to one player, shown only on their phone. Ids never leave the server raw. */
export type Result =
  | { type: "found_clue"; clueId: string; shared: boolean }
  | { type: "found_item"; itemId: string; shared: boolean }
  | { type: "shared" }
  | { type: "lost"; what: "clue" | "item" }
  | { type: "luck"; up: boolean };

export type HistoryEntry = { clock: string; intro: string; recap: { kind: RecapKind; text: string }[] };

export type GameState = {
  round: number;
  sceneId: string;
  players: PlayerState[];
  killerPlayerId: string | null;
  partyClues: string[];
  partyItems: string[];
  redHerrings: number;
  track: Track | null;
  /** What happened in the round that just resolved (empty before round 1). */
  recap: RecapLine[];
  /** Earlier rounds as they were narrated (filled text), oldest first: the phones' "story so far". */
  history: HistoryEntry[];
  /** The last round's private results per player id. */
  results: Record<string, Result[]>;
  /** Finale evidence text, set when round 10 resolves (null: the room votes blind). */
  evidence: string | null;
  /** Round 10 is over and the accusation vote is open. */
  voting: boolean;
  /** Who voted for whom (player id → suspect index), once the vote is counted. */
  votes: Record<string, number> | null;
  ending: Ending | null;
};

export type Pick = {
  playerId: string;
  optionId: string;
  pushed: boolean;
  targetId: string | null;
};

export type Rng = () => number;
