# Lexicon contract (`mm-lexicon/1`)

`lexicon.json` sits next to `tree.json` and holds the story's own words for the app's statements, statuses and
loaders, so a ship story says "berths" where a skydive says "seats". Its shape is exactly the TS `Lexicon` type
(killer-killer `src/mysteries/types.ts`). Validate it with `python scripts/validate_tree.py --lexicon lexicon.json`
(it can go alongside a tree path). Limits live in `scripts/constants.py`.

## Keys: where each one shows

| Key | Where it shows | Max |
|---|---|---|
| `hook` | Case card on the start screen, under the title. Must contain `{victim}`. | 32 |
| `glyphs` | The rising ground field (the setting's clock). 2-4 single non-alphanumeric characters, one space apart. | — |
| `lobby.phase` | TV lobby header word, on the phase bar. | 32 |
| `lobby.seats` | TV lobby statement: how many seats the case has. Must contain `{N}`. | 32 |
| `lobby.nobody` | TV lobby statement while nobody has joined. | 32 |
| `lobby.some` | TV lobby statement once some have joined. Must contain `{N}`. | 32 |
| `lobby.full` | TV lobby statement when every seat is filled: two lines. | 20 each |
| `lobby.joined` | Phone lobby headline once seated: two lines. | 20 each |
| `lobby.present` | Seat status beside a connected player. | 14 |
| `lobby.empty` | Seat status of an unfilled seat. | 14 |
| `lobby.waiting` | Waiting line on TV and phones until the seats fill. Must contain `{n}` (seats still empty). | 32 |
| `join.started` | Join error: the game already started. | 32 |
| `join.full` | Join error: no seats left. | 32 |
| `join.left` | Live preview line under the code boxes. Must contain `{n}` (seats left). | 32 |
| `join.joining` | Shown while the join request is in flight. The button's own label stays plain. | 32 |
| `join.nameTaken` | Join error: someone in the room has that name. | 32 |
| `play.resolving` | TV line while the round's choices resolve. | 32 |
| `play.finale` | TV line as the final round opens. | 32 |
| `play.fallen` | Status beside a dead player's name on TV. | 14 |
| `play.dead` | Phone death headline. | 32 |
| `play.loaders` | 3-6 lines cycling during waits (TV and phones). | 40 each |
| `end.cast` | Heading over the cast on the TV end screen. | 32 |
| `end.alive` | Fate word beside a survivor. | 14 |
| `end.dead` | Fate word beside the dead. | 14 |
| `end.truth` | Phone win line. | 32 |

Every key is required, no extra keys, no empty strings. Lengths count characters as written; a placeholder counts
as its own text, so leave room for a long victim name in `hook`.

## Rules

- **One setting's vocabulary, used everywhere.** Ship: decks, berths, tide, hands, port. Space: hatch, crew, oxygen,
  bunks, airlock. Skydive: aboard, seats, wind, landed. A status word and the statements around it must agree
  (`lobby.empty` "empty berth" goes with `lobby.seats` "{N} berths.").
- **Buttons are not in the lexicon.** The UI keeps plain verb + object labels ("Join mystery", "Start the mystery").
- **No digits, anywhere.** Counts are `{n}` (lowercase word, "two") or `{N}` (capitalised, "Two"); the only other
  placeholder is `{victim}`.
- **Tone matches the content rating** (the same ceiling as the tree) **and stays ominous**: short, flat, dread in
  plain words. No jokes, no exclamation marks, no emoji.
- `glyphs` should look like the setting's ground (air, water, stars), never letters or numbers.

## Examples

Skyfall (`theo-marsh-skyfall-2p`):

```json
{
  "schema": "mm-lexicon/1",
  "hook": "{victim} never landed.",
  "glyphs": ". : · ░",
  "lobby": {
    "phase": "Boarding",
    "seats": "{N} seats.",
    "nobody": "No one aboard.",
    "some": "{N} aboard.",
    "full": ["All aboard.", "Ready to jump."],
    "joined": ["You're", "aboard."],
    "present": "aboard",
    "empty": "empty seat",
    "waiting": "Waiting for {n} more aboard"
  },
  "join": {
    "started": "That flight has left.",
    "full": "Every seat is taken.",
    "left": "Seats left: {n}",
    "joining": "Boarding…",
    "nameTaken": "Someone aboard has that name."
  },
  "play": {
    "resolving": "The wind takes your choices",
    "finale": "The ground is here.",
    "fallen": "fallen",
    "dead": "You fell.",
    "loaders": ["Checking the rig", "Counting heads at the door", "Listening to the wind", "Tightening the straps", "Watching the altimeter"]
  },
  "end": {
    "cast": "Who landed.",
    "alive": "landed",
    "dead": "fell",
    "truth": "The truth came down with you."
  }
}
```

Dead Calm (a ship):

```json
{
  "schema": "mm-lexicon/1",
  "hook": "{victim} went over the rail.",
  "glyphs": "~ · ≈",
  "lobby": {
    "phase": "Gangway",
    "seats": "{N} berths.",
    "nobody": "No one on deck.",
    "some": "{N} on deck.",
    "full": ["All hands aboard.", "Cast off."],
    "joined": ["You have", "a berth."],
    "present": "on deck",
    "empty": "empty berth",
    "waiting": "Waiting for {n} more hands"
  },
  "join": {
    "started": "That ship has sailed.",
    "full": "Every berth is taken.",
    "left": "Berths left: {n}",
    "joining": "Climbing aboard…",
    "nameTaken": "A hand aboard has that name."
  },
  "play": {
    "resolving": "The tide takes your choices",
    "finale": "Land is in sight.",
    "fallen": "overboard",
    "dead": "The sea took you.",
    "loaders": ["Counting the lifeboats", "Listening below decks", "The tide turns", "Someone is on the stairs", "A lamp swings in the hold"]
  },
  "end": {
    "cast": "Who reached port.",
    "alive": "ashore",
    "dead": "lost at sea",
    "truth": "The truth washed ashore."
  }
}
```

Cold Orbit (a space station):

```json
{
  "schema": "mm-lexicon/1",
  "hook": "{victim} stopped breathing.",
  "glyphs": "· + *",
  "lobby": {
    "phase": "Airlock",
    "seats": "{N} bunks.",
    "nobody": "The station is silent.",
    "some": "{N} crew aboard.",
    "full": ["Crew complete.", "Seal the hatch."],
    "joined": ["You're on", "the crew."],
    "present": "suited",
    "empty": "empty bunk",
    "waiting": "Waiting for {n} more crew"
  },
  "join": {
    "started": "That hatch is sealed.",
    "full": "Every bunk is taken.",
    "left": "Bunks left: {n}",
    "joining": "Cycling the airlock…",
    "nameTaken": "Someone aboard has that name."
  },
  "play": {
    "resolving": "The station hums, deciding",
    "finale": "The oxygen is out.",
    "fallen": "vented",
    "dead": "You ran out of air.",
    "loaders": ["Checking the oxygen", "A hatch cycles somewhere", "Counting the crew", "The hull ticks as it cools", "Someone is in the airlock"]
  },
  "end": {
    "cast": "Who kept breathing.",
    "alive": "breathing",
    "dead": "vented",
    "truth": "The truth survived the vacuum."
  }
}
```
