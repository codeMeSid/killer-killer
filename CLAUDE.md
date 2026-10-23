# killer-killer — codebase patterns

Rules mandatory. Override general defaults. Add new rules here, never in scattered comments.

## 1. Color palette (strict)

Only these five text colors allowed anywhere in UI. No other color, no Tailwind default color names, no hex outside list.

| Token | Hex | Tailwind class | Use for |
|---|---|---|---|
| red | `#E5484D` | `text-red` / `bg-red` / `border-red` | errors, failed state, destructive |
| green | `#00FFB3` | `text-green` / `bg-green` / `border-green` | success, connected, confirm |
| white | `#E5E5E5` | `text-white` / `border-white` | primary text, headings |
| blue | `#3B8EEA` | `text-blue` / `bg-blue` / `border-blue` | secondary/meta text, borders, links, pending |
| orange | `#D97757` | `text-orange` / `bg-orange` / `border-orange` | warnings, degraded state, highlights/accents |

- Tokens in `src/app/globals.css` under `:root` and `@theme inline`. Change there, never inline.
- **Background always obsidian black** (`--obsidian: #0B1215`): every page, panel, card, input, modal. No surface tints, no elevated greys, no `bg-white`, no gradients. Surfaces separated by `border-blue/30..40`, never different background.
  - Use `bg-background` (or unset, inherit from `body`). Both = obsidian.
  - Only non-palette value in app; not a text color.
- Banned: `text-gray-*`, `text-neutral-*`, `emerald`, `slate`, arbitrary `text-[#...]`, `dark:` variants (app single-theme dark).
- Opacity modifiers on palette token (`border-blue/40`) allowed — same hue.
- **Site frame:** `<body>` in `src/app/layout.tsx` carries `border border-orange` — one orange box around every page. Set there only; inner surfaces still `border-blue/30..40`.

- **Glow and RGB split allowed, palette hues only** (user decision 2026-10-15, retro CRT look): phosphor `text-shadow` in text's own colour (`.font-pixel` gets it automatically), red/blue split in `glitch` hit, obsidian scanlines/vignette, white snow. No other hue via effect.
- **Fonts** (all via `next/font/google` in `src/app/layout.tsx`):
  - Body: IBM Plex Mono 600 (default on `body`) / 700. `font-sans`/`font-mono` resolve to it. Anything read closely stays Plex: phone options, clues, character card, premise, epilogue.
  - Display: `font-pixel`, one pixel face per machine (§14): Pixelify Sans (TV), VT323 (phone terminal), Silkscreen (home computer). `font-arcade` = Press Start 2P for labels ≤3 words (menu items, wordmark). Pixel faces get `font-synthesis: none` (no faux bold; VT323/Press Start ship one weight) and `font-size-adjust` so machines swap without reflow.
  - ASCII art uses `font-art` (Geist Mono): Plex Mono lacks box-drawing glyphs → KILLER art misaligns.

## 2. Stack

Next.js (App Router) + TypeScript + Tailwind v4. Supabase for data, auth, realtime (Supabase project `killer-killer`, ref `clymvaueusidcxaqezjz`, ap-south-1). Realtime = Supabase Realtime only (Ably removed 2026-10-15). One project holds frontend + backend — no separate API service.

## 3. Backend responses

Every route handler returns envelope from `src/lib/api.ts`:

```ts
{ success: boolean; errorMessage: string; errorCode: number; payload: T | null }
```

Use `ok(payload)` / `fail(message, code)`. No exceptions.

## 4. Secrets

- `SUPABASE_SECRET_KEY`, `SUPABASE_DB_PASSWORD` server-only. Never prefix `NEXT_PUBLIC_`, never import `src/lib/supabase/admin.ts` from Client Component.
- Browser joins Realtime with own anonymous-session JWT; private `room:<CODE>` channels authorized by RLS on `realtime.messages` (members only, presence only, never broadcast).
- `.env.local` gitignored; keep `.env.example` in sync when adding variable.

## 5. Supabase clients

