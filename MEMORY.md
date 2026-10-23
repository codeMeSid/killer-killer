# killer-killer — memory

Project memory + decision log. Rules in `CLAUDE.md`; this file = state + history. See CLAUDE.md §11.

## Memory (current state — edit in place)

- **Homepage** (`src/app/page.tsx`, machine `computer`): BASIC boot sequence (`boot-screen.tsx`, ~2s once/session via `sessionStorage kk:booted`, any key/tap skips), then KILLER art flickers + glitches in, arcade menu `Start Case` → `/start`, `Join Case` → `/join` (`mode-menu.tsx`, arrows + Enter, blip/clack SFX).
- **Game (case file, built 2026-10-23, uncommitted)**: `/start` (team name) → `POST /api/rooms` → `/case/[code]` desk (`src/components/desk/*`: folders, item view, pins, presence, accuse panel host-only, reveal); `/join` code-only → `POST /members`; `/leaderboard?slug=`. Backend `src/lib/rooms.ts`, `src/lib/case/{judge,score}.ts`, API under `src/app/api/{rooms,leaderboard}/**`. Old engine/lobby/story screens deleted.
- **Cases**: `hollis-brandt-lighthouse-4s` (The Dark Panel, easy, killer Iris Venn; validate 0/0) registered in `index.ts` + `catalog.ts`. Opus fairness review done + fixes applied; committed `6a92a16`. Browser E2E done 2026-10-23. Skill rewritten for `mm-case-file/1` (`validate_case.py`, `solve_path.py`).
- **Tests**: `npm test` = case judge/score + story-folder checks (5 pass). Dev gallery `/dev/screens?s=desk|desk-item|accuse|wrong|solved|defeated` (demo case in `src/components/dev/`).
- **Open**: blue-ink info lines (§13); pins only on folder items (by design).
- **Shared UI**: `Machine`, `SoundToggle`, `BootScreen`, `KillerTitle`, `FillButton`, `RoomLoading`, `JoinQr`, desk components; `useRoom`/`useWakeLock`/`postJson` in `src/lib/use-room.ts`; SFX `src/lib/sfx.ts`.
- **Site frame**: `<body>` has `border border-orange`.
- **Fonts**: Plex Mono body; pixel display per machine (Pixelify Sans TV, VT323 terminal, Silkscreen computer) via `font-pixel`; Press Start 2P `font-arcade` for ≤3-word labels; Geist Mono for ASCII art.
- **Env / Supabase**: project `killer-killer` (ref `clymvaueusidcxaqezjz`, ap-south-1, org `sid`), linked via CLI. `.env.local` has URL, publishable, secret (fetched w/ `--reveal`), DB password. Migrations `20261015000000_game`, `20261015010000_realtime_rooms`, `20261016000000_vote`, `20261022000000_case_file` all **applied** (2026-10-23). Anonymous sign-ins ON (300/h/IP).
- **Contrast**: blue `#3B8EEA` (5.6:1) + red `#E5484D` (4.8:1) pass WCAG AA on obsidian (lifted 2026-10-23).
- **Statusline**: `~/.claude/statusline.mjs`, global (outside repo) (Kickbacks ad wrapper removed 2026-10-23). Live `rate_limits`/`context_window` fields unconfirmed.
- **Open**: presence resync (`98c5944`) unproven; real multi-device + deployed-build test never run.


## Decision log

Moved to `docs/DECISIONS.md` (append-only, **not** auto-imported: token cost). Read it only when checking why something is the way it is.
