// Story-tree shape (`mm-story-tree/1`), from the skill's references/schema.md.
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
  requires: { items?: string[]; min_stat?: number; role?: "killer" };
  option: Option;
};

export type Scene = {
  id: string;
  round: number;
  intro: string;
  options: Option[];
  tie_break_order: Slot[];
  variants: Variant[];
};

export type Suspect = {
  id: string;
  name: string;
  description: string;
  public_alibi: string;
  motive: string;
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
  schema: "mm-story-tree/1";
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
  };
  scenes: Scene[];
  endings: {
    solved: { title: string; epilogue: string };
    wrong_culprit: { title: string; epilogue: string };
    culprit_escapes: { title: string; epilogue: string; epilogue_if_downgraded: string };
  };
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

export type RecapKind = "choice" | "outcome" | "sabotage" | "death";
export type RecapLine = { kind: RecapKind; text: string; playerId?: string };

export type Ending = { key: EndingKey; downgraded: boolean };

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
  ending: Ending | null;
};

export type Pick = {
  playerId: string;
  optionId: string;
  pushed: boolean;
  targetId: string | null;
};

export type Rng = () => number;
