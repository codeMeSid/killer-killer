# killer-killer — codebase patterns

Rules below are mandatory. They override general defaults. Add new rules here, never in scattered comments.

## 1. Color palette (strict)

Only these five text colors are allowed anywhere in the UI. No other color, no Tailwind default color names, no hex outside this list.

| Token | Hex | Tailwind class | Use for |
|---|---|---|---|
| red | `#CD3131` | `text-red` / `bg-red` / `border-red` | errors, failed state, destructive |
| green | `#00FFB3` | `text-green` / `bg-green` / `border-green` | success, connected, confirm |
| white | `#E5E5E5` | `text-white` / `border-white` | primary text, headings |
| blue | `#2472C8` | `text-blue` / `bg-blue` / `border-blue` | secondary/meta text, borders, links, pending |
| orange | `#D97757` | `text-orange` / `bg-orange` / `border-orange` | warnings, degraded state, highlights/accents |

- Tokens live in `src/app/globals.css` under `:root` and `@theme inline`. Change them there, never inline.
- **Background is always obsidian black** (`--obsidian: #0B1215`), on every page, panel, card, input, and modal. No surface tints, no elevated greys, no `bg-white`, no gradients. Surfaces are separated by `border-blue/30..40`, never by a different background.
  - Use `bg-background` (or leave it unset and inherit from `body`). Both resolve to obsidian.
  - This is the only non-palette value in the app and it is not a text color.
- Banned: `text-gray-*`, `text-neutral-*`, `emerald`, `slate`, arbitrary `text-[#...]`, and `dark:` variants (the app is single-theme dark).
- Opacity modifiers on a palette token (`border-blue/40`) are allowed — it is still the same hue.
- **Site frame:** `<body>` in `src/app/layout.tsx` carries `border border-orange` — one orange box around every page. Set it there only; inner surfaces still use `border-blue/30..40`.

- **Glow and RGB split are allowed, in palette hues only** (user decision 2026-10-15, retro CRT look): phosphor `text-shadow` in the text's own colour (`.font-pixel` gets it automatically), red/blue split in the `glitch` hit, obsidian scanlines/vignette, white snow. No other hue enters through an effect.
- **Fonts** (all via `next/font/google` in `src/app/layout.tsx`):
  - Body: IBM Plex Mono 600 (default on `body`) / 700. `font-sans`/`font-mono` resolve to it. Anything read closely stays in Plex: phone options, clues, character card, premise, epilogue.
  - Display: `font-pixel`, one pixel face per machine (§14): Pixelify Sans (TV), VT323 (phone terminal), Silkscreen (home computer). `font-arcade` = Press Start 2P for labels of three words or fewer (menu items, wordmark). Pixel faces get `font-synthesis: none` (no faux bold; VT323/Press Start ship one weight) and `font-size-adjust` so machines swap without reflow.
  - ASCII art uses `font-art` (Geist Mono): Plex Mono lacks box-drawing glyphs, so the KILLER art would misalign.

## 2. Stack

Next.js (App Router) + TypeScript + Tailwind v4. Supabase for data, auth and realtime (Supabase project `killer-killer`, ref `clymvaueusidcxaqezjz`, ap-south-1).  Realtime is Supabase Realtime only (Ably removed 2026-10-15). One project holds both frontend and backend — no separate API service.

## 3. Backend responses

Every route handler returns the envelope from `src/lib/api.ts`:

```ts
{ success: boolean; errorMessage: string; errorCode: number; payload: T | null }
```

Use `ok(payload)` / `fail(message, code)`. No exceptions.

## 4. Secrets

- `SUPABASE_SECRET_KEY`, `SUPABASE_DB_PASSWORD` are server-only. Never prefix with `NEXT_PUBLIC_`, never import `src/lib/supabase/admin.ts` from a Client Component.
- The browser joins Realtime with its own anonymous-session JWT; private `room:<CODE>` channels are authorized by RLS on `realtime.messages` (members only, presence only, never broadcast).
- `.env.local` is gitignored; keep `.env.example` in sync when adding a variable.

## 5. Supabase clients

- Client Component → `createClient()` from `src/lib/supabase/client.ts`.
- Server Component / route handler → `await createClient()` from `src/lib/supabase/server.ts` (session / auth only).
- Game tables (`rooms`, `players`, `picks`) → `adminClient()` from `src/lib/supabase/admin.ts` (secret key, `server-only`). Why: the engine writes other players' rows (sabotage, deaths), which per-user RLS can't express. Those tables have RLS **on with no policies** and no grants to `anon`/`authenticated`; route handlers authorize by user id before every query.
- Identity is Supabase **anonymous auth**: `ensureUserId()` (`src/lib/auth.ts`) signs in on first join/create; the cookie keeps a refreshed phone in its seat.
- Enable RLS on every table in `public`. Never read authorization data from `user_metadata`.
- Schema changes = new file in `supabase/migrations/` only.

