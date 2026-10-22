# Case-file co-op — design

Approved by the user 2026-10-22. Replaces the "one of us is the killer" round game entirely.

Reference: Shuffle Games "Murder Mystery Express" (boxed case files: crime-scene photos, forensic
reports, witness statements, clues; pick a case, read everything, connect the dots, check the answer).
We go further: answer is who + why + how, two guesses, leaderboard.

## Game

1. `/` boot menu → **Start Case** / **Join Case**.
2. **Start**: pick a case cartridge, type a **team name**, room created (8-char code + QR).
   The device that started is the host. The clock starts at creation.
3. **Join**: code on any device. No player names; devices show as **Agent 1…8** (join order).
4. **Desk**: every device sees the same case file as a retro desktop of folders. Everything is open
   from the start (no staged envelopes, no unlocks). Folders (skill decides which exist per case):
   `Suspects`, `Statements`, `Reports` (police / autopsy / forensics), `Evidence` (incl. scene
   photos as SVG), `Documents` (letters, texts, receipts, phone logs), `Timeline`, `Map`, `Extras`
   (anything else that helps without naming the answer). Click folder → window listing items →
   item opens. Phone 375px: folder list + full-screen item view, not floating windows.
5. **Live sync** (all three): presence roster; "Agent 2 reading" markers per item (presence
   state, no DB); pins any agent toggles, visible on every device (DB + doorbell).
6. **Clock** counts up from start, shown on every device.
7. **Accuse (host only)**: Who = multi-select suspects **or** "No one — suicide/accident" (count of
   killers never told); Why = one of the case's motives (4–6); How = one of the case's methods (4–6).
   Multi-killer cases share one why + how. All three must match.
   - Wrong #1: every device shows **Wrong** (not which part), one guess left.
   - Wrong #2: **defeated** → reveal.
   - Right: **solved** → reveal → leaderboard row.
8. **Reveal**: true story, solution, time, guesses used, team's place on both boards.
9. **Leaderboards**: per case (solved on guess 1 before guess 2, then fastest) and global
   (score = base [easy 100 / medium 200 / hard 300] × [guess 1: 1.0, guess 2: 0.6] + time bonus
   fading linearly from 100 at 0 min to 0 at 120 min). Defeats not listed.

## Data

New migration drops `picks`, `players`, `votes`, old `rooms`; creates:

- `rooms(code, case_slug, team, host_id, status playing|solved|defeated, guesses_used 0..2,
  started_at, ended_at)`
- `members(room_id, user_id, agent 1..8)`
- `pins(room_id, item_id, by_agent)` pk (room_id,item_id)
- `guesses(room_id, n 1..2, who int[], motive, method, correct)`
- `results(room_id, case_slug, team, guesses, seconds, score)` — leaderboard source

RLS on, no policies, no grants (same as today); `private.is_room_member` rewritten for `members`.
Race safety: guess = `update rooms set guesses_used = n where status='playing' and guesses_used = n-1`.

## Secrecy

Case file is public to members. Solution (killers, true motive/method, true story) is
`solution.json`, server-only, leaves only after the room ends. Motive/method options are shuffled per
case at build time and carry opaque ids; suspects by index.

## Skill rewrite (`murder-mystery-story-tree` → schema `mm-case-file/1`)

Inputs: victim, difficulty, setting, tone/rating, killers (1, 2+, or suicide).
Output folder `src/mysteries/<slug>/`: `case.json`, `solution.json`, `lexicon.json` (themed words),
`art.ts` (Hairline figure). Scene photos = SVG drawn by the model, inline in `case.json` items
(user, 2026-10-22: Opus draws them; no image API).
Validator: every true answer part deducible from ≥2 independent items; no item names the killer;
every red herring ruled out by ≥1 item; difficulty scales suspects/items/herrings; suicide case has
no killer and still adds up; SVG palette-only, no scripts. `solve_path.py` prints the deduction chain.
Drops: player count, rounds, options, tracks, secrets, engine-rules.

## Look

Keep palette, fonts, CRT glass, SFX, story art. All devices use `computer` machine as a desktop with
pixel-frame windows. Redesign only start / lobby / desk / accuse / reveal / leaderboard.

## Removed

`src/lib/engine/`, narrator voice, round/phase UI (`/mystery`, `/story`, `/end`, narrator,
ground, phase bar), Monster + Choomantar stories, engine fixtures, pending `vote` migration.

## Then

Generate one easy demo case with the new skill.
