# killer-killer — memory

Project memory and decision log. Rules live in `CLAUDE.md`; this file holds state and history. See CLAUDE.md §11.

## Memory (current state — edit in place)

- **Homepage** (`src/app/page.tsx`): orange KILLER ASCII art descends + flickers, then radio menu `Start Mystery` → `/start`, `Join Mystery` → `/join` (`src/components/mode-menu.tsx`, arrows + Enter anywhere).
- **Game flow (built, untested end-to-end — env empty):** `/start` case prints → `POST /api/rooms` → `/lobby/[code]` (role-aware: host = clause + QR + code + manifest track + Start; phone = "You're aboard.") → host `/mystery/[code]` (narrator, rising ground, manifest, voice toggle `V`, Enter advances) + phones `/story/[code]` ("You will ____." choice, push luck, sabotage target, hold-to-reveal identity, clue drawer, vibrate) → `/end/[code]` (TV: ending + killer reveal + cast; phone: You win/lose).
- **/join**: 8 boxes, `?code=` prefill (QR), live preview line via `/api/rooms/[code]/preview`, POST players then `/lobby`. Name no longer in URL.
- **Backend**: `src/lib/rooms.ts` (service), API under `src/app/api/rooms/**`, `src/lib/engine/{types,rules,engine,view}.ts`, migration `supabase/migrations/20261015000000_game.sql` (**not applied** — no Supabase project yet).
- **Mysteries**: `theo-marsh-skyfall-2p` ("Skyfall: The Birthday Jump", easy, killer Dash Pryce) and `max-harrow-skyfall-4p` ("Terminal Velocity", medium, killer Nell Okafor). Both validator 0/0.
- **Tests**: `npm test` = 10 engine cases + 500-game fuzz per fixture/mystery (leak checks). Fixtures in `src/lib/engine/fixtures/` (skeleton trees).
- **Dev gallery**: `/dev/screens?s=lobby-host|lobby-player|mystery-narrate|mystery-choose|story-narrate|story-choose|story-killer|story-locked|story-dead|end-host|end-player`.
- **Shared UI**: `KillerTitle`, `FillButton`, `PhaseBar`, `WaitingDots`, `RoomLoading`, `JoinQr` (uqr), `Ground`, `Narrator` in `src/components/`; `useRoom`/`useWakeLock`/`postJson` in `src/lib/use-room.ts`.
- **Story-tree skill** (`.claude/skills/murder-mystery-story-tree/`, project-level): generates + validates the `mm-story-tree/1` JSON (10 rounds, 4 options/player, dice/luck engine, 3 endings) the future game engine will consume. Engine contract in its `references/engine-rules.md`. Catalogue has only sample `skyfall`. Keep `killer_id`/`killer_method`/`points_to` server-side. No loader/engine in `src/` yet.
- **Unused but kept**: `src/components/service-status.tsx`, `src/components/realtime-demo.tsx`, `/api/health`, `/api/ably/token`, `src/lib/ably.ts`, `ably` dep (Ably superseded by Supabase Realtime — delete when user agrees) — removed from homepage, not deleted.
- **Site frame**: `<body>` has `border border-orange`.
- **Font**: IBM Plex Mono 600/700 default; ASCII art on `font-art` (Geist Mono).
- **Env / Supabase**: project `killer-killer` (ref `clymvaueusidcxaqezjz`, ap-south-1, org `sid`), linked via CLI. `.env.local` has URL, publishable, secret (fetched with `--reveal`), DB password. Migrations `20261015000000_game`, `20261015010000_realtime_rooms` **applied**. Anonymous sign-ins ON (300/h/IP). `ABLY_API_KEY` unused/empty.
- **E2E (2026-10-15)**: API script (2p + 4p×2 seeds) 0 failures; concurrent lock-in race resolves once; full UI game TV + 2 phones via Playwright passed incl. reload mid-round, phone offline (TV flags ~2.8s, recovers ~1.3s), killer/innocent win-lose. Scripts live in session scratchpad only.
- **Known issue**: TV `/end` page sometimes auto-scrolls to the bottom ~3s after load (dev and prod, ~50%, vanishes under instrumentation). Root cause unknown.
- **Known gap**: palette blue `#2472C8` (3.9:1) and red `#CD3131` (3.7:1) fail WCAG AA 4.5:1 for small text on obsidian — taste inspector flags every meta line. Awaiting user decision on lighter tokens.
- **Statusline**: `~/.claude/statusline.mjs`, global (outside repo); runs inside the `.kickbacks` vibe-ads wrapper via chain-capture. Live `rate_limits`/`context_window` fields unconfirmed.
- **Open**: fill `.env.local` + apply migration + E2E run; contrast decision; decide on `.kickbacks` tracker; nothing committed since initial commit.