## 6. Responsive

Mobile-first. Every screen must hold at 375px, 768px, and 1280px. No horizontal scroll. Verify new UI at all three widths before calling it done.

## 7. Before done

`npm run typecheck && npm run lint && npm run build` must pass. Show the output.

## 8. Keep this file current (mandatory)

Whenever a decision is made or a correction is given, update this file **in the same turn**, before reporting the work as done. No asking first — just do it.

Triggers:
- The user corrects something ("use X not Y", "always/never do Z", "change this to …").
- The user states a preference, constraint, or convention.
- A non-obvious technical choice gets made (a library, a pattern, a workaround for a framework rule).
- A rule here turns out to be wrong or outdated.

How to apply:
1. If an existing section covers it, **edit that section** — do not append a duplicate rule elsewhere.
2. Otherwise add a new numbered section.
3. Append one line to the Decision log in `MEMORY.md`: `YYYY-MM-DD — what changed — why`.
4. If the change affects code, make the code match in the same turn. Rules and code never drift apart.

Record the *why*, not just the *what*. A rule without its reason gets reverted by the next person who finds it inconvenient.

## 9. Compact at 50% context

When context usage reaches **50%**, compact before continuing. Do not wait for the 95% auto-compact — a forced compact at the ceiling drops detail mid-task.

