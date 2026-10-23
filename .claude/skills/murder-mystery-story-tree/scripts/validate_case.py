#!/usr/bin/env python3
"""Validate a case folder (case.json + solution.json) or a lexicon.

Usage:
  python3 -I validate_case.py <case_dir>
  python3 -I validate_case.py --lexicon lexicon.json
Prints `ERROR [code] msg` / `WARN [code] msg`; exit 1 on any error. Schema: references/schema.md.
"""
import json
import re
import sys
from pathlib import Path

PALETTE = {"#E5484D", "#00ffb3", "#e5e5e5", "#3B8EEA", "#d97757", "#0b1215"}
SIZES = {"easy": ((3, 4), (10, 16)), "medium": ((4, 5), (16, 24)), "hard": ((5, 7), (24, 34))}
FOLDERS = {"suspects", "statements", "reports", "evidence", "documents", "timeline", "map", "extras"}
PARTS = ("who", "why", "how")
KIND_FIELDS = {"note": ["body"], "statement": ["speaker", "lines"], "report": ["sections"],
               "photo": ["svg", "caption"], "log": ["rows"], "map": ["svg", "caption"],
               "video": ["src", "captions"]}
MB = 1024 * 1024
BUDGET = {"teaser": 1 * MB, "reveal": 10 * MB, "clip": 3 * MB, "cover": MB // 5}  # references/media.md
MEDIA_EXT = {"teaser": (".mp4",), "cover": (".svg",), "reveal": (".mp4",), "clip": (".mp4",), "captions": (".vtt",),
             "poster": (".png", ".jpg", ".webp")}
PATH_OK = re.compile(r"[a-z0-9][a-z0-9._-]*(/[a-z0-9._-]+)*")
REVEAL_OK = re.compile(r"reveal-[0-9a-f]{12}\.mp4")  # unguessable: obscurity, not auth
UNSAFE = re.compile(r"<script|[\s/]on\w+\s*=|foreignobject|<style|\sstyle\s*=|rgb\(|hsl\(|url\(\s*[\"']?\s*(https?:|//)|href\s*=\s*[\"']?\s*(https?:|//|javascript)", re.I)
COLOUR_ATTR = re.compile(r"\b(fill|stroke|stop-color|color)\s*=\s*[\"']([^\"']*)[\"']", re.I)
CASE_KEYS = {"schema", "slug", "title", "difficulty", "rating", "setting", "tone", "victim", "brief",
             "suspects", "folders", "motives", "methods", "media"}
LEXICON_KEYS = ["card", "desk", "accuse", "wrong", "solved", "defeated", "full", "no_room", "gone"]


def texts(it):
    """Every human-readable string in an item."""
    k = it.get("kind")
    if k == "note":
        return [it.get("body", "")]
    if k == "statement":
        return [x for l in it.get("lines", []) for x in (l.get("q", ""), l.get("a", ""))]
    if k == "report":
        return [x for s in it.get("sections", []) for x in (s.get("heading", ""), s.get("body", ""))]
    if k == "log":
        return [r.get("text", "") for r in it.get("rows", [])]
    return [it.get("caption", "")]


def svg_check(svg, label, err):
    """Drawn SVG rules shared by photo/map items and the cover: safe, palette-only, has viewBox."""
    if not svg:
        return
    if UNSAFE.search(svg):
        err("svg_unsafe", f"{label}: script, event handler, foreignObject or external href")
    cols = set(re.findall(r"#[0-9a-fA-F]{3,8}\b", svg)) | {
        v for _, v in COLOUR_ATTR.findall(svg) if v.lower() not in ("none", "transparent") and not v.startswith("#")}
    for c in cols:
        if c.lower() not in PALETTE:
            err("svg_colour", f"{label}: {c} is not a palette colour")
    if not re.search(r"<svg[^>]*viewBox", svg):
        err("svg", f"{label}: needs <svg viewBox=...>")


def media_file(pub, rel, kind, label, err):
    """Check one media path (relative to /cases/<slug>/): safe, right type, exists, within budget.
    Returns its text if it is a .vtt, else ''."""
    if (not isinstance(rel, str) or not PATH_OK.fullmatch(rel)
            or {".", ".."} & set(rel.split("/"))
            or not (pub / rel).resolve().is_relative_to(pub.resolve())):
        err("media_path", f"{label}: {rel!r} must match [a-z0-9][a-z0-9._-]*(/[a-z0-9._-]+)* and stay inside public/cases/<slug>/")
        return ""
    if not rel.lower().endswith(MEDIA_EXT[kind]):
        err("media_path", f"{label}: {rel!r} must end {'/'.join(MEDIA_EXT[kind])}")
        return ""
    f = pub / rel
    if not f.is_file():
        err("media_missing", f"{label}: {f} does not exist")
        return ""
    if kind in BUDGET and f.stat().st_size > BUDGET[kind]:
        err("media_size", f"{label}: {f.stat().st_size / MB:.1f} MB, budget {BUDGET[kind] // MB} MB")
    return f.read_text(errors="replace") if kind == "captions" else ""


def check(d, public=None):
    """Return (errors, warnings) as lists of strings starting with the [code].
    `public` = public/cases/<slug>/; default <repo>/public/cases/<slug> from src/mysteries/<slug>."""
    d = Path(d)
    E, W = [], []
    err = lambda c, m: E.append(f"[{c}] {m}")
    warn = lambda c, m: W.append(f"[{c}] {m}")
    case = json.loads((d / "case.json").read_text())
    sol = json.loads((d / "solution.json").read_text())
    if case.get("schema") != "mm-case-file/1":
        err("schema", "case.schema must be mm-case-file/1")
    if sol.get("schema") != "mm-case-solution/1":
        err("schema", "solution.schema must be mm-case-solution/1")
    for k in ("slug", "title", "setting", "tone", "brief"):
        if not str(case.get(k, "")).strip():
            err("field", f"case.{k} missing")
    if case.get("rating") not in ("PG-13", "mature"):
        err("field", "rating must be PG-13 or mature")
    v = case.get("victim") or {}
    if not (v.get("name") and v.get("summary")):
        err("field", "victim needs name and summary")
    for k in sorted(set(case) - CASE_KEYS):
        err("case_key", f"unknown case.json key {k!r}")
    sus = case.get("suspects") or []
    for i, s in enumerate(sus):
        for k in ("name", "role", "relation", "alibi", "note"):
            if not str(s.get(k, "")).strip():
                err("field", f"suspects[{i}].{k} missing")

    items = {}
    for f in case.get("folders") or []:
        if f.get("kind") not in FOLDERS:
            err("folder", f"folder {f.get('id')}: bad kind {f.get('kind')!r}")
        for it in f.get("items") or []:
            iid = it.get("id")
            if iid in items:
                err("dup_id", f"item id {iid!r} repeated")
            items[iid] = it
            if not it.get("title"):
                err("field", f"item {iid} needs title")
            if it.get("kind") not in KIND_FIELDS:
                err("item", f"item {iid}: bad kind {it.get('kind')!r}")
                continue
            for k in KIND_FIELDS[it["kind"]]:
                if not it.get(k):
                    err("item", f"item {iid} ({it['kind']}) needs {k}")
            svg_check(it.get("svg"), f"item {iid}", err)

    root = d.resolve().parents[2] if len(d.resolve().parents) > 2 else Path("/nonexistent")
    pub = Path(public) if public else root / "public" / "cases" / str(case.get("slug"))
    vtt = []  # (where, text) of evidence captions, scanned for the killer below
    media = case.get("media", {})
    if not isinstance(media, dict) or set(media) - {"teaser", "cover"}:
        err("media", "case.media must be an object with only teaser, cover (reveal lives in solution.json)")
        media = {}
    for k, rel in media.items():
        media_file(pub, rel, k, f"media.{k}", err)
        if k == "cover" and (pub / str(rel)).is_file():
            svg_check((pub / rel).read_text(errors="replace"), "media.cover", err)
    rv = sol.get("reveal")
    if rv is not None:
        if not isinstance(rv, str) or not REVEAL_OK.fullmatch(rv):
            err("media_path", f"solution.reveal {rv!r} must be reveal-<12 hex>.mp4 (unguessable name)")
        else:
            media_file(pub, rv, "reveal", "solution.reveal", err)
            media_file(pub, rv[:-4] + ".vtt", "captions", "solution.reveal captions", err)  # not scanned: reveal may name the killer
    for iid, it in items.items():
        if it.get("kind") != "video":
            continue
        media_file(pub, it.get("src"), "clip", f"item {iid} src", err)
        if it.get("poster"):
            media_file(pub, it["poster"], "poster", f"item {iid} poster", err)
        vtt.append((f"item {iid} captions", media_file(pub, it.get("captions"), "captions", f"item {iid} captions", err)))

    diff = case.get("difficulty")
    if diff not in SIZES:
        err("field", "difficulty must be easy, medium or hard")
    else:
        (slo, shi), (ilo, ihi) = SIZES[diff]
        if not slo <= len(sus) <= shi:
            err("difficulty_size", f"{diff} wants {slo}-{shi} suspects, has {len(sus)}")
        if not ilo <= len(items) <= ihi:
            err("difficulty_size", f"{diff} wants {ilo}-{ihi} items, has {len(items)}")

    for key, pre, ans in (("motives", "m", "motive"), ("methods", "h", "method")):
        opts = case.get(key) or []
        ids = [o.get("id") for o in opts]
        if not 4 <= len(opts) <= 6:
            err("option_count", f"{key}: need 4-6, has {len(opts)}")
        if ids != [f"{pre}{n + 1}" for n in range(len(ids))]:
            err("option_count", f"{key}: ids must run {pre}1..{pre}{len(ids)} in order")
        if sol.get(ans) not in ids:
            err("option_count", f"solution.{ans} {sol.get(ans)!r} is not one of {key}")
        if len({o.get("text") for o in opts}) != len(opts):
            err("option_count", f"{key}: duplicate text")

    killers = sol.get("killers")
    if not isinstance(killers, list) or any(not isinstance(k, int) or not 0 <= k < len(sus) for k in killers):
        err("killers", "solution.killers must be suspect indexes")
        killers = []
    if len(set(killers)) != len(killers):
        err("killers", "duplicate killer index")
    if not sol.get("story"):
        err("field", "solution.story needs lines")

    cited = {p: set() for p in PARTS}
    for i, dd in enumerate(sol.get("deductions") or []):
        if dd.get("part") not in PARTS:
            err("deduction", f"deductions[{i}]: part must be who, why or how")
            continue
        for iid in dd.get("items") or []:
            if iid in items:
                cited[dd["part"]].add(iid)
            else:
                err("unknown_item", f"deductions[{i}] cites missing item {iid!r}")
    for p in PARTS:
        if len(cited[p]) < 2:
            err("deduction_thin", f"{p}: backed by {len(cited[p])} distinct item(s), need 2")

    ruled = {}
    for h in sol.get("herrings") or []:
        if not isinstance(h.get("suspect"), int) or not 0 <= h["suspect"] < len(sus):
            err("herring", f"herring suspect {h.get('suspect')!r} out of range")
            continue
        ruled[h["suspect"]] = h
        if not h.get("ruled_out_by"):
            err("herring_unruled", f"suspect {h.get('suspect')} has no rule-out items")
        for iid in h.get("ruled_out_by") or []:
            if iid not in items:
                err("unknown_item", f"herring {h.get('suspect')} cites missing item {iid!r}")
    for i, s in enumerate(sus):
        if i not in killers and i not in ruled:
            err("herring_unruled", f"{s.get('name')} is innocent but has no herrings entry")
        if i in killers and i in ruled:
            err("herring", f"{s.get('name')} is a killer and a herring")

    scan = [(f"item {i}", t) for i, it in items.items() for t in [it.get("title", ""), *texts(it)]]
    scan += [("brief", case.get("brief", "")), ("victim.summary", v.get("summary", ""))]
    scan += [(f"suspects[{n}]", str(x)) for n, s_ in enumerate(sus) for x in s_.values()]
    scan += [(o.get("id"), o.get("text", "")) for o in (case.get("motives") or []) + (case.get("methods") or [])]
    scan += vtt  # evidence captions follow the same fairness rule; the reveal may name the killer
    for k in killers:
        full = sus[k].get("name", "")
        pat = re.compile(rf"\b({re.escape(full)}|{re.escape(full.split()[0])}) (killed|is the killer|murdered)", re.I)
        for where, t in scan:
            if pat.search(t):
                err("names_killer", f"{where} says outright that {full} did it")

    if not any(it.get("kind") == "photo" for it in items.values()):
        warn("no_photo", "no photo item; a scene photo helps the room")
    for iid, it in items.items():
        for t in texts(it):
            for sent in re.split(r"(?<=[.!?])\s+", t):
                if len(sent.split()) > 30:
                    warn("long_sentence", f"item {iid}: {len(sent.split())} words: {sent[:50]}...")
    return E, W


def check_lexicon(lx):
    E = []
    if lx.get("schema") != "mm-lexicon/1":
        E.append("[schema] lexicon.schema must be mm-lexicon/1")
    want = set(LEXICON_KEYS) | {"schema", "loaders"}
    for k in sorted(set(lx) ^ want):
        E.append(f"[keys] {'unknown' if k in lx else 'missing'} key {k!r}")
    strs = {k: lx.get(k) for k in LEXICON_KEYS}
    ld = lx.get("loaders")
    if not isinstance(ld, list) or not 3 <= len(ld) <= 6:
        E.append("[loaders] loaders must be 3-6 strings")
        ld = []
    for k, s in [*strs.items(), *((f"loaders[{i}]", s) for i, s in enumerate(ld))]:
        if not isinstance(s, str) or not s.strip():
            E.append(f"[string] {k} must be a non-empty string")
            continue
        if re.search(r"\d", s):
            E.append(f"[digits] {k}: write counts in words ({s!r})")
        if len(s) > 60:
            E.append(f"[length] {k}: {len(s)} chars, max 60")
        if "!" in s:
            E.append(f"[tone] {k}: no exclamation marks")
    return E


def main(argv):
    if len(argv) == 3 and argv[1] == "--lexicon":
        E, W = check_lexicon(json.loads(Path(argv[2]).read_text())), []
    elif len(argv) == 2:
        E, W = check(argv[1])
    else:
        print(__doc__)
        return 2
    if len(argv) == 2:
        c = json.loads((Path(argv[1]) / "case.json").read_text())
        if not c.get("media") and not any(i.get("kind") == "video" for f in c.get("folders", []) for i in f.get("items", [])):
            print("INFO [media] no cover, teaser, reveal or video items; optional, see SKILL.md Media phase")
    for w in W:
        print("WARN", w)
    for e in E:
        print("ERROR", e)
    print(f"{len(E)} errors, {len(W)} warnings")
    return 1 if E else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
