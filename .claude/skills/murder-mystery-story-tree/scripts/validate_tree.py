#!/usr/bin/env python3
"""Validate a murder-mystery story tree, or catalogue entries.

Usage:
  python validate_tree.py tree.json [--allow-todo]
  python validate_tree.py --catalogue assets/catalogue.json
  python validate_tree.py --catalogue-entry entry.json
  python validate_tree.py [tree.json] --lexicon lexicon.json

Exit code 0 = no errors (warnings allowed), 1 = errors.
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import constants as C  # noqa: E402

SLUG = re.compile(r"^[a-z0-9][a-z0-9_-]*$")
SCENE_ID = re.compile(r"^r(\d+)_([a-z0-9]+)$")
PLACEHOLDER = re.compile(r"\{([^{}]*)\}")


class Report:
    def __init__(self):
        self.errors, self.warnings = [], []

    def err(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)


def nonempty(x):
    return isinstance(x, str) and bool(x.strip())


def is_int(x):
    return isinstance(x, int) and not isinstance(x, bool)


def strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for v in o.values():
            yield from strings(v)
    elif isinstance(o, list):
        for v in o:
            yield from strings(v)


# ---------------------------------------------------------------- catalogue
def check_entry(e, rep, where):
    if not isinstance(e, dict):
        rep.err(f"{where}: entry must be an object")
        return
    for k in ("id", "name", "premise", "tone"):
        if not nonempty(e.get(k)):
            rep.err(f"{where}: missing or empty '{k}'")
    if nonempty(e.get("id")) and not SLUG.match(e["id"]):
        rep.err(f"{where}: id must be a lowercase slug")
    if e.get("player_role") not in C.ROLES:
        rep.err(f"{where}: player_role must be one of {C.ROLES}")
    if e.get("content_rating") not in C.RATINGS:
        rep.err(f"{where}: content_rating must be one of {C.RATINGS}")
    clock = e.get("clock")
    if clock is not None:
        ok = (isinstance(clock, dict) and nonempty(clock.get("label")) and nonempty(clock.get("unit"))
              and isinstance(clock.get("start"), (int, float)) and isinstance(clock.get("end"), (int, float)))
        if not ok:
            rep.err(f"{where}: clock needs label, unit, numeric start and end")


def check_catalogue(data, rep):
    entries = data.get("entries") if isinstance(data, dict) else None
    if not isinstance(entries, list) or not entries:
        rep.err("catalogue must be {\"entries\": [ ... ]} with at least one entry")
        return
    ids = set()
    for i, e in enumerate(entries):
        check_entry(e, rep, f"entries[{i}]")
        if isinstance(e, dict) and e.get("id") in ids:
            rep.err(f"entries[{i}]: duplicate id {e.get('id')!r}")
        if isinstance(e, dict):
            ids.add(e.get("id"))


# --------------------------------------------------------------------- tree
def check_effect(ef, where, tag, ctx, rep):
    if not isinstance(ef, dict) or ef.get("type") not in C.EFFECT_TYPES:
        rep.err(f"{where}: effect type must be one of {C.EFFECT_TYPES}")
        return
    t = ef["type"]
    if t == "grant_clue" and ef.get("clue_id") not in ctx["clues"]:
        rep.err(f"{where}: grant_clue references unknown clue {ef.get('clue_id')!r}")
    if t == "grant_item" and ef.get("item_id") not in ctx["items"]:
        rep.err(f"{where}: grant_item references unknown item {ef.get('item_id')!r}")
    if t == "luck" and not (is_int(ef.get("delta")) and ef["delta"] != 0 and -2 <= ef["delta"] <= 2):
        rep.err(f"{where}: luck delta must be a non-zero integer from -2 to 2")
    if t == "share_private_clues" and tag != "group":
        rep.err(f"{where}: share_private_clues is only allowed on group-tagged options")


SENTENCE = re.compile(r"(?<=[.!?…])\s+")


def check_prose(s, where, rep, crowd=True):
    """Readability warnings for a line shown on the TV."""
    if not isinstance(s, str):
        return
    low = s.lower()
    if crowd:
        for w in C.CROWD_WORDS:
            if w in low:
                rep.warn(f"{where}: crowd word {w.strip()!r} claims what others did; it can clash with their picks ({s!r})")
                break
    for c in C.CLICHES:
        if c in low:
            rep.warn(f"{where}: cliché {c!r}")
    for sent in SENTENCE.split(s):
        if len(sent.split()) > C.MAX_SENTENCE_WORDS:
            rep.warn(f"{where}: sentence over {C.MAX_SENTENCE_WORDS} words is hard to read off a TV ({sent!r})")


def check_option(o, where, slot, ctx, rep):
    if not isinstance(o, dict):
        rep.err(f"{where}: option must be an object")
        return
    for k in ("id", "slot", "text", "recap", "tag", "risk", "tier", "lethal_on_fail",
              "lethal_if_stat_below", "follows_red_herring", "decisive", "bonus_clue_id",
              "leads_to", "on_success", "on_failure"):
        if k not in o:
            rep.err(f"{where}: option missing '{k}'")
    if o.get("slot") != slot:
        rep.err(f"{where}: slot must be {slot!r}")
    oid = o.get("id")
    if not nonempty(oid):
        rep.err(f"{where}: option id missing")
    elif oid in ctx["opt_ids"]:
        rep.err(f"{where}: duplicate option id {oid!r}")
    else:
        ctx["opt_ids"].add(oid)
    for k in ("text", "recap"):
        if not nonempty(o.get(k)):
            rep.err(f"{where}: '{k}' must be non-empty")
    if "{player}" not in str(o.get("recap", "")):
        rep.err(f"{where}: recap must contain {{player}}")
    check_prose(o.get("recap"), f"{where}.recap", rep)
    text = o.get("text")
    if nonempty(text):
        if len(text.split()) > C.MAX_OPTION_WORDS:
            rep.warn(f"{where}: option text over {C.MAX_OPTION_WORDS} words ({text!r})")
        if text[0].isupper() or text.rstrip()[-1] in ".!?":
            rep.warn(f"{where}: option text must complete 'You will …': lowercase start, no end mark ({text!r})")
    if o.get("tag") not in C.TAGS:
        rep.err(f"{where}: tag must be one of {C.TAGS}")
    if o.get("risk") not in C.RISKS:
        rep.err(f"{where}: risk must be one of {C.RISKS}")
    if o.get("tier") not in C.TIERS:
        rep.err(f"{where}: tier must be one of {C.TIERS}")
    lof, lisb = o.get("lethal_on_fail"), o.get("lethal_if_stat_below")
    if not isinstance(lof, bool):
        rep.err(f"{where}: lethal_on_fail must be true/false")
    if lisb is not None and not (is_int(lisb) and 1 <= lisb <= C.STAT_MAX):
        rep.err(f"{where}: lethal_if_stat_below must be null or 1-{C.STAT_MAX}")
    if o.get("risk") != "risky" and (lof is True or lisb is not None):
        rep.err(f"{where}: only risky options can be lethal")
    if o.get("risk") == "risky":
        od = o.get("on_death")
        if not (isinstance(od, dict) and nonempty(od.get("narration"))):
            rep.err(f"{where}: risky options need on_death.narration")
        elif "{player}" not in od["narration"]:
            rep.err(f"{where}: on_death.narration must name the actor with {{player}}")
    for k in ("follows_red_herring", "decisive"):
        if not isinstance(o.get(k), bool):
            rep.err(f"{where}: {k} must be true/false")
    bc = o.get("bonus_clue_id")
    if bc is not None and not (bc in ctx["clues"] and ctx["clues"][bc].get("kind") == "key"):
        rep.err(f"{where}: bonus_clue_id must be null or a key clue id")
    for name in ("on_success", "on_failure"):
        blk = o.get(name)
        if not (isinstance(blk, dict) and nonempty(blk.get("narration")) and isinstance(blk.get("effects"), list)):
            rep.err(f"{where}: {name} needs narration and an effects list")
            continue
        for j, ef in enumerate(blk["effects"]):
            check_effect(ef, f"{where}.{name}.effects[{j}]", o.get("tag"), ctx, rep)
        if "{player}" not in blk["narration"]:
            rep.err(f"{where}: {name}.narration must name the actor with {{player}} (lines are read interleaved)")
        check_prose(blk["narration"], f"{where}.{name}", rep)
    succ = o.get("on_success")
    if (isinstance(succ, dict) and not succ.get("effects") and not o.get("sabotage") and o.get("decisive") is not True):
        rep.err(f"{where}: on_success changes nothing; every option needs an effect, a sabotage, or to be decisive")
    sab = o.get("sabotage")
    if sab is not None:
        if o.get("tag") != "solo":
            rep.err(f"{where}: sabotage options must be solo-tagged")
        scope = sab.get("scope") if isinstance(sab, dict) else None
        eff = sab.get("effect") if isinstance(sab, dict) else None
        valid = C.SAB_PLAYER if scope == "player" else C.SAB_GROUP if scope == "group" else None
        if valid is None or eff not in valid:
            rep.err(f"{where}: sabotage needs scope player|group and a matching effect "
                    f"(player: {C.SAB_PLAYER}; group: {C.SAB_GROUP})")
        if "{player}" not in str(o.get("exposure", "")):
            rep.err(f"{where}: sabotage options need an 'exposure' line containing {{player}}")
        check_prose(o.get("exposure"), f"{where}.exposure", rep, crowd=False)


def option_sets(scene):
    """(label, options) per player: one shared set in investigators mode, one per player_slot in suspects mode."""
    if isinstance(scene.get("personal"), dict):
        return [(f"p{k}", v) for k, v in sorted(scene["personal"].items())]
    return [("", scene.get("options"))]


def option_list(scene, skip_slot=None):
    """Every option in a scene, variants included; `skip_slot` leaves out one character's own options."""
    for label, opts in option_sets(scene):
        if skip_slot is not None and label == f"p{skip_slot}":
            continue
        for o in opts if isinstance(opts, list) else []:
            if isinstance(o, dict):
                yield o
    for v in scene.get("variants", []) or []:
        if isinstance(v, dict) and isinstance(v.get("option"), dict):
            if skip_slot is not None and v.get("player_slot") == skip_slot:
                continue
            yield v["option"]


