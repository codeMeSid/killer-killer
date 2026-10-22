---
name: murder-mystery-story-tree
description: Generate a validated co-op murder case file (folders of suspects, statements, reports, evidence with SVG scene photos, documents, timeline, map) for the killer-killer app, where friends solve one murder together and accuse who, why and how. Use whenever the user wants to create, generate or extend a murder mystery, whodunit, case file, or gives a victim plus difficulty and setting, even if they never say "case file" or "JSON".
---

# Murder Mystery Case File

Turns a victim, difficulty and setting into one folder the app ships: `case.json` (everything the room reads), `solution.json` (the secret truth), `lexicon.json` (the setting's words), `art.ts` (its Hairline figure). Every device sees the same case; the host accuses **who** (a suspect, or nobody for suicide/accident) + **why** (motive) + **how** (method). Contract: `references/schema.md`.

A good case is a **fair puzzle**: each part of the answer is reachable from at least two different items, every innocent can be ruled out, and no item states the answer.

## Inputs
1. **Victim**: name and one line.
2. **Difficulty**: easy / medium / hard (scales suspects, items, herrings, how buried the clues are; sizes in `references/schema.md`).
3. **Setting and tone/rating**: `PG-13` or `mature`.
4. **Killers**: one, two or more, or none (suicide/accident).
Ask in one short message for whatever is missing, then generate.

## Workflow
1. **Plan the truth** first: killer(s), motive, method, the real timeline, and the four to six plausible motives and methods (one right, rest believable, shuffled).
2. **Seed at least two clues per part** (who / why / how), in different item kinds where you can (a statement slip, a document, a report detail). Back each part with different item kinds where possible.
3. **Herrings + rule-outs**: every innocent suspect looks guilty somewhere and is cleared by items you name. Suicide/accident: every suspect needs one.
4. **Write the folders**: statements as Q and A, reports with headed sections, logs, notes. Respect the rating ceiling. Keep sentences under 30 words, concrete nouns, no item may say who did it.
5. **Draw SVG photos and map** (at least one photo): viewBox only, flat strokes and fills, palette only (`#CD3131 #00FFB3 #E5E5E5 #2472C8 #D97757`, background `#0B1215`), no scripts, no external links. A detail the deductions use must be visible in it.
6. **Lexicon**: `lexicon.json` per `references/lexicon.md`.
7. **Art**: make the Hairline figure per `references/art.md` (`hairline-create` skill), then `python3 -I scripts/art.py wrap <name>.js art.ts --slug <slug>`.
8. **Validate to 0 errors, 0 warnings**: `python3 -I scripts/validate_case.py <dir>` and `... --lexicon <dir>/lexicon.json`.
9. **Read it through**: `python3 -I scripts/solve_path.py <dir>`. Check each deduction really follows from its cited items, and the herring rule-outs hold. Fix the case, re-validate.
10. **Install** (inside the killer-killer repo): slug `<victim-kebab>-<setting>-<n>s`; folder `src/mysteries/<slug>/` with the four files; register in `src/mysteries/index.ts` (server-only: case + solution) and `src/mysteries/catalog.ts` (lexicon + art). Run `npm test`.
11. **Deliver**: give the folder path, setting, difficulty, answer in one line, and any assumption made.

## Rules
- **Fiction only.** Invented people; never model the cast or victim on a real named person (change a name that matches a real crime victim).
- **Rating ceiling** on every string: `PG-13` = suspense, mild violence, no gore or graphic detail; `mature` = grim adult themes, never gratuitous, no gore, no explicit sexual content.
- Names read aloud: make them sound different from each other.

## Files
- `scripts/validate_case.py`: case and lexicon (`--lexicon`) validator.
- `scripts/solve_path.py`: read-through of the intended solve.
- `scripts/test_validate.py`: mutation tests for the validator (`python3 -I`).
- `scripts/art.py`: wraps/unwraps a Hairline figure to `art.ts` byte-for-byte.
- `references/{schema,lexicon,art}.md`; `assets/example/` is a small valid easy case; `assets/catalogue.json` is an empty list (no setting catalogue now).
