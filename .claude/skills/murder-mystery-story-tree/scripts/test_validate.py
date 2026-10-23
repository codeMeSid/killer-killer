#!/usr/bin/env python3
"""Mutation tests: python3 -I test_validate.py"""
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import validate_case as V  # noqa: E402

EX = HERE.parent / "assets" / "example"
BASE = (json.loads((EX / "case.json").read_text()), json.loads((EX / "solution.json").read_text()))


def run(mutate):
    case, sol = copy.deepcopy(BASE)
    mutate(case, sol)
    with tempfile.TemporaryDirectory() as t:
        Path(t, "case.json").write_text(json.dumps(case))
        Path(t, "solution.json").write_text(json.dumps(sol))
        return V.check(t)


def item(case, iid):
    return next(i for f in case["folders"] for i in f["items"] if i["id"] == iid)


class T(unittest.TestCase):
    def has(self, code, mutate):
        E, _ = run(mutate)
        self.assertTrue(any(e.startswith(f"[{code}]") for e in E), (code, E))

    def test_example_clean(self):
        self.assertEqual(run(lambda c, s: None), ([], []))

    def test_deduction_thin(self):
        self.has("deduction_thin", lambda c, s: s["deductions"][1].update(items=["d1"]))

    def test_names_killer(self):
        self.has("names_killer", lambda c, s: item(c, "d1").update(body="Maren Pike killed her."))
        self.has("names_killer", lambda c, s: item(c, "d1").update(body="maren pike is the killer."))

    def test_herring_unruled(self):
        self.has("herring_unruled", lambda c, s: s["herrings"].pop())

    def test_suicide_needs_all_ruled(self):
        def m(c, s):
            s["killers"] = []
            s["herrings"] = s["herrings"][:1]
        self.has("herring_unruled", m)

    def test_svg_unsafe(self):
        for bad in ("<script>1</script>", '<rect onclick="x()"/>', "<foreignObject/>", '<a href="http://x"/>'):
            self.has("svg_unsafe", lambda c, s, b=bad: item(c, "e1").update(svg=item(c, "e1")["svg"] + b))

    def test_svg_colour(self):
        self.has("svg_colour", lambda c, s: item(c, "e1").update(svg=item(c, "e1")["svg"] + '<path stroke="#FF0000"/>'))

    def test_svg_colour_forms(self):
        for bad in ('<rect fill="red"/>', '<rect fill="rgb(1,2,3)"/>', '<rect style="fill:hotpink"/>',
                    '<style>a{}</style>', '<rect stroke="hsl(1,2%,3%)"/>'):
            self.has("svg_unsafe" if "style" in bad or "(" in bad else "svg_colour",
                     lambda c, s, b=bad: item(c, "e1").update(svg=item(c, "e1")["svg"] + b))
        self.has("svg_unsafe", lambda c, s: item(c, "e1").update(svg=item(c, "e1")["svg"] + "<svg/onload=x()>"))
        self.has("svg_unsafe", lambda c, s: item(c, "e1").update(svg=item(c, "e1")["svg"] + '<rect fill="url(http://x)"/>'))

    def test_names_killer_wide(self):
        self.has("names_killer", lambda c, s: item(c, "d1").update(body="Maren killed her."))
        self.has("names_killer", lambda c, s: c.update(brief="Maren Pike murdered Edda."))
        self.has("names_killer", lambda c, s: item(c, "d1").update(title="Maren is the killer"))
        self.has("names_killer", lambda c, s: c["suspects"][0].update(note="Maren Pike killed her."))

    def test_case_key(self):
        self.has("case_key", lambda c, s: c.update(killers=[1]))

    def test_bad_indexes(self):
        self.has("herring", lambda c, s: s["herrings"].append({"suspect": 9, "ruled_out_by": ["t1"]}))
        self.has("killers", lambda c, s: s.update(killers=[1, 1]))

    def test_difficulty_size(self):
        self.has("difficulty_size", lambda c, s: c.update(difficulty="hard"))
        self.has("difficulty_size", lambda c, s: c["folders"][0]["items"].append(
            {"id": "z", "title": "z", "kind": "note", "body": "z"}) or c["folders"][4]["items"].extend(
            [{"id": f"z{i}", "title": "z", "kind": "note", "body": "z"} for i in range(5)]))

    def test_option_count(self):
        self.has("option_count", lambda c, s: c["motives"].pop())
        self.has("option_count", lambda c, s: s.update(method="h9"))

    def test_unknown_item(self):
        self.has("unknown_item", lambda c, s: s["deductions"][0]["items"].append("nope"))
        self.has("unknown_item", lambda c, s: s["herrings"][0]["ruled_out_by"].append("nope"))

    def media(self, mutate, files):
        """Run with a temp public dir holding `files` {relpath: bytes}; return errors."""
        case, sol = copy.deepcopy(BASE)
        mutate(case, sol)
        with tempfile.TemporaryDirectory() as t, tempfile.TemporaryDirectory() as p:
            Path(t, "case.json").write_text(json.dumps(case))
            Path(t, "solution.json").write_text(json.dumps(sol))
            for rel, data in files.items():
                Path(p, rel).write_bytes(data)
            # extra video item may push item count past the difficulty band; not under test here
            return [e for e in V.check(t, public=p)[0] if not e.startswith("[difficulty_size]")]

    def test_media(self):
        vid = {"id": "v1", "title": "Voicemail", "kind": "video", "src": "v1.mp4", "captions": "v1.vtt"}
        add = lambda c, s: c["folders"][0]["items"].append(dict(vid))  # noqa: E731
        ok = {"v1.mp4": b"x", "v1.vtt": b"WEBVTT\n\n00:00.000 --> 00:02.000\nCall me back."}
        self.assertEqual(self.media(add, ok), [])
        codes = lambda e: " ".join(e)  # noqa: E731
        self.assertIn("[media_missing]", codes(self.media(add, {})))
        self.assertIn("[media_size]", codes(self.media(add, {**ok, "v1.mp4": b"x" * (3 * 1024 * 1024 + 1)})))
        self.assertIn("[names_killer]", codes(self.media(
            add, {**ok, "v1.vtt": b"WEBVTT\n\n00:00.000 --> 00:02.000\nMaren Pike killed her."})))
        self.assertIn("[media_path]", codes(self.media(
            lambda c, s: c.update(media={"teaser": "../x.mp4"}), {})))
        self.assertIn("[media_size]", codes(self.media(
            lambda c, s: c.update(media={"teaser": "t.mp4"}), {"t.mp4": b"x" * (1024 * 1024 + 1)})))
        self.assertIn("[media]", codes(self.media(lambda c, s: c.update(media={"reveal": "r.mp4"}), {"r.mp4": b"x"})))
        cv = lambda c, s: c.update(media={"cover": "cover.svg"})  # noqa: E731
        self.assertEqual(self.media(cv, {"cover.svg": b'<svg viewBox="0 0 640 360"><rect fill="#0B1215" width="640" height="360"/></svg>'}), [])
        self.assertIn("[svg_colour]", codes(self.media(cv, {"cover.svg": b'<svg viewBox="0 0 1 1"><rect fill="#FF00FF"/></svg>'})))
        self.assertIn("[svg_unsafe]", codes(self.media(cv, {"cover.svg": b'<svg viewBox="0 0 1 1"><script>x</script></svg>'})))
        self.assertIn("[media]", codes(self.media(lambda c, s: c.update(media={"trailer": "t.mp4"}), {})))
        for bad in ("%2e%2e/x.mp4", "a\\b.mp4", "t.mp4?x", "t.mp4#x", "a/../b.mp4", "../x.mp4", "/x.mp4", "A.mp4"):
            self.assertIn("[media_path]", codes(self.media(lambda c, s, b=bad: c.update(media={"teaser": b}), {})), bad)
        rv, rvv = "reveal-0123456789ab.mp4", "reveal-0123456789ab.vtt"
        both = {rv: b"x", rvv: b"WEBVTT\n\n00:00.000 --> 00:02.000\nMaren Pike killed her."}
        self.assertEqual(self.media(lambda c, s: s.update(reveal=rv), both), [])
        self.assertIn("[media_path]", codes(self.media(lambda c, s: s.update(reveal="reveal.mp4"), {"reveal.mp4": b"x"})))
        self.assertIn("[media_missing]", codes(self.media(lambda c, s: s.update(reveal=rv), {rv: b"x"})))
        self.assertIn("[media_size]", codes(self.media(lambda c, s: s.update(reveal=rv), {**both, rv: b"x" * (10 * 1024 * 1024 + 1)})))

    def test_lexicon(self):
        lx = json.loads((EX / "lexicon.json").read_text())
        self.assertEqual(V.check_lexicon(lx), [])
        self.assertTrue(V.check_lexicon({**lx, "gone": "Room 7"}))
        self.assertTrue(V.check_lexicon({**lx, "loaders": "x"}))
        self.assertTrue(V.check_lexicon({**lx, "extra": "x"}))


if __name__ == "__main__":
    unittest.main()