def check_tree(t, allow_todo, rep):
    if not isinstance(t, dict):
        rep.err("tree must be a JSON object")
        return
    if t.get("schema") != C.SCHEMA_ID:
        rep.err(f"schema must be {C.SCHEMA_ID!r}")

    # placeholders / TODO
    for s in strings(t):
        if not allow_todo and "TODO" in s:
            rep.err("unfilled TODO text found (use --allow-todo only on skeletons)")
            break
    for s in strings(t):
        for ph in PLACEHOLDER.findall(s):
            if ph not in C.PLACEHOLDERS:
                rep.err(f"unknown placeholder {{{ph}}} (allowed: {sorted(C.PLACEHOLDERS)})")
                break
    for s in strings({k: v for k, v in t.items() if k != "endings"}):
        for ph in C.ENDING_ONLY_PLACEHOLDERS:
            if "{" + ph + "}" in s:
                rep.err(f"{{{ph}}} is only known once the vote is counted; use it in endings only ({s!r})")

    meta = t.get("meta") or {}
    for k in ("title", "setting_id", "premise", "tone"):
        if not nonempty(meta.get(k)):
            rep.err(f"meta.{k} missing")
    diff = meta.get("difficulty")
    role = meta.get("player_role")
    n = meta.get("player_count")
    if diff not in C.DIFFICULTY:
        rep.err(f"meta.difficulty must be one of {tuple(C.DIFFICULTY)}")
        return
    if role not in C.ROLES:
        rep.err(f"meta.player_role must be one of {C.ROLES}")
        return
    if not (is_int(n) and C.PLAYERS_MIN <= n <= C.PLAYERS_MAX):
        rep.err(f"meta.player_count must be {C.PLAYERS_MIN}-{C.PLAYERS_MAX}")
        return
    if meta.get("content_rating") not in C.RATINGS:
        rep.err(f"meta.content_rating must be one of {C.RATINGS}")
    vic = meta.get("victim") or {}
    if not (nonempty(vic.get("name")) and nonempty(vic.get("description"))):
        rep.err("meta.victim needs name and description")
    D = C.DIFFICULTY[diff]

    if t.get("rules") != C.RULES_BLOCK:
        rep.err("rules block must exactly match the engine constants (copy it from the skeleton)")

    # ---- world
    world = t.get("world") or {}
    clock = world.get("clock") or {}
    vals = clock.get("values")
    if not (nonempty(clock.get("label")) and isinstance(vals, list) and len(vals) == C.ROUNDS
            and all(nonempty(v) for v in vals)):
        rep.err(f"world.clock needs a label and exactly {C.ROUNDS} values (one per round; round 10 is the deadline)")

    suspects = world.get("suspects") or []
    sus_ids = [s.get("id") for s in suspects if isinstance(s, dict)]
    if len(set(sus_ids)) != len(sus_ids) or not all(nonempty(i) for i in sus_ids):
        rep.err("suspects need unique non-empty ids")
    for s in suspects:
        if "short_name" in (s or {}) and not nonempty(s["short_name"]):
            rep.err(f"suspect {s.get('id')!r}: short_name must be a non-empty string when present")
        for k in ("name", "description", "public_alibi", "motive") + (("secret",) if role == "suspects" else ()):
            if not nonempty((s or {}).get(k)):
                rep.err(f"suspect {s.get('id')!r} missing {k}")
    killer_id = world.get("killer_id")
    if killer_id not in sus_ids:
        rep.err("world.killer_id must be a suspect id")
    if not nonempty(world.get("killer_method")):
        rep.err("world.killer_method missing")
    if role == "suspects":
        if len(suspects) != n:
            rep.err(f"suspects mode: need exactly {n} suspects (one per player), found {len(suspects)}")
        slots = sorted(s.get("player_slot") for s in suspects if is_int(s.get("player_slot")))
        if slots != list(range(1, n + 1)):
            rep.err(f"suspects mode: player_slot values must be 1..{n}, each used once")
    else:
        if len(suspects) != D["npc_suspects"]:
            rep.err(f"{diff} investigators mode: need {D['npc_suspects']} NPC suspects, found {len(suspects)}")
        if any(s.get("player_slot") is not None for s in suspects):
            rep.err("investigators mode: player_slot must be null for every suspect")

    clues = {}
    for c in world.get("clues") or []:
        if not isinstance(c, dict) or not nonempty(c.get("id")):
            rep.err("every clue needs an id")
            continue
        if c["id"] in clues:
            rep.err(f"duplicate clue id {c['id']!r}")
        clues[c["id"]] = c
        if c.get("kind") not in ("key", "red_herring"):
            rep.err(f"clue {c['id']}: kind must be key or red_herring")
        if c.get("clarity") not in C.CLARITY:
            rep.err(f"clue {c['id']}: clarity must be one of {C.CLARITY}")
        if not nonempty(c.get("text")):
            rep.err(f"clue {c['id']}: text missing")
        if c.get("kind") == "key" and c.get("points_to") != killer_id:
            rep.err(f"clue {c['id']}: key clues must point to the killer")
        if c.get("kind") == "red_herring" and (c.get("points_to") == killer_id or c.get("points_to") not in sus_ids):
            rep.err(f"clue {c['id']}: red herrings must point to a non-killer suspect")
    n_key = sum(1 for c in clues.values() if c.get("kind") == "key")
    n_red = sum(1 for c in clues.values() if c.get("kind") == "red_herring")
    if n_key != D["key_authored"]:
        rep.err(f"{diff}: need {D['key_authored']} key clues, found {n_key}")
    if n_red != D["red_herrings"]:
        rep.err(f"{diff}: need {D['red_herrings']} red-herring clues, found {n_red}")

    items = {}
    for it in world.get("items") or []:
        if not isinstance(it, dict) or not nonempty(it.get("id")):
            rep.err("every item needs an id")
            continue
        if it["id"] in items:
            rep.err(f"duplicate item id {it['id']!r}")
        items[it["id"]] = it
        if not (nonempty(it.get("name")) and nonempty(it.get("description"))):
            rep.err(f"item {it['id']}: name/description missing")
        if it.get("luck_on_grant") not in (0, 1):
            rep.err(f"item {it['id']}: luck_on_grant must be 0 or 1")
        if not isinstance(it.get("decisive"), bool):
            rep.err(f"item {it['id']}: decisive must be true/false")
    decisive = [i for i, it in items.items() if it.get("decisive") is True]
    if len(decisive) != 1:
        rep.err("exactly one item must be decisive")
    decisive_id = decisive[0] if decisive else None

    # finale evidence: the TV shows `proof` (solved track, decisive move landed) or `frame` (wrong track)
    fin = world.get("finale") or {}
    if not (nonempty(fin.get("proof")) and nonempty(fin.get("frame"))):
        rep.err("world.finale needs proof and frame (the evidence shown before the vote)")
    framed = {c.get("points_to") for c in clues.values() if c.get("kind") == "red_herring"}
    if fin.get("frame_points_to") not in framed:
        rep.err("world.finale.frame_points_to must be a suspect a red-herring clue points to")
    for k in ("proof", "frame"):
        check_prose(fin.get(k), f"world.finale.{k}", rep, crowd=False)
    killer_slot = next((s.get("player_slot") for s in suspects if isinstance(s, dict) and s.get("id") == killer_id), None)

    # ---- scenes
    scenes, by_round = {}, {}
    ctx = {"clues": clues, "items": items, "opt_ids": set()}
    for sc in t.get("scenes") or []:
        sid = sc.get("id") if isinstance(sc, dict) else None
        m = SCENE_ID.match(sid or "")
        if not m:
            rep.err(f"bad scene id {sid!r} (expected r<round>_<label>)")
            continue
        if sid in scenes:
            rep.err(f"duplicate scene id {sid!r}")
            continue
        if sc.get("round") != int(m.group(1)):
            rep.err(f"{sid}: round field must equal {int(m.group(1))}")
        scenes[sid] = sc
        by_round.setdefault(int(m.group(1)), []).append(sid)

    for r in range(1, C.ROUNDS + 1):
        cnt = len(by_round.get(r, []))
        if r == 1 and cnt != 1:
            rep.err("round 1 must have exactly one scene")
        elif r in (9, 10):
            want = {f"r{r}_{tr}" for tr in C.TRACKS}
            if set(by_round.get(r, [])) != want:
                rep.err(f"round {r} must have exactly the scenes {sorted(want)} (one per ending track)")
        elif 2 <= r <= 8 and not 1 <= cnt <= 3:
            rep.err(f"round {r} must have 1-3 scenes (branch-and-merge), found {cnt}")

    key_ids = {i for i, c in clues.items() if c.get("kind") == "key"}
    red_ids = set(clues) - key_ids
    granted = set()
    group_sab = player_sab = killer_sab = rh_options = 0
    player_slots = {str(i) for i in range(1, n + 1)}

    for sid, sc in scenes.items():
        r = int(SCENE_ID.match(sid).group(1))
        if not nonempty(sc.get("intro")):
            rep.err(f"{sid}: intro missing")
        else:
            check_prose(sc["intro"], f"{sid}.intro", rep, crowd=False)
            if len(SENTENCE.split(sc["intro"].strip())) > 3:
                rep.warn(f"{sid}: intro over 3 sentences; set the place, then pose the question")
        if role == "suspects":
            if "options" in sc or not isinstance(sc.get("personal"), dict) or set(sc["personal"]) != player_slots:
                rep.err(f"{sid}: suspects mode needs 'personal' with exactly the keys {sorted(player_slots)} "
                        f"(one set of 4 options per character) and no shared 'options'")
                continue
        elif "personal" in sc or not isinstance(sc.get("options"), list):
            rep.err(f"{sid}: investigators mode needs 4 shared 'options' and no 'personal'")
            continue
        bad = False
        for label, opts in option_sets(sc):
            at = f"{sid}.{label}" if label else sid
            if not (isinstance(opts, list) and len(opts) == 4):
                rep.err(f"{at}: exactly 4 options required")
                bad = True
                continue
            for slot, o in zip(C.SLOTS, opts):
                check_option(o, f"{at}.{slot}", slot, ctx, rep)
            tags = {o.get("tag") for o in opts if isinstance(o, dict)}
            if tags != {"group", "solo"}:
                rep.err(f"{at}: options must include at least one group and one solo option")
            risky = [o for o in opts if isinstance(o, dict) and o.get("risk") == "risky"]
            if len(risky) > D["max_risky"]:
                rep.err(f"{at}: {diff} allows at most {D['max_risky']} risky option(s) per set")
            if sum(1 for o in opts if isinstance(o, dict) and o.get("lethal_on_fail") is True) > 1:
                rep.err(f"{at}: at most one lethal_on_fail option per set")
            for o in opts:
                if isinstance(o, dict) and o.get("decisive") is True:
                    rep.err(f"{at}: decisive options may only appear as gated variants in r10_solved")
                if isinstance(o, dict) and o.get("sabotage") and label == f"p{killer_slot}":
                    killer_sab += 1
        if bad:
            continue

        for vi, v in enumerate(sc.get("variants") or []):
            vw = f"{sid}.variants[{vi}]"
            if v.get("slot") not in C.SLOTS:
                rep.err(f"{vw}: slot must be A-D")
                continue
            ps = v.get("player_slot")
            if ps is not None and not (role == "suspects" and is_int(ps) and 1 <= ps <= n):
                rep.err(f"{vw}: player_slot must be null, or 1-{n} in suspects mode")
            req = v.get("requires")
            if not (isinstance(req, dict) and req and set(req) <= {"items", "min_stat"}):
                rep.err(f"{vw}: requires must use only items, min_stat")
                req = {}
            for it in req.get("items", []) or []:
                if it not in items:
                    rep.err(f"{vw}: requires unknown item {it!r}")
            if "min_stat" in req and not (is_int(req["min_stat"]) and 1 <= req["min_stat"] <= C.STAT_MAX):
                rep.err(f"{vw}: min_stat must be 1-{C.STAT_MAX}")
            check_option(v.get("option"), vw, v["slot"], ctx, rep)
            vo = v.get("option") or {}
            if vo.get("decisive") is True:
                ok = (sid == "r10_solved" and ps is None and req.get("items") == [decisive_id]
                      and req.get("min_stat") == D["key_needed"] and vo.get("tag") == "group"
                      and vo.get("tier") == "medium" and vo.get("risk") == "normal")
                if not ok:
                    rep.err(f"{vw}: decisive variant must be in r10_solved, open to every player (no player_slot), "
                            f"require exactly the decisive item with min_stat {D['key_needed']}, and be group-tagged, "
                            f"tier medium, risk normal")

        # branching: ties go to the order of next scenes in tie_break_order
        targets = {o.get("leads_to") for o in option_list(sc) if o.get("leads_to")}
        tbo = sc.get("tie_break_order")
        if r <= 7 and not (isinstance(tbo, list) and len(tbo) == len(set(tbo)) and set(tbo) == targets):
            rep.err(f"{sid}: tie_break_order must list each scene this scene leads to, once ({sorted(targets)})")
        if r >= 8 and tbo != []:
            rep.err(f"{sid}: tie_break_order must be [] from round 8 on (no leads_to to break ties between)")

        # references and counts
        for o in option_list(sc):
            lt = o.get("leads_to")
            if r <= 7:
                if lt not in scenes or SCENE_ID.match(lt or "") is None or int(SCENE_ID.match(lt).group(1)) != r + 1:
                    rep.err(f"{o.get('id')}: leads_to must be a round-{r + 1} scene")
            elif r == 8:
                if lt is not None:
                    rep.err(f"{o.get('id')}: round 8 options must have leads_to null (the track picks round 9)")
            elif r == 9:
                if lt != "r10_" + sid.split("_")[1]:
                    rep.err(f"{o.get('id')}: round 9 options must lead to {'r10_' + sid.split('_')[1]}")
            elif lt is not None:
                rep.err(f"{o.get('id')}: round 10 options must have leads_to null")
            if o.get("follows_red_herring") is True and r <= C.PIVOT_ROUND:
                rh_options += 1
            elif o.get("follows_red_herring") is True:
                rep.err(f"{o.get('id')}: follows_red_herring only counts up to round {C.PIVOT_ROUND}")
            sab = o.get("sabotage")
            if isinstance(sab, dict):
                if sab.get("scope") == "group":
                    group_sab += 1
                else:
                    player_sab += 1
            for e in (o.get("on_success") or {}).get("effects", []) if isinstance(o.get("on_success"), dict) else []:
                if isinstance(e, dict) and e.get("type") == "grant_clue":
                    granted.add(e.get("clue_id"))
            if o.get("bonus_clue_id"):
                granted.add(o["bonus_clue_id"])

    # ---- reachability (rounds 2-8 must all be reachable from r1)
    if "r1_a" in scenes or by_round.get(1):
        start = by_round[1][0] if by_round.get(1) else None
        seen, stack = {start}, [start]
        while stack:
            cur = stack.pop()
            if int(SCENE_ID.match(cur).group(1)) > 7:
                continue
            for o in option_list(scenes[cur]):
                lt = o.get("leads_to")
                if lt in scenes and lt not in seen:
                    seen.add(lt)
                    stack.append(lt)
        for r in range(2, 9):
            for sid in by_round.get(r, []):
                if sid not in seen:
                    rep.err(f"{sid}: unreachable from round 1")

    # ---- solvability: some path through rounds 1-8 can grant enough key clues + decisive item
    def grants(sc):
        """What a path can grant without relying on the killer's own options."""
        ks, its = set(), set()
        for o in option_list(sc, skip_slot=killer_slot):
            if not isinstance(o.get("on_success"), dict):
                continue
            for e in o["on_success"].get("effects", []):
                if isinstance(e, dict) and e.get("type") == "grant_clue" and e.get("clue_id") in key_ids:
                    ks.add(e["clue_id"])
                if isinstance(e, dict) and e.get("type") == "grant_item":
                    its.add(e.get("item_id"))
            if o.get("bonus_clue_id") in key_ids:
                ks.add(o["bonus_clue_id"])
        return ks, its

    def solvable(sid, ks, its):
        a, b = grants(scenes[sid])
        ks, its = ks | a, its | b
        r = int(SCENE_ID.match(sid).group(1))
        if r == 8:
            return len(ks) >= D["key_needed"] and decisive_id in its
        nxt = {o.get("leads_to") for o in option_list(scenes[sid]) if o.get("leads_to") in scenes}
        return any(solvable(x, ks, its) for x in nxt)

    if by_round.get(1) and not rep.errors:
        if not solvable(by_round[1][0], set(), set()):
            rep.err(f"Solved track is unreachable: no path through rounds 1-8 can grant {D['key_needed']} key clues "
                    f"plus the decisive item")

    for cid in sorted((key_ids | red_ids) - granted):
        rep.warn(f"clue {cid} is never granted by any option")
    if decisive_id and not any(
            e.get("type") == "grant_item" and e.get("item_id") == decisive_id
            for sc in scenes.values() for o in option_list(sc) if isinstance(o.get("on_success"), dict)
            for e in o["on_success"].get("effects", []) if isinstance(e, dict)):
        rep.err("the decisive item is never granted")
    if rh_options < C.RED_HERRING_COMMITS_FOR_WRONG + 1:
        rep.warn(f"only {rh_options} red-herring-following options; the Wrong Culprit track needs at least "
                 f"{C.RED_HERRING_COMMITS_FOR_WRONG + 1} to be reachable")
    if group_sab == 0:
        rep.warn("no group-scope sabotage option anywhere")
    if player_sab == 0:
        rep.warn("no player-scope sabotage option anywhere")
    if role == "suspects" and killer_sab < 3:
        rep.warn("suspects mode: give the killer's character at least 3 sabotage options to cover their tracks")

    # round 9 must let every player pool private clues
    for tr in C.TRACKS:
        sc = scenes.get(f"r9_{tr}")
        if not sc:
            continue
        for label, opts in option_sets(sc):
            has = any(isinstance(o, dict) and o.get("tag") == "group" and isinstance(o.get("on_success"), dict) and any(
                isinstance(e, dict) and e.get("type") == "share_private_clues" for e in o["on_success"].get("effects", []))
                for o in opts or [])
            if not has:
                (rep.err if tr == "solved" else rep.warn)(
                    f"r9_{tr}{'.' + label if label else ''}: needs a group option with a share_private_clues success effect")

    # decisive variant present in r10_solved
    s10 = scenes.get("r10_solved")
    if s10 and not any(o.get("decisive") is True for o in option_list(s10)):
        rep.err("r10_solved needs a gated decisive variant")

    # ---- endings
    ends = t.get("endings") or {}
    if set(ends) != set(C.ENDINGS):
        rep.err(f"endings must be exactly {C.ENDINGS}")
    for k, e in ends.items():
        if not (isinstance(e, dict) and nonempty(e.get("title")) and nonempty(e.get("epilogue"))):
            rep.err(f"endings.{k} needs title and epilogue")
            continue
        if set(e) - {"title", "epilogue"}:
            rep.err(f"endings.{k}: only title and epilogue (v2 dropped epilogue_if_downgraded)")
        has_accused = "{accused}" in e["title"] + e["epilogue"]
        if k == "wrong_culprit" and "{accused}" not in e["epilogue"]:
            rep.err("endings.wrong_culprit.epilogue must name who the vote wrongly accused with {accused}")
        elif k != "wrong_culprit" and has_accused:
            rep.err(f"endings.{k}: {{accused}} is only set when the vote names an innocent (wrong_culprit)")
        check_prose(e["epilogue"], f"endings.{k}", rep, crowd=False)


