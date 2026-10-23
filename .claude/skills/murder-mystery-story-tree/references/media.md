# Media phase reference

Run only after the case is validated and installed (SKILL.md step 11). Output: `public/cases/<slug>/`.

## Files
```
public/cases/<slug>/
  cover.svg             drawn by the model, palette-only, <= 200 KB -> case.media.cover = "cover.svg" (register in COVERS)
  teaser.mp4            silent loop, 6-10s, <= 1 MB      -> case.media.teaser = "teaser.mp4"
  reveal-<12 hex>.mp4   narrated, <= 10 MB, + same-name .vtt -> solution.json reveal = "reveal-<12 hex>.mp4" (NOT case.json)
  <item-id>.mp4         evidence clip, <= 3 MB           -> item {kind:"video", src:"<item-id>.mp4"}
  <item-id>.vtt         captions (burned in AND file)    -> item.captions = "<item-id>.vtt"
  <item-id>.png|jpg|webp optional poster                 -> item.poster
  voices.json           {narrator, suspects:[{index, voice}]} for re-renders
```
Work dirs (HyperFrames projects) live outside the repo, e.g. the scratchpad; commit only the outputs. Name clip files after the item id (`d1.mp4`).

## Tool commands (verified against plugin hyperframes 0.8.61 skills; run `npx hyperframes <cmd> --help` before using any other flag)
```bash
npx hyperframes init <project>                 # blank centred project
npx hyperframes lint                           # fast check while authoring
npx hyperframes check                          # final gate, includes lint
npx hyperframes snapshot --at 1,3,5            # inspect frames
npx hyperframes tts "text" -o line.wav         # local Kokoro; --voice <id>; --list
npx hyperframes transcribe line.wav --json     # word timings for captions
npx hyperframes render --quality looks --output out.mp4   # also --quality draft|delivery, --fps N
```
Read plugin skills `/hyperframes-cli`, `/hyperframes-core`, `/hyperframes-audio`, `/media-use`, `/captions-overlay` before authoring. Never render until `check` passes. Size over budget: lower `--quality`, shorten, drop fps (e.g. `--fps 24`), check with `ls -l` then `ffprobe`.

## Look (palette only)
Canvas 1280x720 (`data-width`/`data-height`). Background `#0B1215`. Ink `#E5E5E5` (text), `#2472C8` (rules, meta), `#D97757` (accent), `#00FFB3` (ok), `#CD3131` (alert). Square borders: `border: 4px solid`, `border-radius: 0`, hard 4px offset shadows only in palette hue. No gradients, no blur, no other colours. Fonts: Pixelify Sans / VT323 (headings), IBM Plex Mono 600 (anything read). Captions in Plex Mono, white on obsidian bar, bottom third, max two lines, >= 36px.
Motion: GSAP, hard `steps()` or `power3` ease, no flashing over 3/sec. Teaser may use scanline drift; nothing moves under text being read.

## Composition skeleton
Standalone root, no `<template>` wrapper, paused GSAP timeline registered on `window.__timelines`:
```html
<div id="root" data-composition-id="main" data-start="0" data-width="1280" data-height="720" data-duration="8">
  <section class="clip" data-start="0" data-duration="8"> ...scene... </section>
  <audio id="vo" src="line.wav" data-start="0" data-duration="8"></audio>  <!-- evidence + reveal only -->
</div>
<script>const tl = gsap.timeline({ paused: true }); /* tweens */ window.__timelines["main"] = tl;</script>
```
Confirm exact audio/caption markup in `/hyperframes-audio` and `/captions-overlay` first.

## Templates
- **Teaser (silent loop):** title card (case title, `font-pixel`), setting line, victim name; one slow ambient move (scanlines, lamp flicker matching the setting). First frame = last frame so it loops. No audio track.
- **Evidence clip, voicemail/radio:** waveform bars (`#00FFB3`) + caller label + time stamp + burned captions. One speaker voice (the suspect or witness card).
- **Evidence clip, CCTV:** framed square window, timestamp in `#D97757`, simple flat shapes from the item's SVG; narration optional (log read by narrator).
- **Reveal:** one scene per `solution.story` line, then who / why / how as three title cards citing the deduction items by title. Narrator voice. Killer named only here; end card = `lexicon.solved` text.

## Narration script rules
- Evidence: the script is the item's existing text, lightly spoken. No new fact, no name of the killer, no verdict words ("guilty", "did it"). Same fairness rule as item text.
- Reveal: source = `solution.json` only. Read after validation; do not alter `case.json` to suit it.
- Each line <= 30 words, concrete nouns, counts in words not digits (spoken). 145-155 wpm. Names read aloud must sound distinct.
- Rating ceiling of the case applies to every line.
- Reveal is not shown until the room ends the case; never link it from an item. Name = `reveal-` + 12 random hex (`openssl rand -hex 6`), set in `solution.json` only; server sends it in the ended-room `ending` payload. ponytail: obscurity not auth, ceiling = anyone with the link; upgrade = ending-gated route handler streaming from outside `public/`. Validator skips killer-name scan on the reveal `.vtt` (reveal may name the killer).

## Voices (VoiceStudio MCP, server `voicestudio`)
Tools: `generate_speech`, `design_voice`, `describe_voice`, `list_voices`. For files: start VoiceStudio with `OMNIVOICE_MCP_OUTPUT_MODE=files` and `OMNIVOICE_MCP_BASE_PATH=<dir>`. Read each tool's schema before calling. Order: `list_voices` (reuse existing) then `design_voice` then `generate_speech`.
- **Narrator:** one voice for every case so the product sounds one way: calm, mid-low, neutral, measured, slight grain, no accent. Design once, reuse, record id in `voices.json`.
- **Suspect voices:** one `design_voice` per suspect from the card (`role`, `relation`, `note`), plus age/accent implied by setting. Different pitch and pace per suspect so voices cannot be confused. Only voice suspects that speak in a clip.
- Prompt template: `"<age band> <gender if the card says> voice, <pitch> pitch, <pace> pace, <accent from setting>, <temperament from note>, recorded <room>"`.

| Archetype | Prompt seed |
|---|---|
| Authority, keeper, captain | older, low pitch, slow, gravel, clipped, controlled |
| Anxious junior, assistant | young, higher pitch, fast, breathy, hesitant |
| Charming insider, host | mid age, warm baritone, easy pace, smooth, a little too friendly |
| Cold professional, doctor, lawyer | mid age, even mid pitch, precise, dry, flat affect |
| Grieving relative | any age, soft, slow, cracked, quiet |
| Outsider, drifter | weathered, rough, uneven pace, regional accent |

Do not write the suspect's guilt or innocence into a voice prompt. Voice must not tip the verdict: equal warmth/menace spread across suspects including the killer.

## Fallback (VoiceStudio not running)
`list_voices` fails or MCP unreachable: say so, then `npx hyperframes tts "<text>" -o <file>.wav` (local Kokoro). Pick the narrator voice from `npx hyperframes tts --list`, and a different Kokoro voice per speaking suspect. Note in `voices.json` that fallback was used. Do not substitute silently; the plugin's HeyGen/ElevenLabs routes need API keys, so do not use them unless the user supplies one.

## Checks before wiring
`ffprobe -v error -show_format -show_streams <file>`: duration within target, audio stream present (evidence/reveal) or absent (teaser). `ls -l` vs budget. Read each `.vtt` for the killer's name (validator also checks). View one `snapshot` frame per clip for palette and square borders.
