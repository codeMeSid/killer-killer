# Engine rules (authoritative)

These rules are the contract between the generated story tree and the app. The numbers live in
`scripts/constants.py`; the validator enforces everything that can be checked structurally.

## Contents
1. Setup and roles
2. Player state
3. The round loop
4. Rolling
5. Luck
6. Clues, stat, items
7. Sabotage
8. Death
9. Branching
10. The pivot (round 8)
11. Rounds 9-10 and endings
12. What each screen may see
13. Edge cases

## 1. Setup and roles
- Inputs: setting (catalogue entry), victim, player count (2-6), difficulty (easy/medium/hard).
- The catalogue entry fixes the players' **role**:
  - `investigators`: the killer is an NPC suspect. The tree has `npc_suspects` NPCs (easy 3, medium 4, hard 5).
  - `suspects`: every player is a suspect (one suspect per player, `player_slot` 1..N). The victim is an extra NPC.
    The killer is one of the player slots. The app maps real players to slots **randomly at game start**, so the same
    tree can be replayed. Only the killer's phone is told they are the killer, privately.
- Alibis, motives and all suspect info are **public**. Hidden state is limited to the killer identity, private clues, and unrolled dice.

## 2. Player state
- Two stats only: `closer_to_mystery` (0-5, start 0) and `luck` (0-5, start 3). No other stats exist.
- Status: alive or dead. Plus inventory (personal items), private clues, and the shared **party** pool (shared clues, party items).

## 3. The round loop
Ten rounds on a fixed spine. Round 10 is the deadline (the clock reaches its end value). Each round:
1. **Show scene.** Each alive player's base options are their own character's set (`personal[player_slot]`, suspects
   mode) or the shared `options` (investigators mode). Per slot A-D, the first variant open to them (`player_slot` absent
   or theirs) whose `requires` they meet replaces the base option. Every player always sees exactly 4 options.
2. **Lock-in.** All alive players choose at the same time. A player may toggle *push your luck* (Section 5) and, for
   player-scope sabotage, name a target.
3. **Roll** every pick in the background (Section 4). Luck used for rolls and lethal checks is the value at round start.
4. **Apply effects** from `on_success` / `on_failure` for all picks (clue and item grants, luck changes, sharing).
5. **Apply sabotage** in player-slot order, against the state after step 4 (Section 7).
6. **Deaths** resolve (Section 8) and belongings drop to the party.
7. **Branch** (Section 9).
8. **Recap on the laptop**, in this order: for each player, their choice (`recap`) and the outcome narration
   (`on_success.narration`, `on_failure.narration`, or `on_death.narration`); then any sabotage exposure lines; then deaths;
   then (round 10 only) the finale evidence; then the next scene's `intro` (the new stage). Never show numbers, rolls, or
   the word "roll". The round's intro and recap are also kept as the **story so far**, which every phone can reread.