- At 50%: finish the current tool call, then run `/compact` (or ask for it if the turn can't be interrupted). Say that you're compacting and why.
- Carry forward: files modified this session, failing tests with exact error text, DB migration state, architecture decisions and their *why*, the current task.
- Anything already written to this file or `MEMORY.md` survives compaction — that's the point of §8 and §11. Write it down *before* compacting, not after.

## 10. Motion — layered, ominous base

Three layers (user decision 2026-10-15: "all of the above"), one guardrail: **text being read never moves**.

1. **Ambient, slow:** scanlines, tube hum (`animate-hum`), a rolling band on TV glass (`animate-scan-roll`), the rising ground, Hairline figures idling on their tour. Faint enough that narration stays legible.
2. **Entrances, ominous:** `ease-ominous` (`cubic-bezier(0.7, 0, 0.3, 1)`, default for every `transition-*`), 700ms default, entrances out of the dark (`animate-rise`, `animate-print` for terminal lines, `animate-power-on` + snow `animate-static-burst` on every TV screen).
3. **Hits, sharp (≤300ms):** `animate-glitch` (red/blue split, sliced) only on events: death, exposed sabotage, the reveal, all aboard, errors. `animate-flicker-in` for joins and lock-in. Loud moments = game start and the ending.
- Every animation is gated `motion-safe:`; reduced motion keeps the content and drops the travel (the Hairline kernel skips its tour by itself).
- Flashing: never more than three flashes a second over a large area (WCAG 2.3.1); the boot raster stays inside one thin bar.
- Tokens + keyframes live in `src/app/globals.css` (`@theme`).

## 11. MEMORY.md — decision log + project memory

`MEMORY.md` (repo root) holds two things this file does not:

- **Decision log** — every decision/correction, one dated line, append-only. Supersede old entries with a new line; don't rewrite history.
- **Memory** — live project state: what exists, what's open, known gotchas, env status. Edit in place so it reflects *now*; delete lines that stop being true.

Rules stay here; history and state go there. Update it in the same turn as the change (§8). It is imported below so it loads every session.

## 12. Game architecture

- **Server-authoritative.** All game logic lives in `src/lib/engine/` (pure TS port of the story-tree skill's `references/engine-rules.md`) and runs only in route handlers via `src/lib/rooms.ts`. Clients never compute outcomes.
- **Realtime is a doorbell, not a pipe.** After each mutation the server sends a payload-free `state` broadcast (`httpSend`, secret key) on the private channel `room:<CODE>`; clients refetch `GET /api/rooms/[code]`. Clients may only listen and track presence (`supabase/migrations/*_realtime_rooms.sql`). Why: secrets can't leak over a channel that carries nothing, and reconnect = refetch.
- **Views are the only data that leaves the server** (`src/lib/engine/view.ts`). Never send `killer_id`, `killer_method`, `points_to`, clue/item/scene/option ids, clue kinds or the track; phones submit picks by slot `A–D`. The fuzz test in `engine.test.ts` enforces this — keep it passing.
- **Race-safety by conditional update:** state transitions are `update … where phase = <expected>`; only one request wins a resolve.
- **Mysteries are repo folders** `src/mysteries/<slug>/` written by the `murder-mystery-story-tree` skill: `tree.json` (`validate_tree.py` = 0 errors), `lexicon.json` (`validate_tree.py --lexicon`) and `art.ts` (its Hairline figure, wrapped by the skill's `scripts/art.py`). Option text must complete "You will …".
  - Trees are secret → `src/mysteries/index.ts` (`server-only`). Words and art are public → `src/mysteries/catalog.ts` (`LEXICON`, code-split `ART`, `fill()`). A new story is registered in **both**. Views already carry `mystery.slug`; screens look words and art up by it.
  - **The lexicon themes statements, statuses and loaders** (ship → decks and tides, space → hatches and oxygen); buttons keep plain verb + object labels. No setting words hard-coded in components or `rooms.ts`. Contract: the skill's `references/lexicon.md`, type in `src/mysteries/types.ts`.
- Engine files use relative `.ts` imports so `npm test` (`node --test`) runs them natively.
- `/dev/screens?s=<scene>` renders every game screen from engine-built views without DB/Realtime; 404 in production.
- Supabase config is repo-tracked in `supabase/config.toml` (anonymous sign-ins on, 300/hour/IP — friends share one Wi-Fi). Change it there and `npx supabase config push`; never click-edit the dashboard. Review the diff before confirming: a blind `yes |` pushes every local default.

## 13. Game UI language

Art direction from the `design-taste-frontend` skill: direction `sentence-as-layout`, seed 563288058, with `--keep palette,type` (§1 always wins over the skill).
- **One sentence at a time at poster scale** on the TV. Headlines ≤ 2 lines at every width.
- **Type steps** (globals.css): `text-display`, `text-statement`, `text-ui`, `text-body`, `text-meta`. No other sizes in game screens.
- **No round numbers anywhere** — the setting's clock (altitude) is the progress; the rising glyph ground (`ground.tsx`, glyphs from the lexicon) shows it. No option letters, no 01/02 numbering, no eyebrow labels.
- **Ink by phase** on the `PhaseBar`: narrating white, choosing orange, ended/recap red, solved green. Nothing else recolours.
- **Seam ink** (`seam-ink` utility): text above the ground line in its ink, below it blue. Two flat inks with a hard edge, the one sanctioned use of a CSS gradient — never a visible gradient.
- **TV legibility:** anything read from the sofa (players, characters, status, join instructions, seat labels, buttons) is `text-body` or larger in white; blue `text-meta` is decoration only, never information. Why: blue is 3.9:1 on obsidian and the palette is fixed, so contrast has to come from size and ink choice.
- **Disabled actions keep a full-contrast label that says why** ("Pick what you will do", "Waiting for two more aboard"); only the fill goes inactive. Never fade a primary button with opacity.
- Counts in words ("Two of four locked in"), never digits in prose. Dice/rolls never appear.
- Secrets on phones sit behind a tap-to-show toggle (`Identity` in `story-screen.tsx`) that hides itself after ten seconds and when the phone is put away. Never press-and-hold: a hidden gesture, hard one-handed, invisible to screen readers (user correction 2026-10-15).
- **Pixel-art frames:** surfaces and controls use `pixel-border` + `pb-*` ink (square, corner pixel knocked out), never rounded corners. Swiss underneath: 12-column grid, flush left, blue hairline rules between sections.

## 14. Retro machines, story art, sound

Style (user, 2026-10-15): horror + pixel-art + maximalism + Swiss + flat 2D, as old machines. UX first; don't over-complicate.
- **Machine by role** — wrap every screen in `<Machine kind>` (`src/components/machine.tsx`): `tv` = host lobby, `/mystery`, host `/end`, `RoomLoading`; `terminal` = `/join`, phone lobby, `/story`, phone `/end`; `computer` = `/` (boot sequence, once per session, any key skips) and `/start`. The machine sets the `font-pixel` face and lays CSS-only glass (scanlines, vignette, snow) over the screen.
- **Story art** — `<StoryArt slug variant="card|hero|loader|end">` mounts the story's Hairline figure (`src/mysteries/<slug>/art.ts`) on the one shared kernel `src/lib/hairline/kernel.ts` (vendored verbatim; load it nowhere else — two instances duplicate the frame loop and mask ids). Everything but the case card idles on the figure's tour. Hairline tiers are mapped to the palette in `.story-art` (hi orange, edge white, mid blue, lo dim blue, plates obsidian). Art must be ominous; figures never set colours or text.
- **Loaders are the story's own lines** (`<LoaderLine lines={lexicon.play.loaders}>` + a `loader` figure). Only the very first `RoomLoading`, before the story is known, is generic ("Tuning in" over snow).
- **Sound** — `src/lib/sfx.ts`, WebAudio-synthesized (no files): `static`, `clack`, `blip`, `sting`, `thump`. On by default, toggle stored in `kk:sound`, `<SoundToggle>` on every game screen (TV also binds `S`). Audio unlocks on the first tap/key (autoplay rules). Hook sounds to events, never to idle loops.
- The vendored kernel and the generated `art.ts` files are excluded from ESLint and carry `// @ts-nocheck` (they are verbatim skill output).

@MEMORY.md