# ------------------------------------------------------------------ lexicon
def check_lexicon(lx, rep):
    def walk(shape, node, path):
        if not isinstance(node, dict):
            rep.err(f"lexicon {path or 'root'}: must be an object")
            return
        for k in sorted(set(shape) - set(node)):
            rep.err(f"lexicon: missing key {path + k}")
        for k in sorted(set(node) - set(shape)):
            rep.err(f"lexicon: unknown key {path + k}")
        for k in (k for k in shape if k in node):
            if isinstance(shape[k], dict):
                walk(shape[k], node[k], path + k + ".")
            else:
                leaf(shape[k], node[k], path + k)

    def text(s, kind, where):
        if not nonempty(s):
            rep.err(f"lexicon {where}: must be a non-empty string")
        elif kind in C.LEXICON_MAX and len(s) > C.LEXICON_MAX[kind]:
            rep.err(f"lexicon {where}: {len(s)} chars, {kind} max is {C.LEXICON_MAX[kind]} ({s!r})")

    def leaf(kind, v, where):
        if kind == "schema":
            if v != C.LEXICON_SCHEMA_ID:
                rep.err(f"lexicon schema must be {C.LEXICON_SCHEMA_ID!r}")
        elif kind == "pair":
            if not (isinstance(v, list) and len(v) == 2):
                rep.err(f"lexicon {where}: must be an array of exactly 2 lines")
                return
            for i, s in enumerate(v):
                text(s, "pair", f"{where}[{i}]")
        elif kind == "loaders":
            lo, hi = C.LEXICON_LOADERS
            if not (isinstance(v, list) and lo <= len(v) <= hi):
                rep.err(f"lexicon {where}: must be an array of {lo}-{hi} lines")
                return
            for i, s in enumerate(v):
                text(s, "loaders", f"{where}[{i}]")
        elif kind == "glyphs":
            text(v, kind, where)
            if not nonempty(v):
                return
            parts, (lo, hi) = v.split(" "), C.LEXICON_GLYPHS
            if not (lo <= len(parts) <= hi and all(len(p) == 1 and not p.isalnum() for p in parts)):
                rep.err(f"lexicon {where}: must be {lo}-{hi} single non-alphanumeric characters, one space apart ({v!r})")
        else:
            text(v, kind, where)

    walk(C.LEXICON_SHAPE, lx, "")
    if not isinstance(lx, dict):
        return

    def flat(node, path=""):
        for k, v in node.items():
            if isinstance(v, dict):
                yield from flat(v, path + k + ".")
            elif isinstance(v, list):
                for i, s in enumerate(v):
                    yield f"{path}{k}[{i}]", s
            else:
                yield path + k, v

    strs = {p: s for p, s in flat(lx) if isinstance(s, str) and p != "schema"}
    for p, s in strs.items():
        if re.search(r"[0-9]", s):
            rep.err(f"lexicon {p}: no digits allowed, write counts as {{n}}/{{N}} ({s!r})")
        for ph in PLACEHOLDER.findall(s):
            if ph not in C.LEXICON_PLACEHOLDERS:
                rep.err(f"lexicon {p}: unknown placeholder {{{ph}}} (allowed: {sorted(C.LEXICON_PLACEHOLDERS)})")
    for p, ph in C.LEXICON_REQUIRES.items():
        if p in strs and "{" + ph + "}" not in strs[p]:
            rep.err(f"lexicon {p}: must contain {{{ph}}}")


