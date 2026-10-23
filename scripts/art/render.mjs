#!/usr/bin/env node
// node scripts/art/render.mjs <painting.mjs> <out.webp|png|jpg> [w h]
// Painting module: `export default async (brush, { W, H }) => {}`; use kit.mjs begin(). Rendered once, headless, committed as static image.
import { chromium } from "playwright-core";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname, extname } from "node:path";

const [mod, out, w = "1280", h = "720"] = process.argv.slice(2);
if (!mod || !out) { console.error("usage: render.mjs <painting.mjs> <out.webp|png> [w h]"); process.exit(1); }
const root = resolve(import.meta.dirname, "../..");
const W = +w, H = +h;
const mime = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg" }[extname(out)];
if (!mime) { console.error("out must end .webp .png or .jpg"); process.exit(1); }

const html = `<!doctype html><body style="margin:0;background:#0B1215"><div id=h></div><script type=module>
import paint from "/${resolve(mod).replace(root + "/", "")}";
import * as brush from "/node_modules/p5.brush/dist/brush.esm.js";
try {
  await paint(brush, { W: ${W}, H: ${H} });
  brush.pop?.(); brush.render?.();
  const src = document.querySelector("canvas");
  const c = document.createElement("canvas"); c.width = ${W}; c.height = ${H};
  const g = c.getContext("2d"); g.fillStyle = "#0B1215"; g.fillRect(0, 0, ${W}, ${H}); g.drawImage(src, 0, 0, ${W}, ${H});
  window.__out = c.toDataURL("${mime}", 0.92);
} catch (e) { window.__err = String(e.stack || e); }
window.__done = true;
</script>`;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.addInitScript(`window.__spec = ${JSON.stringify(process.env.KK_SPEC ?? null)};`); // painting modules can read which spec to paint
page.on("console", (m) => m.type() === "error" && console.error("page:", m.text()));
await page.route("http://art.local/**", async (route) => {
  const p = decodeURIComponent(new URL(route.request().url()).pathname);
  if (p === "/") return route.fulfill({ contentType: "text/html", body: html });
  const file = resolve(root, "." + p);
  if (!file.startsWith(root)) return route.abort();
  await route.fulfill({ contentType: "text/javascript", body: await readFile(file) }).catch(() => route.abort());
});
await page.goto("http://art.local/", { waitUntil: "commit" });
await page.waitForFunction("window.__done", null, { timeout: 900000 });
const err = await page.evaluate("window.__err");
if (err) { console.error(err); process.exit(1); }
const data = await page.evaluate("window.__out");
await mkdir(dirname(resolve(out)), { recursive: true });
await writeFile(resolve(out), Buffer.from(data.split(",")[1], "base64"));
await browser.close();
console.log("wrote", out, `${W}x${H}`);
