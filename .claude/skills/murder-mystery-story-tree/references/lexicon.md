# Lexicon contract (`mm-lexicon/1`)

`lexicon.json` sits beside `case.json` and gives the app the story's own words, so a lighthouse case says "the rock" where a manor says "the house". Validate: `python3 -I scripts/validate_case.py --lexicon lexicon.json`.

| Key | Type | Purpose |
|---|---|---|
| `card` | string | One-line hook on the case card on the start screen. |
| `desk` | string | Name of the room's shared desk (the case-file screen heading). |
| `accuse` | string | Heading over the accusation form (who, why, how). |
| `wrong` | string | Ending line when the accusation is wrong. |
| `solved` | string | Ending line when who, why and how are all right. |
| `defeated` | string | Ending line when the room gives up or time runs out. |
| `loaders` | string[] | Three to six lines cycled during waits. |
| `full` | string | Join error: no seat left. |
| `no_room` | string | Join error: no room with that code. |
| `gone` | string | Error: the case file was removed. |

Rules:
- Every key required, no extra keys (plus `"schema": "mm-lexicon/1"`), no empty strings, at most 60 characters each.
- No digits anywhere; counts in words.
- Words theme the setting; buttons keep plain verb + object labels (not in the lexicon).
- Tone matches the rating and stays ominous: short, flat, no jokes, no exclamation marks, no emoji.

Example: `assets/example/lexicon.json`.
