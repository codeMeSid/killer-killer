"""Single source of truth for engine constants. Keep in sync with references/engine-rules.md."""

SCHEMA_ID = "mm-story-tree/2"

ROUNDS = 10
PIVOT_ROUND = 8            # ending track locks after this round resolves
PLAYERS_MIN, PLAYERS_MAX = 2, 6

STATS = ("closer_to_mystery", "luck")
START_STAT, START_LUCK = 0, 3
STAT_MAX, LUCK_MAX = 5, 5

# Every option rolls d6 + luck (+2 if pushed) and must meet its tier's threshold.
THRESHOLDS = {"easy": 5, "medium": 7, "hard": 9}
TIERS = tuple(THRESHOLDS)
PUSH_BONUS, PUSH_COST = 2, 1

DIFFICULTY = {
    #           key clues needed, key clues authored, red herrings, NPC suspects (investigators), max risky options/scene
    "easy":   {"key_needed": 3, "key_authored": 5, "red_herrings": 1, "npc_suspects": 3, "max_risky": 1},
    "medium": {"key_needed": 4, "key_authored": 6, "red_herrings": 2, "npc_suspects": 4, "max_risky": 1},
    "hard":   {"key_needed": 5, "key_authored": 7, "red_herrings": 3, "npc_suspects": 5, "max_risky": 2},
}
RED_HERRING_COMMITS_FOR_WRONG = 2

RATINGS = ("family", "pg13", "mature")
ROLES = ("investigators", "suspects")
SLOTS = ("A", "B", "C", "D")
TAGS = ("group", "solo")
RISKS = ("safe", "normal", "risky")
CLARITY = ("obvious", "subtle", "buried")

TRACKS = ("solved", "wrong", "escape")
ENDINGS = ("solved", "wrong_culprit", "culprit_escapes")

EFFECT_TYPES = ("grant_clue", "grant_item", "luck", "share_private_clues")
SAB_PLAYER = ("steal_private_clue", "steal_personal_item", "drain_luck")
SAB_GROUP = ("destroy_party_clue", "destroy_party_item", "mislead_group")

PLACEHOLDERS = {"player", "target", "party", "victim", "killer", "survivors", "accused"}
ENDING_ONLY_PLACEHOLDERS = {"accused"}   # who the vote named; only known once the vote is counted

# Readability limits (warnings): narration is read off a TV, options off a phone.
MAX_SENTENCE_WORDS = 25
MAX_OPTION_WORDS = 8
# Crowd words make a line claim what other players did, which clashes with their own picks.
CROWD_WORDS = ("everyone", "everybody", "all of you", "all of them", "together", "the others", "the group", "we ")
# Tired phrases the writing rules ban (warnings).
CLICHES = ("blood ran cold", "little did", "sent shivers", "spine-chilling", "heart pounding", "all hell",
           "deafening silence", "time stood still", "out of nowhere", "a chill ran")

RULES_BLOCK = {
    "stats": list(STATS),
    "thresholds": dict(THRESHOLDS),
    "start": {"luck": START_LUCK, "stat": START_STAT},
    "pivot_round": PIVOT_ROUND,
    "rounds": ROUNDS,
}

# ------------------------------------------------------------ lexicon (references/lexicon.md)
LEXICON_SCHEMA_ID = "mm-lexicon/1"

# Exactly the keys of the TS `Lexicon` type (killer-killer src/mysteries/types.ts); each leaf names its kind.
LEXICON_SHAPE = {
    "schema": "schema",
    "hook": "statement",
    "glyphs": "glyphs",
    "lobby": {"phase": "statement", "seats": "statement", "nobody": "statement", "some": "statement",
              "full": "pair", "joined": "pair", "present": "status", "empty": "status", "waiting": "statement"},
    "join": {"started": "statement", "full": "statement", "left": "statement", "joining": "statement",
             "nameTaken": "statement"},
    "play": {"resolving": "statement", "finale": "statement", "fallen": "status", "dead": "statement",
             "loaders": "loaders"},
    "end": {"cast": "statement", "alive": "status", "dead": "status", "truth": "statement"},
}
# Max characters per string of each kind, counted as written (a placeholder counts as its own text).
LEXICON_MAX = {"statement": 32, "pair": 20, "status": 14, "loaders": 40}
LEXICON_LOADERS = (3, 6)          # min, max loader lines
LEXICON_GLYPHS = (2, 4)           # min, max ground glyphs
LEXICON_PLACEHOLDERS = {"n", "N", "victim"}
LEXICON_REQUIRES = {"lobby.seats": "N", "lobby.some": "N", "lobby.waiting": "n", "join.left": "n", "hook": "victim"}