## Decision log (append-only)

- 2026-10-10 — Next.js 16.4 (not 14) — `create-next-app@latest`; cache-components rule means any `cookies()`/`headers()` read must sit inside `<Suspense>` or the prerender fails the build.
- 2026-10-10 — Strict 5-color text palette (red/green/white/blue/orange) — user-specified; terminal-style discipline, no ad-hoc hues.
- 2026-10-10 — Background locked to obsidian black, swapped `#0A0A0A` → `#0B1215` — user preference; cool tint reads better against the blue borders.
- 2026-10-10 — All route handlers return `{success, errorMessage, errorCode, payload}` — one predictable shape for the client; `/api/ably/token` is the sole exception because the Ably SDK demands a raw `TokenRequest`.
- 2026-10-10 — Browser gets Ably access via `/api/ably/token`, never the root key — `ABLY_API_KEY` must not reach the client; tokens are scoped to `demo*` and carry the Supabase user id as `clientId`.
- 2026-10-10 — No auth middleware, login page, or DB tables yet — not requested; add when the first real table lands.
- 2026-10-10 — Compact at 50% context, not 95% — user rule; late compaction loses detail mid-task.
- 2026-10-10 — Statusline (`~/.claude/statusline.mjs`) reuses this palette as truecolor ANSI — one color language across editor and terminal; green/orange/red at 75%/90% thresholds.
- 2026-10-10 — Site-wide green border box on `<body>` — user request; frames the whole app terminal-style, set once in root layout so every route inherits it.
- 2026-10-10 — green token `#0DBC79` → `#00FFB3` (also in statusline.mjs) — user preference; brighter neon green.
- 2026-10-10 — Statusline drops app palette + heat thresholds → laser green `#39FF14` (values/bars), acid yellow `#E8FF00` (labels), white model; 5h/7d show used% + bar, not left% — user preference; supersedes earlier statusline entry.
- 2026-10-10 — IBM Plex Mono 600/700 replaces Geist as the only font; site border green → orange — user preference; terminal look, and the orange frame matches the KILLER title.
- 2026-10-10 — Plex Mono lacks box-drawing glyphs → ASCII art uses `font-art` system mono stack — columns misaligned under Plex fallback.
- 2026-10-10 — Decision log + project memory moved out of CLAUDE.md into `MEMORY.md` — user request; CLAUDE.md stays rules-only, MEMORY.md holds history and live state.
- 2026-10-10 — Confirmed: title stays ASCII art (system mono `font-art`); all other text uses IBM Plex Mono — user preference.
- 2026-10-10 — Title font back to Geist Mono (how it looked before Plex) instead of system mono — user preference; supersedes the two `font-art` entries above.
- 2026-10-10 — Site motion tone = ominous: `ease-ominous` default easing, 700ms default transition, slow 4s blurred title descent + flicker, page fades in from dark — user request; replaces 0.7s ease-out drop-in.
- 2026-10-10 — Centre box with typed `-- KILLER --` after title animation — user request; CSS-only typewriter (`steps(12)` on width in `ch`, exact because Plex Mono is monospace), no JS timer. Box border `border-blue/40` per §1 surface rule.
- 2026-10-10 — Centre box → small borderless `KILLER 🔪` label overlaid on the title art, flicker-in + endless ominous blink; typewriter dropped — user request; supersedes the typed `-- KILLER --` box.
- 2026-10-10 — `KILLER 🔪` label now starts 6.8s (title ends 6.0s) with `step-end` hard on/off flicker instead of linear fades — user: must appear only after title animation finishes and flicker in, not fade. If title timings change, shift the `animate-sigil` delays to match.
- 2026-10-10 — `KILLER 🔪` label 3× bigger (10/12px → 30/36px, padding ×3) — user request.
- 2026-10-10 — 3× label reverted; now 1.5× original (10/12px → 15/18px, padding ×1.5) — user: 3× too big.
- 2026-10-10 — Start/Join Mystery menu as native radio inputs styled with `has-checked:`/`peer-checked:` — keyboard + a11y for free, page stays a Server Component; red unselected, orange selected, terminal ○/● dot; enters 1rem above its slot, not from screen top — user spec.
- 2026-10-10 — `KILLER 🔪` label: endless blink removed, flickers once on appear — user: should not keep flickering.
- 2026-10-10 — Menu moved to client component `ModeMenu` with window-level arrow keys (skips when a radio has focus to avoid double-step) — user wants arrows to work without first focusing; native radios only respond to arrows when focused.
- 2026-10-10 — Unselected menu options show no dot (`invisible`, space kept so labels stay aligned) — user request.
- 2026-10-10 — `KILLER 🔪` overlay label removed entirely; menu entry pulled forward to 6.8s/7.2s (right after title ends 6.0s) — user: remove the flicker box. Note: user's `next dev` tab may have shown stale infinite blink; current build has no running animations after load.
- 2026-10-10 — `/join` page: 8-digit OTP-style code boxes + name + Enter, all orange, centred — user spec. Submit no-op until a room backend exists. Menu: Enter opens selected option, click opens directly; label onClick ignores events targeting the radio so keyboard-synthesised radio clicks don't navigate.
- 2026-10-10 — /join restyle: title shown static (extracted `KillerTitle`), code alphanumeric + uppercased, GitHub-style rounded narrow boxes grouped 4–4, left labels, underline name input, button renamed `Join Mystery` with left→right fill on hover — user spec. Fill is `bg-orange/20` not solid orange: solid would hide orange text and the palette bans dark text colors.
- 2026-10-11 — Menu entry 6.8s/7.2s → 6.0s/6.4s, starts the moment the title animation (0.6s delay + 4s descend + 1.4s flicker) ends — user request.
- 2026-10-11 — /join form resets on every visit — user: never persist entered values. Done via effect cleanup because Next 16 cacheComponents keeps routes mounted (hidden) across navigation; any future form with state needs the same.
- 2026-10-11 — Join Mystery submit → `/lobby/[code]?name=` with static title — user request. Name rides in the query string because there's no room/player store yet; move it server-side when rooms land.
- 2026-10-11 — Lobby layout: code badge left of story title, difficulty subtitle, Lobby players section, Start Mystery button — user spec. Story title/difficulty are placeholders (no room data yet). Button extracted to `FillButton` so Join/Start Mystery stay identical.
- 2026-10-11 — Lobby "waiting for other players" gets animated `...` loader (`animate-dot`, 3 dots staggered 0.6s, 2.4s ominous fade loop, motion-safe) — user request. Dots `aria-hidden` so screen readers don't hear "dot dot dot"; reduced-motion users see static dots.
- 2026-10-11 — Lobby join code moved under difficulty as plain `Code : XXXX-XXXX` (no badge box, hyphen not en-dash) — user request; supersedes badge-left-of-title layout.
- 2026-10-12 — Installed `murder-mystery-story-tree` skill project-level in `.claude/skills/` — user request; defines the JSON contract the future game engine consumes. Validator + skeleton smoke-tested (0 errors).
- 2026-10-15 — Game backend: server-authoritative engine (pure TS port of skill engine-rules) in route handlers; Ably payload-free doorbell + refetch; Supabase anonymous auth; game tables via secret-key admin client with RLS on/no policies — user chose Ably + Supabase; doorbell keeps secrets off the wire and makes reconnect trivial.
- 2026-10-15 — Mysteries ship as repo JSON (skill output) + manifest, not DB rows — no runtime generation; zero extra infra. Move to a table if adding without deploy matters.
- 2026-10-15 — Phones join by mobile web (no Expo), picks wait forever (no timer), narration typewriter + optional browser speech voice — user choices.
- 2026-10-15 — UI art direction via taste skill `sentence-as-layout` (seed 563288058, palette/type kept): poster-scale single sentences, rising glyph ground = clock, no round numbers, ink by phase, 5 type steps — user asked to use the taste skill; ground ties the UI to the setting's own clock.
- 2026-10-15 — Picks submitted by slot A–D, never option id — option ids embed track names (`r9_solved_A`) and would leak the ending.
- 2026-10-15 — QR = obsidian modules on orange field (dark-on-light polarity) — inverted QR codes fail on some phone cameras.
- 2026-10-15 — Realtime moved from Ably to Supabase Realtime (private `room:<CODE>` broadcast doorbell + presence, RLS on realtime.messages via `private.is_room_member`) — user choice; one account, no Ably key needed. Supersedes the Ably doorbell entry above.
- 2026-10-15 — Supabase project created via CLI; config tracked in `supabase/config.toml`; anon sign-in limit raised 30 → 300/h/IP — party guests share one IP and tests burned the 30 quota.