9. **State update** to phones: stats, clues, items, and each player's private **round result**, a short list in words:
   what they found (the clue text or item name, and whether everyone got it), what was taken from them ("Someone took
   your …", never who), whether their luck rose or fell, or "Nothing came of it". Never numbers.

`{player}`, `{target}` and `{survivors}` resolve to **character names** (the suspect's `name`) in suspects mode, so the
story stays in its fiction and every line is known before the game starts. Investigators mode uses the players' own names.

## 4. Rolling
- Every option rolls: `d6 + luck (+2 if pushed)` against the tier threshold: easy 5, medium 7, hard 9.
- Total >= threshold is **success**, otherwise **failure**. Rolls are never shown.
- Natural 1: always a failure and costs 1 extra luck.
- Natural 6 with a success: +1 luck, and the option's `bonus_clue_id` (if any) is also granted.

## 5. Luck
- Range 0-5, start 3. Failure costs 0 luck, so one bad roll does not snowball.
- Group-tagged option succeeds: +1 luck. Item with `luck_on_grant: 1`: +1 luck when gained. `luck` effects add or subtract.
- **Push your luck:** once per round, declared at lock-in, spend 1 luck for +2 on that roll. The luck is gone even if the
  roll succeeds. Not allowed at 0 luck.

## 6. Clues, stat, items
- Clue kinds: `key` (true, points to the killer) and `red_herring` (points to an innocent suspect).
- `closer_to_mystery` = number of distinct **key** clues the player knows, capped at 5. Red herrings never raise it.
- Clue visibility comes from the option tag: **group** option grants the clue to all alive players (shared);
  **solo** option grants it only to the acting player (private). `share_private_clues` (group options only) makes the
  actor's private clues shared with everyone.
- Items work the same way: group grants go to the party pool (usable by any alive player), solo grants are personal.
- An item or clue gate (`requires`) is met by personal or party holdings. `min_stat` uses the player's own stat.
- Solo option narration is public, so it must not reveal what the clue says. The clue text appears only on the holder's phone.

## 7. Sabotage
- Only solo-tagged options can carry `sabotage`. It does **not** depend on the roll; the roll still decides that option's
  normal success/failure effects.
- **Player scope** (`steal_private_clue`, `steal_personal_item`, `drain_luck`): needs a target. It applies only if the
  target also picked a **solo** option this round and is alive; otherwise it fizzles. Steals take the target's most recently
  gained item or private clue and give it to the saboteur (the target's stat falls accordingly). `drain_luck` is -1 to the target.
- **Group scope** (`destroy_party_clue`, `destroy_party_item`, `mislead_group`): hits the shared pool, so cooperative pickers
  are not protected. Destroy removes the most recently gained shared clue or party item for everyone. `mislead_group` adds 1 to
  the red-herring commit counter.
- Every sabotage attempt, even a fizzled one, is exposed in the recap with the option's `exposure` line naming the culprit.
- The killer (in suspects mode) gets private cover-up options as part of their own character's `personal` set.

## 8. Death
A player who picks a `risky` option and **fails** the roll dies if any of these holds:
1. the option has `lethal_on_fail: true`;
2. the player's luck at round start was 0;
3. the option has `lethal_if_stat_below: n` and the player's stat is below n.
Safe and normal options never kill. Dead players spectate: no picks, no votes, no effects. Their personal items and private clues
drop to the party (found on the body), so a death never soft-locks the solution.

## 9. Branching
- Scene ids are `r<round>_<label>`. Rounds 2-8 have 1-3 scenes; paths diverge and merge.
- Count the picks of players alive at round start by their option's `leads_to`. The scene with the most picks is next.
- Ties: the tied scene whose picks had the most successful rolls wins; if still tied, the first one in the scene's
  `tie_break_order`.
- If at least half of the round's picks have `follows_red_herring: true` (rounds 1-8), the red-herring commit counter
  goes up by 1.
- Round 8 has no `leads_to`: the track (Section 10) selects round 9.

## 10. The pivot (round 8)
After round 8 resolves, lock the ending **track** from the hidden state of alive players plus the party pool:
1. **solved** if the group knows at least `key_needed` distinct key clues (easy 3, medium 4, hard 5) and the decisive item
   is held by the party or an alive player;
2. else **wrong** if the red-herring commit counter is at least 2;
3. else **escape**.
The track selects `r9_<track>` and then `r10_<track>`. Players are not told. It can never be upgraded afterwards.

## 11. Rounds 9-10, the vote and endings
- Round 9 always offers every player a group option with `share_private_clues`, so players can pool findings before the finale.
- Round 10 on the **solved** track contains a gated **decisive** variant open to everyone: it appears for a player holding
  the decisive item with `closer_to_mystery >= key_needed`. It is group-tagged, medium tier.
- **Finale evidence**, set when round 10 resolves and narrated at the end of its recap:
  - track `solved` and at least one decisive pick succeeded: `world.finale.proof`;
  - track `wrong`: `world.finale.frame` (a convincing case against an innocent);
  - otherwise: nothing. The room votes on what it has.
- **The vote.** Every living player secretly names one suspect, never their own character; the killer votes too.
  The suspect with the most votes is accused:
  - the killer → **Solved**;
  - an innocent → **Wrong Culprit** (`{accused}` is that suspect);
  - a tie for the most votes → **Culprit Escapes**.
  The TV reveals each vote, then the truth.
- Personal result: the killer wins unless the ending is Solved; everyone else wins only when it is.
- Epilogue placeholders: `{victim}`, `{killer}`, `{survivors}`, and `{accused}` in Wrong Culprit.

## 12. What each screen may see
- Laptop (narrator): public narration, recaps, clock, who is alive, party pool. Never `killer_id`, `points_to`, private clues, or rolls.
- Phone: its own 4 options, own stats, own private clues and items, own character's `secret`, own round result, the
  story so far, party pool. The killer's phone additionally shows the killer notice.
- Keep `world.killer_id`, `world.killer_method` and every `points_to` server-side.

## 13. Edge cases
- All players dead: end immediately with Culprit Escapes. No vote.
- Suspects mode, killer is the only player left alive: end immediately with Culprit Escapes. No vote.
- A player who dies this round still counts in this round's branch count. Dead players do not vote.
- Luck is clamped to 0-5; stat is clamped to 0-5.
- A fizzled or already-resolved effect never errors; it is simply skipped and narrated generically.
