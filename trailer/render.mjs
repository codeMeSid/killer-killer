// node trailer/render.mjs [t ...]  -> no args: full 30s render to trailer/killer-killer-trailer.mp4; with times: PNG stills in trailer/work/stills/
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve, extname } from "node:path";
const root = resolve(import.meta.dirname, "..");
const mime = { ".html": "text/html", ".png": "image/png", ".webp": "image/webp", ".ttf": "font/ttf" };
const srv = createServer(async (q, s) => { try { const p = decodeURIComponent(q.url.split("?")[0]); if (!/^\/(trailer|public\/cases)\//.test(p) || p.includes("..")) throw 0; s.setHeader("content-type", mime[extname(p)] || "application/octet-stream"); s.end(await readFile(root + p)); } catch { s.statusCode = 404; s.end(); } }).listen(0);
await new Promise((r) => srv.on("listening", r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on("console", (m) => console.error("page:", m.text()));
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto(`http://localhost:${srv.address().port}/trailer/scene.html`);
await page.evaluate("window.ready");
const shot = (t) => page.evaluate((t) => { window.draw(t); return document.getElementById("c").toDataURL("image/jpeg", 0.95).split(",")[1]; }, t);
const args = process.argv.slice(2);
if (args.length) {
  await mkdir(root + "/trailer/work/stills", { recursive: true });
  for (const t of args) await writeFile(`${root}/trailer/work/stills/t${t}.jpg`, Buffer.from(await shot(+t), "base64"));
} else {
  const out = root + "/trailer/killer-killer-trailer.mp4";
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", "30", "-c:v", "mjpeg", "-i", "-", "-i", root + "/trailer/audio/master.wav",
    "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "320k", "-t", "30", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
  for (let f = 0; f < 900; f++) { if (!ff.stdin.write(Buffer.from(await shot(f / 30), "base64"))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 90 === 0) console.error("frame", f); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r));
  await writeFile(root + "/trailer/poster.jpg", Buffer.from(await shot(0), "base64"));
}
await browser.close(); srv.close();
