# killer-killer trailer (30 s, 1920x1080, 30 fps)

Rebuild (one command): `node trailer/render.mjs` -> `killer-killer-trailer.mp4` + `poster.jpg` (frame 0). Stills: `node trailer/render.mjs 0 5.5 16.1` -> `trailer/work/stills/`.

- `scene.html`: every frame = pure function of t (`window.draw(t)`), Canvas 2D; cues from `audio/cues.json`. Palette only.
- `render.mjs`: Playwright (local http server) -> JPEG frames -> ffmpeg x264 + `audio/master.wav` (AAC 320k).
- Painted plates (p5.brush, once, ~7 min each, gitignored in `work/plates/`): `node scripts/art/render.mjs scripts/art/paintings/trailer-{lighthouse,desk,friends}.mjs trailer/work/plates/<name>.png 2304 1296`.
- Portraits: `public/cases/*/suspects/*.webp`, fictional names only. Fonts: `fonts/` (OFL).
