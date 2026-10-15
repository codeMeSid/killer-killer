---
name: murder-mystery-story-tree
description: Generate a branching murder-mystery story tree as validated JSON for a multiplayer game app (a laptop narrator screen plus phone controllers). Use whenever the user wants to create, generate or extend a murder mystery game, whodunit, or branching mystery with player choices, clues, items, dice/luck and multiple endings, or gives a victim plus number of players, difficulty and setting for a mystery game, even if they never say "story tree" or "JSON".
---

# Murder Mystery Story Tree

Turns four inputs into one JSON file that the user's app plays: 10 rounds, 4 options per player per round,
a hidden dice-and-luck engine, a locked ending track at round 8, and three endings (1 solved, 2 unsolved).
Each story also gets its own words (`lexicon.json`) and a Hairline figure (`art.ts`), shipped together as one folder.

The rules are fixed and enforced by a validator. Players are not asked to design anything; you write the story
and the validator proves it obeys the engine.

## Inputs
1. **Setting**: an `id` from `assets/catalogue.json`. The entry fixes premise, tone, content rating, the players' role
   (investigators or suspects) and optionally a clock. The user may also paste a new entry; check it with
   `python scripts/validate_tree.py --catalogue-entry entry.json` and use it.
2. **Victim**: who was murdered (name and a line of description).
3. **Player count**: 2 to 6.
4. **Difficulty**: easy, medium or hard (scales clues needed, red herrings, suspects, traps, clue clarity).

Later, for the art, the user also picks one of two or three figure concepts (Workflow step 7).

## First step: ask for the setting
Every time this skill triggers, ask which setting to play before generating anything. Read `assets/catalogue.json` and
offer every entry by name with its role and rating (for example "Skyfall: suspects, PG-13"). When `ask_user_input_v0`
is available, use it with one option per entry (up to 4; list any others in text), and mention that the user can paste a
new entry instead. Skip the question only when the user's message already names a catalogue entry.

Once the setting is chosen, ask in one short message for whichever of victim, player count and difficulty are still
missing (tappable options suit difficulty), then generate. Never invent a catalogue entry on the user's behalf.

## Workflow
1. Ask for the setting and any missing inputs as described above. Then read `references/engine-rules.md`
   (what the app will do) and `references/schema.md` (the JSON shape).
2. Design the mystery before writing scenes: killer, motive, method, suspects (public alibis), the key clues with their
   clarity, the red herrings, the decisive item, and the clock values for the 10 rounds (round 10 is the deadline).
   In suspects mode the victim is an extra NPC and the killer is one player slot.
3. Create a scaffold: `python scripts/skeleton.py --difficulty <d> --players <n> --role <role> --out tree.json`
   (run scripts from this skill's folder; keep tree.json in a scratch or working directory).
   It already has valid ids, links, clue and item placement, sabotage, one lethal option, killer variants and the gated finale.
4. Fill every `TODO` and adapt the structure where the story needs it (more scenes per round, different clue placement,
   more variants), keeping every rule in the schema. Rewrite the JSON file directly or with a small script.
5. Validate: `python scripts/validate_tree.py tree.json`. Fix every error and read every warning until it is clean.
6. Words: write `lexicon.json` per `references/lexicon.md` (the setting's own vocabulary for statements, statuses and
   loaders; no digits). Validate: `python scripts/validate_tree.py tree.json --lexicon lexicon.json`.
7. Art: make the story's Hairline figure per `references/art.md`. Offer two or three concepts and wait for the user's
   pick, then build until `look.mjs` exits 0 and wrap it with `python scripts/art.py wrap <name>.js art.ts --slug <slug>`.
8. Install (only inside the killer-killer repo): slug `<victim-kebab>-<setting>-<n>p` (e.g. `theo-marsh-skyfall-2p`).
   Create `src/mysteries/<slug>/` holding `tree.json`, `lexicon.json` and `art.ts`. Register the slug in both
   `src/mysteries/index.ts` (server-only tree import + `MYSTERIES` entry) and `src/mysteries/catalog.ts` (`LEXICON`
   import + `ART` dynamic import). Run `npm test`: the fuzz test finds story folders by itself.
9. Deliver: in the repo, the installed folder is the deliverable; give its path. Elsewhere save `<slug>/` with the
   three files (in claude.ai under `/mnt/user-data/outputs/` and call `present_files`; otherwise in the current working
   directory) and give the path. Then reply in a few lines: setting, role, difficulty, the three endings in one phrase
   each, the figure's name and tour, `npm test` result if run, and any assumption you made.

## Writing the story
- **Four distinct options per scene.** At least one group (cooperative) and one solo (selfish) option, each with a clear
  consequence. Make the selfish options tempting: faster clues, private advantage, or a chance to sabotage.
- **Place clues so cooperation matters.** Group options give shared clues, solo options give private ones; the final move
  needs one player who personally knows enough clues, so hoarding has a cost.
- **Dice are invisible.** Narration never mentions rolls, numbers, luck points or thresholds. Describe outcomes as story
  ("your hands slip", "a lucky break").
- **Solo narration is public.** The laptop shows it to everyone, so it must not reveal a private clue's content.
  Say that the player found something and kept it quiet.
- **Recaps read well in sequence.** `recap` is the past-tense line shown per player ("{player} climbed onto the wing and ...").
  Outcome narration continues from it. Each scene `intro` sets up the new stage and the clock.
- **Sabotage exposure** names the culprit in plain terms, because exposure is immediate.
- **Respect the content rating as a ceiling** on every string, including deaths and sabotage:
  - `family`: peril is mild, deaths are implied or off-page, no blood or weapon detail.
  - `pg13`: suspense and mild violence, no gore or graphic injury detail.
  - `mature`: grim, cynical, adult themes such as betrayal and corruption, deaths may be stark but never gratuitous;
    no gore detail and no explicit sexual content.
- **Fiction only.** Use invented people. Do not model the cast on real named individuals.
- **Clarity by difficulty.** Easy leans on `obvious` clues and few traps; medium mixes `obvious` and `subtle`; hard uses
  `subtle` and `buried` clues, more misleading leads, and up to two risky options per scene.
- **Endings.** Write the Solved, Wrong Culprit and Culprit Escapes epilogues using `{victim}`, `{killer}`, `{survivors}`.
  `epilogue_if_downgraded` is for a group that had the case within reach and missed the final move.

## Files
- `scripts/constants.py`: every number and enum in one place.
- `scripts/skeleton.py`: valid scaffold generator.
- `scripts/validate_tree.py`: tree, lexicon (`--lexicon`) and catalogue validator (run it every time).
- `scripts/art.py`: wraps a Hairline figure file into `art.ts` and unwraps it back, byte-for-byte.
- `references/engine-rules.md`: the engine contract; hand this to the app developer too.
- `references/schema.md`: field-by-field schema.
- `references/lexicon.md`: the `mm-lexicon/1` contract, where each word shows, three example lexicons.
- `references/art.md`: how story art is made with `hairline-create`.
- `assets/catalogue.json`: the setting catalogue (currently one sample entry).
