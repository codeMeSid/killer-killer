#!/usr/bin/env python3
"""Play one random legal game and print what the room would see, for a read-through.

Usage:
  python transcript.py tree.json [--seed 1] [--phones]

Prints, round by round, what the TV narrates (recap, then the next scene's intro), the shared evidence,
and with --phones each player's options and private result. Ends with the finale evidence, the vote
and the epilogue. Read it as the room would hear it: a line that contradicts another, a line whose
actor is unclear, or a choice that changes nothing is a writing bug to fix in the tree.

Follows references/engine-rules.md. Picks are random (seeded); about one in three picks pushes luck.
"""
import argparse
import json
import random
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import constants as C  # noqa: E402


def play(t, seed, phones):
    rng = random.Random(seed)
    w, meta = t["world"], t["meta"]
    D = C.DIFFICULTY[meta["difficulty"]]
    scenes = {s["id"]: s for s in t["scenes"]}
    clues = {c["id"]: c for c in w["clues"]}
    items = {i["id"]: i for i in w["items"]}
    sus = w["suspects"]
    suspects_mode = meta["player_role"] == "suspects"
    order = sus[:] if suspects_mode else []
    rng.shuffle(order)
    players = []
    for i in range(meta["player_count"]):
        s = order[i] if suspects_mode else None
        players.append({"id": f"P{i + 1}", "slot": s["player_slot"] if s else i + 1, "suspect": s,
                        "name": (s.get("short_name") or s["name"]) if s else f"Player {i + 1}", "luck": C.START_LUCK,
                        "alive": True, "clues": [], "items": []})
    players.sort(key=lambda p: p["slot"])
    killer = next((p for p in players if p["suspect"] and p["suspect"]["id"] == w["killer_id"]), None)
    party = {"clues": [], "items": []}
    red, track, scene_id = 0, None, next(s["id"] for s in t["scenes"] if s["round"] == 1)
    out = []
    say = out.append

    def stat(p):
        keys = {c for c in p["clues"] + party["clues"] if clues[c]["kind"] == "key"}
        return min(len(keys), C.STAT_MAX)

    def holds(p, it):
        return it in p["items"] or it in party["items"]

    def options(p):
        sc = scenes[scene_id]
        base = sc["personal"][str(p["slot"])] if "personal" in sc else sc["options"]
        res = []
        for o in base:
            v = next((v for v in sc.get("variants", []) if v["slot"] == o["slot"]
                      and v.get("player_slot") in (None, p["slot"])
                      and all(holds(p, i) for i in v["requires"].get("items", []))
                      and stat(p) >= v["requires"].get("min_stat", 0)), None)
            res.append(v["option"] if v else o)
        return res

    def fill(text, actor=None, target=None, accused=None):
        alive = [p["name"] for p in players if p["alive"]]
        surv = "no one" if not alive else alive[0] if len(alive) == 1 else ", ".join(alive[:-1]) + " and " + alive[-1]
        kname = next(s["name"] for s in sus if s["id"] == w["killer_id"])
        vals = {"player": actor or "someone", "target": target or "someone", "party": "the group",
                "victim": meta["victim"]["name"], "killer": kname, "survivors": surv, "accused": accused or "someone"}
        return re.sub(r"\{(\w+)\}", lambda m: vals.get(m.group(1), m.group(0)), text)

    def clamp():
        for p in players:
            p["luck"] = max(0, min(C.LUCK_MAX, p["luck"]))

    clock = w["clock"]
    say(f"# {meta['title']} (seed {seed})")
    say(f"Cast: " + ", ".join(f"{p['id']}={p['name']}{' (KILLER)' if p is killer else ''}" for p in players))
    say(f"\n## {clock['values'][0]} {clock['unit']}\nTV: {fill(scenes[scene_id]['intro'])}")

    for rnd in range(1, C.ROUNDS + 1):
        alive = [p for p in players if p["alive"]]
        luck0 = {p["id"]: p["luck"] for p in players}
        stat0 = {p["id"]: stat(p) for p in players}
        picks = []
        for p in alive:
            opts = options(p)
            o = rng.choice(opts)
            others = [x for x in alive if x is not p]
            if o.get("sabotage", {}).get("scope") == "player" and not others:
                o = next(x for x in opts if not x.get("sabotage"))
            target = rng.choice(others) if o.get("sabotage", {}).get("scope") == "player" else None
            pushed = p["luck"] >= C.PUSH_COST and rng.random() < 0.3
            picks.append({"p": p, "o": o, "target": target, "pushed": pushed, "events": []})
            if phones:
                say(f"  phone {p['name']}: " + " | ".join(("*" if x is o else "") + x["text"] for x in opts))
        for k in picks:  # roll
            p, o = k["p"], k["o"]
            if k["pushed"]:
                p["luck"] -= C.PUSH_COST
            die = rng.randint(1, 6)
            k["die"] = die
            k["ok"] = die != 1 and die + luck0[p["id"]] + (C.PUSH_BONUS if k["pushed"] else 0) >= C.THRESHOLDS[o["tier"]]
            if die == 1:
                p["luck"] -= 1
        clamp()
        for k in picks:  # effects
            p, o = k["p"], k["o"]
            blk = o["on_success"] if k["ok"] else o["on_failure"]
            effects = list(blk["effects"])
            if k["ok"] and k["die"] == 6 and o.get("bonus_clue_id"):
                effects.append({"type": "grant_clue", "clue_id": o["bonus_clue_id"]})
            for e in effects:
                if e["type"] == "grant_clue" and e["clue_id"] not in party["clues"] and e["clue_id"] not in p["clues"]:
                    (party["clues"] if o["tag"] == "group" else p["clues"]).append(e["clue_id"])
                    k["events"].append(("found", clues[e["clue_id"]]["text"], o["tag"] == "group"))
                elif e["type"] == "grant_item" and not any(e["item_id"] in x["items"] for x in players) \
                        and e["item_id"] not in party["items"]:
                    (party["items"] if o["tag"] == "group" else p["items"]).append(e["item_id"])
                    k["events"].append(("found", items[e["item_id"]]["name"], o["tag"] == "group"))
                    if items[e["item_id"]]["luck_on_grant"]:
                        p["luck"] += 1
                elif e["type"] == "luck":
                    p["luck"] += e["delta"]
                elif e["type"] == "share_private_clues" and p["clues"]:
                    party["clues"] += [c for c in p["clues"] if c not in party["clues"]]
                    p["clues"] = []
                    k["events"].append(("shared", None, True))
            if k["ok"] and o["tag"] == "group":
                p["luck"] += 1
            if k["ok"] and k["die"] == 6:
                p["luck"] += 1
        clamp()
        exposures = []
        for k in picks:  # sabotage, slot order
            sab = k["o"].get("sabotage")
            if not sab:
                continue
            tgt = next((x for x in picks if x["p"] is k["target"]), None) if sab["scope"] == "player" else None
            if sab["scope"] == "player" and tgt and tgt["p"]["alive"] and tgt["o"]["tag"] == "solo":
                if sab["effect"] == "steal_private_clue" and tgt["p"]["clues"]:
                    k["p"]["clues"].append(tgt["p"]["clues"].pop())
                    tgt["events"].append(("lost", "a private clue", False))
                elif sab["effect"] == "steal_personal_item" and tgt["p"]["items"]:
                    k["p"]["items"].append(tgt["p"]["items"].pop())
                    tgt["events"].append(("lost", "an item", False))
                elif sab["effect"] == "drain_luck":
                    tgt["p"]["luck"] -= 1
            elif sab["effect"] == "destroy_party_clue" and party["clues"]:
                party["clues"].pop()
            elif sab["effect"] == "destroy_party_item" and party["items"]:
                party["items"].pop()
            elif sab["effect"] == "mislead_group":
                red += 1
            exposures.append(fill(k["o"]["exposure"], k["p"]["name"], k["target"]["name"] if k["target"] else None))
        clamp()
        died = []
        for k in picks:  # deaths
            o, p = k["o"], k["p"]
            if o["risk"] != "risky" or k["ok"]:
                continue
            gate = o.get("lethal_if_stat_below")
            if o["lethal_on_fail"] or luck0[p["id"]] == 0 or (gate is not None and stat0[p["id"]] < gate):
                p["alive"] = False
                died.append(p)
                party["clues"] += [c for c in p["clues"] if c not in party["clues"]]
                party["items"] += [i for i in p["items"] if i not in party["items"]]
                p["clues"], p["items"] = [], []

        for k in picks:
            delta = k["p"]["luck"] - luck0[k["p"]["id"]]
            if delta and k["p"]["alive"]:
                k["events"].append(("luck_up" if delta > 0 else "luck_down", None, False))
        say("")
        for k in picks:
            tgt = k["target"]["name"] if k["target"] else None
            say(f"TV: {fill(k['o']['recap'], k['p']['name'], tgt)}")
            blk = k["o"].get("on_death") if k["p"] in died else (k["o"]["on_success"] if k["ok"] else k["o"]["on_failure"])
            say(f"TV: {fill(blk['narration'], k['p']['name'], tgt)}")
        for line in exposures:
            say(f"TV! {line}")
        for p in died:
            say(f"TV! {p['name']} is gone.")
        if phones:
            for k in picks:
                ev = k["events"] or [("nothing", None, False)]
                say(f"  result {k['p']['name']}: " + "; ".join(
                    f"found {x}{' (everyone)' if g else ''}" if kind == "found" else
                    "shared what you knew" if kind == "shared" else f"someone took {x}" if kind == "lost" else
                    "luck on your side" if kind == "luck_up" else "luck slipping" if kind == "luck_down" else
                    "nothing came of it" for kind, x, g in ev))
        say("  evidence: " + (" / ".join([clues[c]["text"] for c in party["clues"]] +
                                         [items[i]["name"] for i in party["items"]]) or "none"))

        living = [p for p in players if p["alive"]]
        if not living or (killer and len(living) == 1 and living[0] is killer and len(players) > 1):
            e = t["endings"]["culprit_escapes"]
            say(f"\nENDING (early): {e['title']}\n{fill(e['epilogue'])}")
            return out
        rh = sum(1 for k in picks if k["o"]["follows_red_herring"])
        if rnd <= C.PIVOT_ROUND and rh * 2 >= len(picks):
            red += 1
        if rnd < C.PIVOT_ROUND:
            counts = {}
            for k in picks:
                n, s = counts.get(k["o"]["leads_to"], (0, 0))
                counts[k["o"]["leads_to"]] = (n + 1, s + (1 if k["ok"] else 0))
            tbo = scenes[scene_id]["tie_break_order"]
            scene_id = max(counts, key=lambda sid: (counts[sid], -tbo.index(sid) if sid in tbo else -99))
        elif rnd == C.PIVOT_ROUND:
            keys = {c for c in party["clues"] + [c for p in living for c in p["clues"]] if clues[c]["kind"] == "key"}
            dec = next(i for i, it in items.items() if it["decisive"])
            has = dec in party["items"] or any(dec in p["items"] for p in living)
            track = "solved" if len(keys) >= D["key_needed"] and has else "wrong" if red >= C.RED_HERRING_COMMITS_FOR_WRONG else "escape"
            scene_id = f"r9_{track}"
            say(f"  (hidden track locked: {track})")
        elif rnd == C.PIVOT_ROUND + 1:
            scene_id = f"r10_{track}"
        else:
            landed = any(k["o"]["decisive"] and k["ok"] for k in picks)
            ev = w["finale"]["proof"] if track == "solved" and landed else w["finale"]["frame"] if track == "wrong" else None
            if ev:
                say(f"TV: {fill(ev)}")
            break
        say(f"\n## {clock['values'][rnd]} {clock['unit']}\nTV: {fill(scenes[scene_id]['intro'])}")

    # The vote: random, but players lean on the evidence the way a room would.
    living = [p for p in players if p["alive"]]
    pool = sus if suspects_mode else sus
    votes = {}
    for p in living:
        choices = [s for s in pool if not (p["suspect"] and s["id"] == p["suspect"]["id"])]
        if p is killer:
            choice = rng.choice([s for s in choices if s["id"] != w["killer_id"]] or choices)
        elif track == "solved" and rng.random() < 0.7:
            choice = next((s for s in choices if s["id"] == w["killer_id"]), rng.choice(choices))
        elif track == "wrong" and rng.random() < 0.6:
            choice = next((s for s in choices if s["id"] == w["finale"]["frame_points_to"]), rng.choice(choices))
        else:
            choice = rng.choice(choices)
        votes[p["name"]] = choice
    say("\nVOTE: " + ", ".join(f"{v} → {s['name']}" for v, s in votes.items()))
    tally = {}
    for s in votes.values():
        tally[s["id"]] = tally.get(s["id"], 0) + 1
    top = max(tally.values())
    leaders = [sid for sid, n in tally.items() if n == top]
    if len(leaders) > 1:
        key, accused = "culprit_escapes", None
    else:
        accused = next(s for s in sus if s["id"] == leaders[0])
        key = "solved" if accused["id"] == w["killer_id"] else "wrong_culprit"
    e = t["endings"][key]
    say(f"ENDING: {e['title']}\n{fill(e['epilogue'], accused=accused['name'] if accused else None)}")
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--phones", action="store_true", help="also print each phone's options and result")
    a = ap.parse_args()
    print("\n".join(play(json.loads(Path(a.path).read_text()), a.seed, a.phones)))