def load(path):
    return json.loads(Path(path).read_text())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?")
    ap.add_argument("--allow-todo", action="store_true")
    ap.add_argument("--catalogue")
    ap.add_argument("--catalogue-entry")
    ap.add_argument("--lexicon")
    a = ap.parse_args()
    rep = Report()
    if not (a.catalogue or a.catalogue_entry or a.path or a.lexicon):
        ap.error("give a tree path, --lexicon, --catalogue, or --catalogue-entry")
    if a.catalogue:
        jobs = [(a.catalogue, lambda d: check_catalogue(d, rep))]
    elif a.catalogue_entry:
        jobs = [(a.catalogue_entry, lambda d: check_entry(d, rep, "entry"))]
    else:  # tree first: its solvability pass only runs while the report has no errors
        jobs = [(a.path, lambda d: check_tree(d, a.allow_todo, rep)), (a.lexicon, lambda d: check_lexicon(d, rep))]
    for path, check in jobs:
        if not path:
            continue
        try:
            check(load(path))
        except (OSError, json.JSONDecodeError) as exc:
            rep.err(f"cannot read JSON {path}: {exc}")
    for w in rep.warnings:
        print("WARN ", w)
    for e in rep.errors:
        print("ERROR", e)
    print(f"{len(rep.errors)} error(s), {len(rep.warnings)} warning(s)")
    sys.exit(1 if rep.errors else 0)


if __name__ == "__main__":
    main()
