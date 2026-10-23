---
model: opus
name: murder-mystery-story-tree
description: Generate a validated co-op murder case file (folders of suspects, statements, reports, evidence with SVG scene photos, documents, timeline, map) for the killer-killer app, where friends solve one murder together and accuse who, why and how. Use whenever the user wants to create, generate or extend a murder mystery, whodunit, case file, or gives a victim plus difficulty and setting, even if they never say "case file" or "JSON".
---

# Murder Mystery Case File

Turns a victim, difficulty and setting into one folder the app ships: `case.json` (everything the room reads), `solution.json` (the secret truth), `lexicon.json` (the setting's words), a drawn SVG cover (`public/cases/<slug>/cover.svg`). Every device sees the same case; the host accuses **who** (a suspect, or nobody for suicide/accident) + **why** (motive) + **how** (method). Contract: `references/schema.md`.

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
7. **Cover**: draw `public/cases/<slug>/cover.svg` yourself (Opus writes the SVG; no raster generator, no Hairline). 16:9 `viewBox="0 0 640 360"`, flat strokes and fills, palette only, no scripts/external links/text digits, must not show or hint the killer. Set `media.cover = "cover.svg"` in `case.json`. Draw each photo/map item the same way (step 5): that is the evidence art.
8. **Validate to 0 errors, 0 warnings**: `python3 -I scripts/validate_case.py <dir>` and `... --lexicon <dir>/lexicon.json`.
9. **Read it through**: `python3 -I scripts/solve_path.py <dir>`. Check each deduction really follows from its cited items, and the herring rule-outs hold. Fix the case, re-validate.
10. **Install** (inside the killer-killer repo): slug `<victim-kebab>-<setting>-<n>s`; folder `src/mysteries/<slug>/` with the four files; register in `src/mysteries/index.ts` (server-only: case + solution) and `src/mysteries/catalog.ts` (lexicon + `COVERS` entry `"<slug>": "cover.svg"`). Run `npm test`.
11. **Media** (after step 10, case validated + installed): run the Media phase below. Optional: skip only if user says no video/voice.
12. **Deliver**: give the folder path, setting, difficulty, answer in one line, and any assumption made.

## Media phase (video + voice)
Full detail: `references/media.md`. Tools: HyperFrames plugin (`hyperframes@claude-plugins-official`; skills `/hyperframes`, `/hyperframes-cli`, `/media-use`) renders HTML to MP4; VoiceStudio MCP (`voicestudio`, `.mcp.json`) makes voices. Output in `public/cases/<slug>/` (reveal file named `reveal-<12 random hex>.mp4`, never `reveal.mp4`: public folder is guessable); schema in `references/schema.md` (`media`, item kind `video`).

**When:** only after steps 8-10 pass (validator 0/0, installed). The reveal script reads `solution.json`; never run earlier, never edit case text after for the sake of media.

Ordered steps:
1. **Voices.** VoiceStudio up? (`list_voices` answers.) Yes: narrator = one fixed voice via `design_voice`, plus one `design_voice` per suspect from their `suspects[]` card (prompts per archetype in `references/media.md`). No: fallback `npx hyperframes tts "<text>" -o <file>.wav` (local Kokoro; `--list` shows voices; one narrator, suspects differ by Kokoro voice id). Record chosen voices in `public/cases/<slug>/voices.json`.
2. **Evidence clips (0..n).** Pick clips that already exist as case text (a voicemail, CCTV log, radio call). Script = the item's own words; the clip adds sound, never new facts. Each item becomes `kind: "video"` in a `case.json` folder. Captions burned in AND a `.vtt` file. Re-validate.
3. **Teaser.** Silent, looping, 6-10s, mood only: setting, victim name, title card. No suspect named as guilty, no solution facts.
4. **Reveal.** File `reveal-<12 hex>.mp4` + `.vtt`, path only in `solution.json`. Narrated reconstruction from `solution.json` (`story`, `deductions`), killer named only here. Build last.
5. **Per clip:** `npx hyperframes lint`, then `npx hyperframes check`; fix; then render (see media.md for commands). Do not render until check passes.
6. **Budgets:** teaser <= 1 MB, reveal <= 10 MB, evidence clip <= 3 MB (validator enforces).
7. **Wire:** set `case.media.teaser` / video items, `solution.json` `reveal` (`reveal-<12 hex>.mp4`, random name, secret; `.vtt` beside it), register teaser in `TEASERS` (`src/mysteries/catalog.ts`), re-run `validate_case.py` (0 errors, 0 warnings), `npm test`.

Checklist: [ ] VoiceStudio or fallback voices recorded  [ ] clips contain only facts already in item text  [ ] no killer name in any evidence audio, caption, vtt, or poster  [ ] palette-only, square borders, no gradients  [ ] captions burned in + `.vtt`  [ ] sizes within budget  [ ] teaser silent + loops  [ ] reveal names killer only in reveal (never in case.json)  [ ] validator 0/0

## Rules
- **Fiction only.** Invented people; never model the cast or victim on a real named person (change a name that matches a real crime victim).
- **Rating ceiling** on every string: `PG-13` = suspense, mild violence, no gore or graphic detail; `mature` = grim adult themes, never gratuitous, no gore, no explicit sexual content.
- Names read aloud: make them sound different from each other.

## Files
- `scripts/validate_case.py`: case and lexicon (`--lexicon`) validator.
- `scripts/solve_path.py`: read-through of the intended solve.
- `scripts/test_validate.py`: mutation tests for the validator (`python3 -I`).
- `references/{schema,lexicon,media}.md`; `assets/example/` is a small valid easy case; `assets/catalogue.json` is an empty list (no setting catalogue now).
