# Case file contract (`mm-case-file/1`)

A case is a folder `src/mysteries/<slug>/` with `case.json` (public, every device sees it), `solution.json` (secret, server-only), `lexicon.json` (`references/lexicon.md`) and `art.ts`. Validate with `python3 -I scripts/validate_case.py <dir>`.

## case.json
```ts
{ schema: "mm-case-file/1"; slug: string; title: string; difficulty: "easy"|"medium"|"hard";
  rating: "PG-13"|"mature"; setting: string; tone: string;
  victim: { name: string; summary: string }; brief: string;
  suspects: { name: string; role: string; relation: string; alibi: string; note: string }[]; // index = id
  folders: { id: string; kind: "suspects"|"statements"|"reports"|"evidence"|"documents"|"timeline"|"map"|"extras";
             title: string; items: Item[] }[];
  motives: { id: string; text: string }[];   // 4-6, shuffled, ids m1..m6
  methods: { id: string; text: string }[] }  // 4-6, ids h1..h6
Item = { id: string; title: string } & (
  | { kind: "note"; body: string }
  | { kind: "statement"; speaker: string; lines: { q: string; a: string }[] }
  | { kind: "report"; sections: { heading: string; body: string }[] }
  | { kind: "photo"; svg: string; caption: string }
  | { kind: "log"; rows: { at: string; text: string }[] }
  | { kind: "map"; svg: string; caption: string })
```
Item ids are unique across the whole case. Suspect cards come from `suspects`; the `suspects` folder may add extra items. Everything the room reads is in `case.json`; nothing in it may name the answer.

## solution.json
```ts
{ schema: "mm-case-solution/1"; killers: number[]; // suspect indexes; [] = suicide/accident
  motive: string; method: string;                  // option ids
  story: string[];                                 // the truth, shown after the accusation
  deductions: { claim: string; part: "who"|"why"|"how"; items: string[] }[];
  herrings: { suspect: number; ruled_out_by: string[] }[] }
```
The host accuses who (a suspect, or nobody) + why (motive) + how (method).

## Validator rules
| Code | Rule |
|---|---|
| `deduction_thin` | each of who / why / how is backed by at least two distinct items across `deductions` |
| `names_killer` | no item text says "<killer> killed" or "<killer> is the killer" |
| `herring_unruled` | every non-killer suspect has a `herrings` entry with rule-out items (suicide: every suspect) |
| `svg_unsafe` | SVG has no `<script`, `on...=`, `foreignObject`, or external `href` |
| `svg_colour` | SVG hex colours only `#CD3131 #00FFB3 #E5E5E5 #2472C8 #D97757 #0B1215` |
| `difficulty_size` | easy 3-4 suspects, 10-16 items; medium 4-5, 16-24; hard 5-7, 24-34 |
| `option_count` | 4-6 motives and methods, ids in order, answer id present, no duplicate text |
| `unknown_item` | deductions and herrings cite only existing item ids |
| warnings | no photo item; sentence over 30 words |
