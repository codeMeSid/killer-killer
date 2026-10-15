# Story tree JSON schema (`mm-story-tree/1`)

The fastest way to get exact structure is `python scripts/skeleton.py ...`; this file explains every field.
`scripts/validate_tree.py` is the final authority.

## Top level
```
{ "schema": "mm-story-tree/1", "meta": {}, "rules": {}, "world": {}, "scenes": [], "endings": {} }
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
- `suspects[]`: `{id, name, description, public_alibi, motive, player_slot}`. Suspects mode: one per player,
  `player_slot` 1..N. Investigators mode: `npc_suspects` NPCs, `player_slot: null`.
- `killer_id`, `killer_method`: server-side secrets.
- `clues[]`: `{id, kind: key|red_herring, clarity: obvious|subtle|buried, text, points_to}`.
  Key clues point to the killer, red herrings to someone else. Counts per difficulty: key authored easy 5 / medium 6 / hard 7,
  red herrings 1 / 2 / 3.
- `items[]`: `{id, name, description, luck_on_grant: 0|1, decisive: bool}`. Exactly one decisive item.

Difficulty scaling: key clues needed (3/4/5), red herrings, NPC suspects, risky options per scene (1/1/2), and clarity.
Easy leans on `obvious` clues and few traps; hard leans on `subtle` and `buried` clues with more misleading leads.

## scenes[]
```
{ "id": "r3_a", "round": 3, "intro": "...", "options": [A,B,C,D],
  "tie_break_order": ["A","B","C","D"], "variants": [ {slot, requires, option} ] }
```
- Rounds 1: one scene (`r1_a`). Rounds 2-8: 1-3 scenes. Rounds 9 and 10: exactly `r9_solved`, `r9_wrong`, `r9_escape`
  and `r10_solved`, `r10_wrong`, `r10_escape`.
- Each scene has exactly 4 default options in slots A-D, with at least one group and one solo option.
- `variants` replace a slot for players who meet `requires` (`items`: list of item ids, `min_stat`: 1-5, `role`: `"killer"`
  in suspects mode only). First matching variant wins. Variant options follow every option rule.

## option
| field | notes |
|---|---|
| id, slot | unique id; slot A-D matching its position |
| text | the label on the phone |
| recap | past-tense line for the laptop recap; must contain `{player}` |
| tag | `group` (cooperative) or `solo` (selfish) |
| risk | `safe` / `normal` / `risky` |
| tier | `easy` / `medium` / `hard` (thresholds 5 / 7 / 9) |
| lethal_on_fail | bool; risky only; at most one per scene |
| lethal_if_stat_below | null or 1-5; risky only |
| on_death | `{narration}`; required for every risky option |
| follows_red_herring | bool; counts when this option is the plurality pick (rounds 1-8) |
| decisive | bool; only on the gated variant in `r10_solved` |
| bonus_clue_id | null or a key clue id, granted on a natural 6 success |
| leads_to | rounds 1-7: a scene in the next round. Round 8: null. Round 9: the same-track round-10 scene. Round 10: null |
| on_success, on_failure | `{narration, effects[]}` |
| sabotage | optional, solo only: `{scope: player|group, effect}`; needs `exposure` containing `{player}` |

Effects: `{"type":"grant_clue","clue_id":..}`, `{"type":"grant_item","item_id":..}`, `{"type":"luck","delta":-2..2}`,
`{"type":"share_private_clues"}` (group options only).
Sabotage effects: player scope `steal_private_clue`, `steal_personal_item`, `drain_luck`; group scope `destroy_party_clue`,
`destroy_party_item`, `mislead_group`.

## endings
Exactly `solved`, `wrong_culprit`, `culprit_escapes`, each `{title, epilogue}`; `culprit_escapes` also needs
`epilogue_if_downgraded` (used when the solved track fails in round 10).

## Placeholders
Only `{player}`, `{target}`, `{party}`, `{victim}`, `{killer}`, `{survivors}`. Anything else fails validation.

## Solvability guarantee
Validation proves some path through rounds 1-8 can grant enough key clues plus the decisive item, that every scene is
reachable, and that round 9 lets players pool private clues. Place clues so reaching the Solved track takes cooperation,
because group grants are shared while solo grants are private.
