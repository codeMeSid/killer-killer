#!/usr/bin/env python3
"""Generate a structurally valid story-tree scaffold with TODO text.

Usage:
  python skeleton.py --difficulty medium --players 4 --role suspects --out tree.json

The scaffold already satisfies every structural rule in validate_tree.py (ids, branch-and-merge
links, personal options per character, clue/item placement, sabotage, lethal option, the gated
decisive variant, finale evidence). Fill in the TODO text and adapt content; keep ids and links
consistent, then re-run the validator.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import constants as C  # noqa: E402

T = "TODO"
LUCK = {"type": "luck", "delta": 1}


def opt(oid, slot, tag, risk="normal", tier="easy", **kw):
    o = {
        "id": oid, "slot": slot, "text": T, "recap": "{player} " + T,
        "tag": tag, "risk": risk, "tier": tier,
        "lethal_on_fail": False, "lethal_if_stat_below": None,
        "follows_red_herring": False, "decisive": False, "bonus_clue_id": None, "leads_to": None,
        "on_success": {"narration": "{player} " + T, "effects": []},
        "on_failure": {"narration": "{player} " + T, "effects": []},
    }
    o.update(kw)
    return o


def build(difficulty, players, role):
    D = C.DIFFICULTY[difficulty]
    keys = [f"k{i + 1}" for i in range(D["key_authored"])]
    reds = [f"h{i + 1}" for i in range(D["red_herrings"])]
    n_sus = players if role == "suspects" else D["npc_suspects"]
    sus = [{"id": f"s{i + 1}", "name": T, "description": T, "public_alibi": T, "motive": T, "secret": T,
            "player_slot": (i + 1) if role == "suspects" else None} for i in range(n_sus)]
    killer = "s2"
    killer_slot = 2 if role == "suspects" else None
    clues = [{"id": k, "kind": "key", "clarity": "subtle", "text": T, "points_to": killer} for k in keys]
    clues += [{"id": h, "kind": "red_herring", "clarity": "obvious", "text": T, "points_to": "s1"} for h in reds]
    items = [{"id": "decisive_item", "name": T, "description": T, "luck_on_grant": 0, "decisive": True},
             {"id": "lucky_item", "name": T, "description": T, "luck_on_grant": 1, "decisive": False}]

    def grant_clue(cid):
        return {"type": "grant_clue", "clue_id": cid}

    def four(rid, r, p_slot):
        """One character's four options for a round 1-8 scene (p_slot None = shared, investigators mode)."""
        pre = f"{rid}_p{p_slot}" if p_slot else rid
        A = opt(f"{pre}_A", "A", "group", tier="easy")
        B = opt(f"{pre}_B", "B", "solo", tier="easy")
        Cc = opt(f"{pre}_C", "C", "group", tier="medium")
        Dd = opt(f"{pre}_D", "D", "solo", tier="medium")
        A["on_success"]["effects"].append(grant_clue(keys[r - 1]) if r - 1 < len(keys) else dict(LUCK))
        B["on_success"]["effects"].append(dict(LUCK))
        if r == 3:
            Cc["on_success"]["effects"].append({"type": "grant_item", "item_id": "lucky_item"})
        elif r == 5:
            Cc["on_success"]["effects"].append({"type": "grant_item", "item_id": "decisive_item"})
        else:
            Cc["on_success"]["effects"].append(dict(LUCK))
        if 2 <= r <= 5:
            Dd["follows_red_herring"] = True
            Dd["on_success"]["effects"].append(grant_clue(reds[(r - 2) % len(reds)]))
        else:
            Dd["on_success"]["effects"].append(dict(LUCK))
        # Sabotage: the killer's own character in suspects mode, everyone in investigators mode.
        sab = {3: ("group", "destroy_party_clue"), 4: ("player", "steal_private_clue"),
               5: ("group", "destroy_party_clue"), 6: ("group", "mislead_group"), 7: ("player", "drain_luck")}
        if r in sab and (p_slot == killer_slot if role == "suspects" else r in (4, 6)):
            B["sabotage"] = {"scope": sab[r][0], "effect": sab[r][1]}
            B["exposure"] = "{player} " + T
        if r == 7:
            Dd.update(risk="risky", tier="medium", lethal_on_fail=True, on_death={"narration": "{player} " + T})
        if r < 8:
            nxt = f"r{r + 1}_"
            for o in (A, B):
                o["leads_to"] = nxt + "a"
            for o in (Cc, Dd):
                o["leads_to"] = nxt + "b"
        return [A, B, Cc, Dd]

    def finale_four(rid, r, tr, p_slot):
        pre = f"{rid}_p{p_slot}" if p_slot else rid
        os_ = [opt(f"{pre}_{s}", s, g, tier=t_) for s, g, t_ in
               (("A", "group", "easy"), ("B", "solo", "easy"), ("C", "group", "medium"), ("D", "solo", "medium"))]
        for o in os_:
            o["on_success"]["effects"].append(dict(LUCK))
        if r == 9:
            os_[0]["on_success"]["effects"] = [{"type": "share_private_clues"}]
            for o in os_:
                o["leads_to"] = f"r10_{tr}"
        return os_

    slots = list(range(1, players + 1)) if role == "suspects" else [None]

    def options_block(make):
        if role == "suspects":
            return {"personal": {str(p): make(p) for p in slots}}
        return {"options": make(None)}

    scenes = []
    for r in range(1, 9):
        for lab in (["a"] if r == 1 else ["a", "b"]):
            rid = f"r{r}_{lab}"
            sc = {"id": rid, "round": r, "intro": T, **options_block(lambda p, rid=rid, r=r: four(rid, r, p)),
                  "tie_break_order": [f"r{r + 1}_a", f"r{r + 1}_b"] if r < 8 else [], "variants": []}
            scenes.append(sc)

    for r in (9, 10):
        for tr in C.TRACKS:
            rid = f"r{r}_{tr}"
            sc = {"id": rid, "round": r, "intro": T,
                  **options_block(lambda p, rid=rid, r=r, tr=tr: finale_four(rid, r, tr, p)),
                  "tie_break_order": [], "variants": []}
            if r == 10 and tr == "solved":
                dv = opt(f"{rid}_A_decisive", "A", "group", tier="medium", decisive=True)
                sc["variants"].append({"slot": "A",
                                       "requires": {"items": ["decisive_item"], "min_stat": D["key_needed"]},
                                       "option": dv})
            scenes.append(sc)

    return {
        "schema": C.SCHEMA_ID,
        "meta": {"title": T, "setting_id": "sample", "difficulty": difficulty, "player_count": players,
                 "player_role": role, "victim": {"name": T, "description": T}, "tone": T,
                 "content_rating": "pg13", "premise": T},
        "rules": json.loads(json.dumps(C.RULES_BLOCK)),
        "world": {"clock": {"label": T, "unit": T, "values": [T] * C.ROUNDS},
                  "suspects": sus, "killer_id": killer, "killer_method": T,
                  "clues": clues, "items": items,
                  "finale": {"proof": T, "frame": T, "frame_points_to": "s1"}},
        "scenes": scenes,
        "endings": {"solved": {"title": T, "epilogue": T},
                    "wrong_culprit": {"title": T, "epilogue": "{accused} " + T},
                    "culprit_escapes": {"title": T, "epilogue": T}},
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--difficulty", choices=list(C.DIFFICULTY), default="medium")
    ap.add_argument("--players", type=int, default=4)
    ap.add_argument("--role", choices=C.ROLES, default="investigators")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    if not C.PLAYERS_MIN <= a.players <= C.PLAYERS_MAX:
        ap.error(f"players must be {C.PLAYERS_MIN}-{C.PLAYERS_MAX}")
    Path(a.out).write_text(json.dumps(build(a.difficulty, a.players, a.role), indent=2))
    print(f"wrote {a.out}")
