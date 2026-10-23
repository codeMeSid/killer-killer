import type { CaseFile, Lexicon, Solution } from "@/mysteries/types";
import type { RoomView } from "@/lib/rooms";

// In-code demo case for /dev/screens only. Not registered in src/mysteries/index.ts.

const PHOTO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><rect width="400" height="240" fill="#0B1215"/><path d="M20 200H380M60 200V90H200V200M200 140H340V200" fill="none" stroke="#3B8EEA" stroke-width="3"/><ellipse cx="130" cy="185" rx="42" ry="9" fill="#E5484D"/><circle cx="300" cy="110" r="14" fill="none" stroke="#D97757" stroke-width="3"/><path d="M296 110h8M300 106v8" stroke="#D97757" stroke-width="2"/></svg>`;

export const DEMO_CASE: CaseFile = {
  schema: "mm-case-file/1",
  slug: "demo",
  title: "The Lighthouse Keeper",
  difficulty: "easy",
  rating: "PG-13",
  setting: "A lighthouse on a storm night",
  tone: "quiet dread",
  victim: { name: "Edda Marsh", summary: "Keeper of Skerry Light for thirty years, found at the foot of the stairs." },
  brief: "Edda Marsh was found dead at the foot of the lamp-room stairs at dawn.\nThe door was bolted from the inside. Three people had keys to the tower.\nRead everything in the file, then name who, why and how.",
  suspects: [
    { name: "Tobias Rook", role: "Relief keeper", relation: "Edda's replacement on the rota.", alibi: "Says he slept in the boathouse.", note: "Owed Edda money." },
    { name: "Ines Quill", role: "Supply boat pilot", relation: "Delivered stores every Friday.", alibi: "Says she left at dusk.", note: "Edda reported her for smuggling." },
    { name: "Hale Dunmore", role: "Harbour clerk", relation: "Edda's oldest friend.", alibi: "Says he was at the harbour office.", note: "Held her will." },
  ],
  folders: [
    {
      id: "reports",
      kind: "reports",
      title: "Reports",
      items: [
        {
          id: "autopsy",
          title: "Autopsy report",
          kind: "report",
          sections: [
            { heading: "Cause", body: "Blunt injury to the back of the head. Fall not consistent with the wound." },
            { heading: "Time", body: "Between ten and midnight." },
          ],
        },
      ],
    },
    {
      id: "statements",
      kind: "statements",
      title: "Statements",
      items: [
        {
          id: "st-tobias",
          title: "Tobias Rook",
          kind: "statement",
          speaker: "Tobias Rook",
          lines: [
            { q: "Where were you at ten?", a: "In the boathouse, mending a net." },
            { q: "Did you owe her money?", a: "A little. We had an understanding." },
          ],
        },
      ],
    },
    {
      id: "evidence",
      kind: "evidence",
      title: "Evidence",
      items: [
        { id: "ph-stairs", title: "Foot of the stairs", kind: "photo", svg: PHOTO, caption: "A dark pool by the bottom step. A brass key on the ledge above." },
        {
          id: "log-lamp",
          title: "Lamp log",
          kind: "log",
          rows: [
            { at: "21:40", text: "Lamp lit by E. Marsh." },
            { at: "22:15", text: "Door bolt thrown from inside." },
            { at: "23:05", text: "Lamp out." },
          ],
        },
      ],
    },
    {
      id: "documents",
      kind: "documents",
      title: "Documents",
      items: [{ id: "note-will", title: "Torn page", kind: "note", body: "...to Hale Dunmore, my share of the harbour\nand the key to the tower, to keep..." }],
    },
  ],
  motives: [
    { id: "m1", text: "Money owed" },
    { id: "m2", text: "Silence about smuggling" },
    { id: "m3", text: "An inheritance" },
    { id: "m4", text: "An old grudge" },
  ],
  methods: [
    { id: "h1", text: "Struck with the lamp key" },
    { id: "h2", text: "Pushed down the stairs" },
    { id: "h3", text: "Poisoned tea" },
    { id: "h4", text: "Struck with an oar" },
  ],
};

export const DEMO_SOLUTION: Solution = {
  schema: "mm-case-solution/1",
  killers: [2],
  motive: "m3",
  method: "h1",
  story: [
    "Hale Dunmore climbed the tower to talk Edda out of changing her will.",
    "She refused. He struck her with the heavy brass lamp key and bolted the door behind him with his own spare.",
  ],
  deductions: [],
  herrings: [],
};

export const DEMO_LEXICON: Lexicon = {
  schema: "mm-lexicon/1",
  card: "A keeper dead on a storm night.",
  desk: "Keeper's desk",
  accuse: "Sound the foghorn",
  wrong: "The lamp flickers.",
  solved: "The light burns steady.",
  defeated: "The light goes out.",
  loaders: ["Trimming the wick"],
  full: "The tower is full.",
  no_room: "No tower by that name.",
  gone: "That light is gone.",
};

export const DEMO_VIEW: RoomView = {
  code: "K7XQ2M9P",
  slug: "demo",
  team: "Night Owls",
  isHost: true,
  me: 1,
  agents: [1, 2, 3],
  pins: [{ itemId: "ph-stairs", agent: 2 }],
  status: "playing",
  guessesUsed: 0,
  lastWrong: false,
  startedAt: new Date(Date.now() - 14 * 60_000).toISOString(),
  endedAt: null,
  case: DEMO_CASE,
  ending: null,
};
