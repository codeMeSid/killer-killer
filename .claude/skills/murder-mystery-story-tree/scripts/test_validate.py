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

    def test_lexicon(self):
        lx = json.loads((EX / "lexicon.json").read_text())
        self.assertEqual(V.check_lexicon(lx), [])
        self.assertTrue(V.check_lexicon({**lx, "gone": "Room 7"}))
        self.assertTrue(V.check_lexicon({**lx, "loaders": "x"}))
        self.assertTrue(V.check_lexicon({**lx, "extra": "x"}))


if __name__ == "__main__":
    unittest.main()