- Client Component → `createClient()` from `src/lib/supabase/client.ts`.
- Server Component / route handler → `await createClient()` from `src/lib/supabase/server.ts` (session / auth only).
- Game tables (`rooms`, `players`, `picks`, `votes`) → `adminClient()` from `src/lib/supabase/admin.ts` (secret key, `server-only`). Why: engine writes other players' rows (sabotage, deaths), per-user RLS can't express. Those tables have RLS **on with no policies**, no grants to `anon`/`authenticated`; route handlers authorize by user id before every query.
- Identity = Supabase **anonymous auth**: `ensureUserId()` (`src/lib/auth.ts`) signs in on first join/create; cookie keeps refreshed phone in its seat.
- Enable RLS on every table in `public`. Never read authorization data from `user_metadata`.
- Schema changes = new file in `supabase/migrations/` only. Never delete or edit an applied migration (drop tables in a new one): `db push` refuses when remote history has versions missing locally.

## 6. Responsive

Mobile-first. Every screen holds at 375px, 768px, 1280px. No horizontal scroll. Verify new UI at all three widths before done.

## 7. Before done

`npm run typecheck && npm run lint && npm run build` must pass. Show output.

## 8. Keep this file current (mandatory)

Decision made or correction given → update this file **same turn**, before reporting done. No asking — just do it.

Triggers:
- User corrects something ("use X not Y", "always/never do Z", "change this to …").
- User states preference, constraint, convention.
- Non-obvious technical choice made (library, pattern, workaround for framework rule).
- Rule here wrong or outdated.

How to apply:
1. Existing section covers it → **edit that section** — no duplicate rule elsewhere.
2. Else add new numbered section.
3. Append one line to Decision log in `docs/DECISIONS.md`: `YYYY-MM-DD — what changed — why`.
4. Change affects code → make code match same turn. Rules and code never drift.

Record *why*, not just *what*. Rule without reason gets reverted by next person finding it inconvenient.

## 8a. Branches

**Work on `main` only** (user 2026-10-23). No feature branches; `feat/case-file` merged into main. Commit on main when asked; push only on ask. Why: solo project, one line of history.

## 9. Compact at 50% context

Context usage hits **50%** → compact before continuing. Don't wait for 95% auto-compact — forced compact at ceiling drops detail mid-task.

