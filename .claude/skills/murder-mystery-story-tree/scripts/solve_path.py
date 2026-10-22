#!/usr/bin/env python3
"""Read-through of the intended solve: python3 -I solve_path.py <case_dir>"""
import json
import sys
from pathlib import Path

d = Path(sys.argv[1])
case = json.loads((d / "case.json").read_text())
sol = json.loads((d / "solution.json").read_text())
items = {i["id"]: i for f in case["folders"] for i in f["items"]}
cite = lambda ids: "\n".join(f'    - "{items[i]["title"]}" ({i})' for i in ids)
opt = lambda key, oid: next(o["text"] for o in case[key] if o["id"] == oid)
names = [case["suspects"][k]["name"] for k in sol["killers"]] or ["nobody (suicide or accident)"]

print(f'{case["title"]} [{case["difficulty"]}, {case["rating"]}]\nBRIEF: {case["brief"]}\n')
print(f'ANSWER: {", ".join(names)}\n  why: {opt("motives", sol["motive"])}\n  how: {opt("methods", sol["method"])}\n')
for line in sol["story"]:
    print(f"  {line}")
print("\nDEDUCTIONS")
for dd in sol["deductions"]:
    print(f'  [{dd["part"]}] {dd["claim"]}\n{cite(dd["items"])}')
print("\nHERRINGS")
for h in sol["herrings"]:
    print(f'  {case["suspects"][h["suspect"]]["name"]} ruled out by:\n{cite(h["ruled_out_by"])}')
