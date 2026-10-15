# Story tree JSON schema (`mm-story-tree/2`)

The fastest way to get exact structure is `python scripts/skeleton.py ...`; this file explains every field.
`scripts/validate_tree.py` is the final authority.

## Top level
```
{ "schema": "mm-story-tree/2", "meta": {}, "rules": {}, "world": {}, "scenes": [], "endings": {} }
```

## meta
| field | notes |
|---|---|
| title, premise, tone | strings; premise and tone come from the catalogue entry |
| setting_id | catalogue entry id |
| difficulty | `easy` / `medium` / `hard` |
| player_count | 2-6 |
| player_role | `investigators` / `suspects` (from the catalogue entry) |
| victim | `{name, description}` supplied by the user |
| content_rating | `family` / `pg13` / `mature` (from the catalogue entry); a ceiling on all narration |

## rules
Copy verbatim from the skeleton. The validator rejects any change.

## world
- `clock`: `{label, unit, values[10]}`. One display value per round; round 1 is the start, round 10 is the deadline
  (for example altitude 4000 m falling to 0 m). Derive values from the catalogue entry's `clock` if it has one.
- `suspects[]`: `{id, name, short_name?, description, public_alibi, motive, secret, player_slot}`.
  - Suspects mode: one per player, `player_slot` 1..N, and every suspect needs a `secret`.
  - Investigators mode: `npc_suspects` NPCs, `player_slot: null`; `secret` is optional.
  - `short_name` (optional, defaults to `name`) is what the narration calls the character (`{player}`, `{target}`,
    `{survivors}`), usually a first name: "Rafe", not "Rafe Kincaid" on every line. Pick names that sound different read aloud.
  - `secret` is private: it appears only on that character's own phone. It is something the character would lie to hide
    and is unrelated to the murder for innocents, such as debt, an affair or a theft. The killer's secret can be the motive.
- `killer_id`, `killer_method`: server-side secrets.
- `clues[]`: `{id, kind: key|red_herring, clarity: obvious|subtle|buried, text, points_to}`.
  Key clues point to the killer, red herrings to someone else. Counts per difficulty: key authored easy 5 / medium 6 / hard 7,
  red herrings 1 / 2 / 3.
- `items[]`: `{id, name, description, luck_on_grant: 0|1, decisive: bool}`. Exactly one decisive item.
- `finale`: `{proof, frame, frame_points_to}`. This is the evidence the TV shows just before the vote.
  - `proof` is what the decisive move uncovers. It must cite the key clues and make the killer undeniable.
  - `frame` is a convincing case against `frame_points_to`, an innocent suspect that a red herring points to.
  - The escape track shows neither.

Difficulty scaling: key clues needed (3/4/5), red herrings, NPC suspects, risky options per set (1/1/2), and clarity.
Easy leans on `obvious` clues and few traps; hard leans on `subtle` and `buried` clues with more misleading leads.

## scenes[]
```
{ "id": "r3_a", "round": 3, "intro": "...",
  "personal": { "1": [A,B,C,D], "2": [A,B,C,D], ... },      // suspects mode
  "options": [A,B,C,D],                                       // investigators mode instead
  "tie_break_order": ["r4_a", "r4_b"],
  "variants": [ {slot, player_slot?, requires, option} ] }
```
- Rounds 1: one scene (`r1_a`). Rounds 2-8: 1-3 scenes. Rounds 9 and 10: exactly `r9_solved`, `r9_wrong`, `r9_escape`
  and `r10_solved`, `r10_wrong`, `r10_escape`.
- **Suspects mode:** `personal` maps every `player_slot` to that character's own four options (slots A-D). There is no
  shared `options`. Option ids carry the slot: `r3_a_p2_B`. Each set has at least one group and one solo option. The
  killer's character holds its own sabotage options directly.
- **Investigators mode:** `options` holds the four options every player sees.
- `tie_break_order` (rounds 1-7) lists each scene this scene's options lead to, once. A tie between paths goes to the
  first one listed. From round 8 on it is `[]`.
- `variants` replace a slot for players who meet `requires` (`items`: list of item ids, `min_stat`: 1-5). `player_slot`
  limits a variant to one character; leave it out to offer the variant to everyone (the round-10 decisive variant must be
  open to everyone). First matching variant wins. Variant options follow every option rule.

## option
| field | notes |
|---|---|
| id, slot | unique id; slot A-D matching its position |
| text | the label on the phone; completes "You will …", lowercase, at most 8 words, no end mark |
| recap | past-tense line on the TV; must contain `{player}` |
| tag | `group` (the actor brings something to everyone) or `solo` (the actor keeps it) |
| risk | `safe` / `normal` / `risky` |
| tier | `easy` / `medium` / `hard` (thresholds 5 / 7 / 9) |
| lethal_on_fail | bool; risky only; at most one per set |
| lethal_if_stat_below | null or 1-5; risky only |
| on_death | `{narration}` containing `{player}`; required for every risky option |
| follows_red_herring | bool; counts when at least half the round's picks follow a red herring (rounds 1-8) |
| decisive | bool; only on the gated variant in `r10_solved` |
| bonus_clue_id | null or a key clue id, granted on a natural 6 success |
| leads_to | rounds 1-7: a scene in the next round. Round 8: null. Round 9: the same-track round-10 scene. Round 10: null |
| on_success, on_failure | `{narration, effects[]}`; both narrations contain `{player}`. `on_success` must change something: at least one effect, unless the option is a sabotage or decisive |
| sabotage | optional, solo only: `{scope: player|group, effect}`; needs `exposure` containing `{player}` |

Effects: `{"type":"grant_clue","clue_id":..}`, `{"type":"grant_item","item_id":..}`, `{"type":"luck","delta":-2..2}`,
`{"type":"share_private_clues"}` (group options only).
Sabotage effects: player scope `steal_private_clue`, `steal_personal_item`, `drain_luck`; group scope `destroy_party_clue`,
`destroy_party_item`, `mislead_group`.

## endings
Exactly `solved`, `wrong_culprit`, `culprit_escapes`, each `{title, epilogue}` and nothing else.
- `solved`: the vote named the killer.
- `wrong_culprit`: the vote named an innocent. Its epilogue must name them with `{accused}`.
- `culprit_escapes`: the vote tied at the top, or everyone died first.

Each epilogue should explain the red herrings' innocent truth.

## Placeholders
Only `{player}`, `{target}`, `{party}`, `{victim}`, `{killer}`, `{survivors}`, `{accused}` (endings only). Anything else
fails validation. `{player}`, `{target}` and `{survivors}` read as character names in suspects mode.

## Solvability guarantee
Validation proves some path through rounds 1-8 can grant enough key clues plus the decisive item without the killer's
own options, that every scene is reachable, and that on round 9 every player can pool private clues. Place clues so
reaching the Solved track takes cooperation, because group grants are shared while solo grants are private.
