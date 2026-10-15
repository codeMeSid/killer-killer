# Story art

Every story ships one Hairline figure: an isometric line drawing that answers the pointer. The app shows it on the
case card and idles its tour as a screensaver on the TV lobby, the loaders and the end screen.

## Make it with `hairline-create`

Invoke the `hairline-create` skill (files in `~/.agents/skills/hairline-create/`). Read its `SKILL.md`, `rules.md`,
`concepts.md` and `look.md`, the kernel index at the top of `kernel.js`, and the example nearer the concept
(`examples/terrain.js` for a continuous field, `examples/riffle.js` for discrete items). Its ten rules all apply.
Never edit `kernel.js` or `bench.html`.

## On top of hairline's rules

- **Ominous.** The object is the instrument of the death or the setting's dread: the sabotaged rig, the gear
  lockers, the lifeboat davit, the airlock.
- **Rest already feels wrong.** A cut line, an empty locker, a door ajar, a slack cord over an edge. The still frame
  is what most players see.
- **One idea**, and it reads at 240px.
- **The tour tells the story.** Three to six stops ending in `null`. The lap plays with no hand on the screen, so it
  should end on the reveal (the cut, the empty one).
- **Never set colours.** The app maps hairline's tiers onto its palette: `hi` → orange accent, edge → white,
  mid → blue, `lo` → dim blue, all on obsidian. Strokes and classes only, as hairline already requires.
- **No words or digits in the drawing.** The read-out uses words ("first locker", "line cut"), never digits.

## Workflow

1. Offer two or three concepts, one line each:
   `**Name.** object. what the pointer does. read-out. where the tour stops.`
2. Wait for the user's pick. Do not build before it.
3. Write `<name>.js` in a scratch directory, in the shape of the examples.
4. From that directory: `node ~/.agents/skills/hairline-create/look.mjs <name>.js --answer x,y,z --edge x,y,z`.
   Fix and re-run until it exits 0, then read the sheet (and the motion sheet) and answer `look.md`'s checklist.
   At most 200 lines.
5. Wrap it into the story folder:
   `python scripts/art.py wrap <name>.js <repo>/src/mysteries/<slug>/art.ts --slug <slug>`.

To change it later: `python scripts/art.py unwrap art.ts <name>.js`, edit, run `look.mjs`, wrap again. The round
trip is byte-for-byte, so `art.ts` stays the figure file verbatim inside `export default function define(HL, hairline)`.
