#!/usr/bin/env python3
"""Generate a structurally valid story-tree scaffold with TODO text.

Usage:
  python skeleton.py --difficulty medium --players 4 --role suspects --out tree.json

The scaffold already satisfies every structural rule in validate_tree.py (ids, branch-and-merge
links, clue/item placement, sabotage, lethal option, killer variants, gated finale). Fill in
the TODO text and adapt content; keep ids and links consistent, then re-run the validator.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import constants as C  # noqa: E402

T = "TODO"


def opt(rid, slot, tag, risk="normal", tier="easy", **kw):
    o = {
        "id": f"{rid}_{slot}", "slot": slot, "text": T, "recap": "{player} " + T,
        "tag": tag, "risk": risk, "tier": tier,
        "lethal_on_fail": False, "lethal_if_stat_below": None,
        "follows_red_herring": False, "decisive": False, "bonus_clue_id": None, "leads_to": None,
        "on_success": {"narration": T, "effects": []},
        "on_failure": {"narration": T, "effects": []},
    }
    o.update(kw)
    return o


def build(difficulty, players, role):
    D = C.DIFFICULTY[difficulty]
    keys = [f"k{i + 1}" for i in range(D["key_authored"])]
    reds = [f"h{i + 1}" for i in range(D["red_herrings"])]
    n_sus = players if role == "suspects" else D["npc_suspects"]
    sus = [{"id": f"s{i + 1}", "name": T, "description": T, "public_alibi": T, "motive": T,
            "player_slot": (i + 1) if role == "suspects" else None} for i in range(n_sus)]
    killer = "s2"
    clues = [{"id": k, "kind": "key", "clarity": "subtle", "text": T, "points_to": killer} for k in keys]
    clues += [{"id": h, "kind": "red_herring", "clarity": "obvious", "text": T, "points_to": "s1"} for h in reds]
    items = [{"id": "decisive_item", "name": T, "description": T, "luck_on_grant": 0, "decisive": True},
             {"id": "lucky_item", "name": T, "description": T, "luck_on_grant": 1, "decisive": False}]

    def grant_clue(cid):
        return {"type": "grant_clue", "clue_id": cid}

    scenes = []
    for r in range(1, 9):
        labels = ["a"] if r == 1 else ["a", "b"]
        for lab in labels:
            rid = f"r{r}_{lab}"
            A = opt(rid, "A", "group", tier="easy")
            B = opt(rid, "B", "solo", tier="easy")
            Cc = opt(rid, "C", "group", tier="medium")
            Dd = opt(rid, "D", "solo", tier="medium")
            if r - 1 < len(keys):
                A["on_success"]["effects"].append(grant_clue(keys[r - 1]))
            if r == 3:
                Cc["on_success"]["effects"].append({"type": "grant_item", "item_id": "lucky_item"})
            if r == 5:
                Cc["on_success"]["effects"].append({"type": "grant_item", "item_id": "decisive_item"})
            if 2 <= r <= 5:
                Dd["follows_red_herring"] = True
                Dd["on_success"]["effects"].append(grant_clue(reds[(r - 2) % len(reds)]))
            if r == 4:
                B["sabotage"] = {"scope": "player", "effect": "steal_private_clue"}
                B["exposure"] = "{player} " + T
            if r == 6:
                B["sabotage"] = {"scope": "group", "effect": "mislead_group"}
                B["exposure"] = "{player} " + T
            if r == 7:
                Dd.update(risk="risky", tier="medium", lethal_on_fail=True,
                          on_death={"narration": T})
            nxt = f"r{r + 1}_"
            if r < 8:
                for o in (A, B):
                    o["leads_to"] = nxt + "a"
                for o in (Cc, Dd):
                    o["leads_to"] = nxt + "b"
            sc = {"id": rid, "round": r, "intro": T, "options": [A, B, Cc, Dd],
                  "tie_break_order": ["A", "B", "C", "D"], "variants": []}
            if role == "suspects" and r in (3, 5, 7):
                kv = opt(rid, "B", "solo", tier="medium",
                         sabotage={"scope": "group", "effect": "destroy_party_clue"},
                         exposure="{player} " + T)
                kv["id"] = f"{rid}_B_killer"
                if r < 8:
                    kv["leads_to"] = nxt + "a"
                sc["variants"].append({"slot": "B", "requires": {"role": "killer"}, "option": kv})
            scenes.append(sc)

    for r in (9, 10):
        for tr in C.TRACKS:
            rid = f"r{r}_{tr}"
            os_ = [opt(rid, s, g, tier=t_) for s, g, t_ in
                   (("A", "group", "easy"), ("B", "solo", "easy"), ("C", "group", "medium"), ("D", "solo", "medium"))]
            if r == 9:
                os_[0]["on_success"]["effects"].append({"type": "share_private_clues"})
                for o in os_:
                    o["leads_to"] = f"r10_{tr}"
            sc = {"id": rid, "round": r, "intro": T, "options": os_,
                  "tie_break_order": ["A", "B", "C", "D"], "variants": []}
            if r == 10 and tr == "solved":
                dv = opt(rid, "A", "group", risk="normal", tier="medium", decisive=True)
                dv["id"] = f"{rid}_A_decisive"
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
                  "clues": clues, "items": items},
        "scenes": scenes,
        "endings": {"solved": {"title": T, "epilogue": T},
                    "wrong_culprit": {"title": T, "epilogue": T},
                    "culprit_escapes": {"title": T, "epilogue": T, "epilogue_if_downgraded": T}},
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