- At 50%: finish current tool call, run `/compact` (or ask if turn can't be interrupted). Say compacting and why.
- Carry forward: files modified this session, failing tests with exact error text, DB migration state, architecture decisions + *why*, current task.
- Anything already in this file or `MEMORY.md` survives compaction — point of §8 and §11. Write *before* compacting, not after.

## 10. Motion — layered, ominous base

Three layers (user decision 2026-10-15: "all of the above"), one guardrail: **text being read never moves**.

1. **Ambient, slow:** scanlines, tube hum (`animate-hum`), rolling band on TV glass (`animate-scan-roll`), rising ground. Faint enough narration stays legible.
2. **Entrances, ominous:** `ease-ominous` (`cubic-bezier(0.7, 0, 0.3, 1)`, default for every `transition-*`), 700ms default, entrances out of dark (`animate-rise`, `animate-print` for terminal lines, `animate-power-on` + snow `animate-static-burst` on every TV screen).
3. **Hits, sharp (≤300ms):** `animate-glitch` (red/blue split, sliced) only on events: death, exposed sabotage, reveal, all aboard, errors. `animate-flicker-in` for joins and lock-in. Loud moments = game start and ending.
- Every animation gated `motion-safe:`; reduced motion keeps content, drops travel.
- Flashing: never >3 flashes/sec over large area (WCAG 2.3.1); boot raster stays inside one thin bar.
- Tokens + keyframes in `src/app/globals.css` (`@theme`).

## 11. MEMORY.md — decision log + project memory

`MEMORY.md` (repo root) holds two things this file doesn't:

- **Decision log** (`docs/DECISIONS.md`, not imported) — every decision/correction, one dated line, append-only. Supersede old entries with new line; don't rewrite history.
- **Memory** — live project state: what exists, what's open, known gotchas, env status. Edit in place to reflect *now*; delete lines no longer true.

Rules here; history and state there. Update same turn as change (§8). Imported below → loads every session.

## 12. Game architecture (co-op case file, user decision 2026-10-22)

- **Server-authoritative.** Whole case file open at once, same on every device; friends (up to 8 agents) read together, host accuses. Logic in `src/lib/rooms.ts` + `src/lib/case/{judge,score}.ts`, runs only in route handlers. Clients never judge.
- **Case = repo folder** `src/mysteries/<slug>/`, written by `murder-mystery-story-tree` skill: `case.json` (`mm-case-file/1`, public), `solution.json` (`mm-case-solution/1`, secret), `lexicon.json`, optional `public/cases/<slug>/cover.svg`; `validate_case.py` = 0 errors **and 0 warnings**. Solutions only in `src/mysteries/index.ts` (`server-only`); words/covers/card in `catalog.ts` (`LEXICON`, `COVERS`). New case registered in **both**. Item text never names the killer.
- **Realtime = doorbell, not pipe.** After each mutation server sends payload-free `state` broadcast on private channel `room:<CODE>`; clients refetch `GET /api/rooms/[code]`. Presence key = agent, payload `{agent, itemId}` shows who reads what (`useRoom().reading`). Why: nothing secret can leak over a channel carrying nothing; reconnect = refetch.
- **Sender refetches itself:** after its own pin or accusation the device calls `useRoom().refresh()` (`onChanged`); the doorbell is for the *other* devices. Why: in the 2026-10-23 playthrough the guest got the verdict over Realtime but the host stayed on the desk; the host never waited on its own broadcast again.
- **Pins** = shared evidence strip, `POST /pins` toggles; only folder items pinnable (`togglePin` rejects others).
- **Guess race:** two guesses per room. Claim by `update rooms set guesses_used = n where status='playing' and guesses_used = n-1`; one request wins, other 409. Host-only (403 otherwise). Claim, guess row, end and result run in one transaction: SQL fn `submit_guess` (migration `20261023000000_guess_tx`, service_role only) called via `adminClient().rpc`. Why: separate writes could leave a room half-finished.
- **Art = p5.brush paintings, made by Opus, always** (user 2026-10-23): case covers, suspect portraits, evidence scenes/maps, desk/home backdrops are painted with p5.brush (`p5.brush/standalone`) by a script Opus writes, rendered once to a static image committed under `public/cases/<slug>/` (never generated at runtime), shown via `<img>` so scripts can't run. Palette hues only as pigment (`#E5484D #00FFB3 #E5E5E5 #3B8EEA #D97757` on `#0B1215`); brush blending between them is fine. Evidence art never names the killer.
- Leaderboard: single global board across all cases, `results` table, `GET /api/leaderboard` → `{board}` (top fifty, score desc then seconds asc). Rows before `BOARD_SINCE` (`rooms.ts`) are test runs: kept, hidden from board and ranks (user 2026-10-23).
- Supabase config repo-tracked in `supabase/config.toml` (anonymous sign-ins on, 300/hour/IP). Change there + `npx supabase config push`; never click-edit dashboard. Review diff before confirming.
- Engine-era rules (rounds, phases, personal options, votes, narrator) are gone.
- `/dev/screens?s=desk|desk-item|accuse|wrong|solved|defeated` renders desk screens from in-code demo case (`src/components/dev/demo-case.ts`), no DB; 404 in production.

## 13. Game UI language

- **Type steps** (globals.css): `text-display`, `text-statement`, `text-ui`, `text-body`, `text-meta`. No other sizes in game screens.
- **Layout:** header = team · clock · agents online · agent seat · sound. Join code lives only in the rail: everyone sees the code, host also the QR, at the top, always open, never in the header or a `<details>` (user 2026-10-23: code showed twice, collapsible hid it). ≥768px folders left, item window right, pinned strip; 375px folder list → full-screen item with back. Brief opens first.
- **Information in white** (`text-body`+); blue `text-meta` decoration only. Why: blue now 5.6:1 (lifted 2026-10-23 from 3.9:1 to pass AA); keep info in white anyway, blue = decoration.
- **Disabled actions keep full-contrast label saying why**; only fill goes inactive. Never fade primary button with opacity. Accuse submit label says what is missing.
- Wrong guess → `animate-glitch` + lexicon `wrong`, "One guess left". Ended → reveal (solved green / defeated red).
- Counts in words, never digits in prose.
- **Pixel-art frames:** `pixel-border` + `pb-*` ink, square, never rounded. Swiss underneath: 12-column grid, flush left, thin blue rules.
- **Accuse = interrogation board** (user 2026-10-23): WHO = suspect cards (portrait tile or monogram, red `SUSPECT` stamp), WHY/HOW = numbered `SLIP n` radio strips, recap = sticky accusation slip, submit opens a confirm step then `sfx.stamp()` + `animate-glitch`. Portraits: `public/cases/<slug>/suspects/<name-slug>.svg` (model-drawn, palette-only, same face on all, never hints the killer), `PORTRAITS[slug][String(index)]` in `catalog.ts`, keyed by suspect index (suspects have no id). New case ships portraits. Why: three plain columns read mundane.
- **Per-story lexicon** themes statements, statuses, loaders; buttons keep plain verb + object labels.
- Forms and routes kept alive in `<Activity>` reset via effect cleanup (join form, case picker).

## 14. Retro machines, art, sound

Style (user, 2026-10-15): horror + pixel-art + maximalism + Swiss + flat 2D, as old machines. UX first.
- **Machine by role** — wrap every screen in `<Machine kind>`: `computer` = `/` (boot sequence once per session), `/start`, `/case/[code]`, `/leaderboard`, `RoomLoading`; `terminal` = `/join`. Machine sets `font-pixel` face + CSS-only glass.
- **Home painting** — `<BrushScene>` paints the home lighthouse with p5.brush (`p5.brush/standalone`, no p5; dynamic import, once per size, never animated; palette hues only; untyped via `src/types/p5-brush.d.ts`). Same painter extends to desk/start/reveal backdrops (user 2026-10-23: use p5.brush everywhere there is art).
- **Case art (user 2026-10-23)** — every case ships `cover.svg|png` + suspect portraits + evidence scenes, all p5.brush-painted (see §12). `<Cover>` on picker card + reveal.
- **Always Opus (user 2026-10-23, permanent)**: mystery story, its media (teaser, clips, voices, reveal) and its art are generated by Opus only. Any agent/skill doing that work runs `model: opus`; never Sonnet/Haiku. Same for the promo trailer.
- **Sound** — `src/lib/sfx.ts`, WebAudio-synthesized, on by default, `kk:sound`, `<SoundToggle>`. Audio unlocks on first gesture. Hook sounds to events, never idle loops. Narrator voice removed.

@MEMORY.md
## 15. Start flow, media (user decision 2026-10-23)

- **Start = case first, team second, one page.** Pick a card; it locks small top-right with its title ("Change case" until the room exists), team-name panel beside it. "Open case" creates the room and goes straight to the desk; join code + QR live in the desk rail only (user 2026-10-23: the separate QR step before the desk felt meaningless). Why: team name before knowing the case was backwards; friends can scan before host enters.
- **One leaderboard**, all cases, no per-case filter (§12).
- **Media per case** (skill "Media phase"): files in `public/cases/<slug>/` (teaser.mp4 <=1MB silent loop for the picker card, reveal-<12 hex>.mp4 <=10MB + .vtt named in `solution.json` `reveal`, sent only in ended `ending` payload, never in public case.json; obscurity not auth, upgrade = ending-gated streaming route, evidence clips = `video` items, captions .vtt burned into the video too, so `<track>` is not `default` or they show twice, user 2026-10-23). Optional: no media = Cover (or nothing). Rendered with the HyperFrames plugin (project-scope); voices from VoiceStudio (MCP `voicestudio` in `.mcp.json`, needs the app open), HyperFrames TTS as fallback. Evidence media never names the killer (same fairness rule as text). Earshot skipped (dev tool, not game audio).
