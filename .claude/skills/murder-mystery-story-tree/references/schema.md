# Case file contract (`mm-case-file/1`)

A case is a folder `src/mysteries/<slug>/` with `case.json` (public, every device sees it), `solution.json` (secret, server-only), `lexicon.json` (`references/lexicon.md`) and `public/cases/<slug>/cover.svg` (optional drawn cover). Validate with `python3 -I scripts/validate_case.py <dir>`.

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
  | { kind: "map"; svg: string; caption: string }
  | { kind: "video"; src: string; poster?: string; captions: string })  // optional, see references/media.md
// optional top-level: media?: { teaser?: string; cover?: string }  (cover = .svg, palette-only, <= 200 KB, validated like photo svg)   (reveal video is NOT here: it lives in solution.json `reveal`)
// all media paths relative to /cases/<slug>/ (files in public/cases/<slug>/); captions = .vtt
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
| `svg_colour` | SVG hex colours only `#E5484D #00FFB3 #E5E5E5 #3B8EEA #D97757 #0B1215` |
| `difficulty_size` | easy 3-4 suspects, 10-16 items; medium 4-5, 16-24; hard 5-7, 24-34 |
| `option_count` | 4-6 motives and methods, ids in order, answer id present, no duplicate text |
| `unknown_item` | deductions and herrings cite only existing item ids |
| `media_path` | media path fullmatch `[a-z0-9][a-z0-9._-]*(/[a-z0-9._-]+)*`, no `.`/`..` segment, resolves inside `public/cases/<slug>/`, right extension (`.mp4`, captions `.vtt`, poster png/jpg/webp) |
| `media_missing` | referenced file exists in `public/cases/<slug>/` |
| `media_size` | cover <= 200 KB, teaser <= 1 MB, reveal <= 10 MB, evidence clip <= 3 MB |
| `media` | `case.media` only has `teaser`, `cover` |
| `media_path` (reveal) | `solution.reveal` (optional) = `reveal-<12 hex>.mp4`, plus same-name `.vtt`, both in `public/cases/<slug>/`, reveal <= 10 MB; `.vtt` not killer-scanned (reveal may name the killer) |
| `names_killer` (extended) | also scans each video item's `.vtt` |
| info | no media at all (allowed) |
| warnings | no photo item; sentence over 30 words |
