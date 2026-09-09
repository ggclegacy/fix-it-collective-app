export const DURATION = 29;
export const VISIT_KEY = "fic.restore.v1";
export const chapters = [
  {
    at: 0,
    name: "A thread of care",
    line: "Something changes when someone cares.",
    description: "A warm gold spark awakens a deep-blue world.",
  },
  {
    at: 2,
    name: "Confidence",
    line: "The quiet power of showing up.",
    description:
      "Light traces a leather barber chair, polished steel and the precise teeth of a comb.",
  },
  {
    at: 6,
    name: "Relief",
    line: "Make room for a deeper exhale.",
    description:
      "Through a mirror, cream towels and a gentle treatment ritual soften the room.",
  },
  {
    at: 10,
    name: "Support",
    line: "You don’t have to carry everything alone.",
    description:
      "Two chairs face each other. A warm lamp and the connecting thread make room for men's mental-health support.",
  },
  {
    at: 14,
    name: "Agency",
    line: "Safety should feel like safety.",
    description:
      "A welcoming open doorway spills warm light. An offered hand waits for another to choose connection.",
  },
  {
    at: 18,
    name: "Community",
    line: "There is a place for you here.",
    description:
      "A shared table, warm cups and chairs drawn close: small rituals of human connection.",
  },
  {
    at: 21,
    name: "Louisiana",
    line: "Many moments of care. One collective.",
    description:
      "The camera rises. The rooms and the thread reveal the shape of Louisiana.",
  },
  {
    at: 24,
    name: "Restore",
    line: "RESTORE CONFIDENCE. TOGETHER.",
    description:
      "The official Fix It Collective emblem assembles and locks into place. The camera passes through it into the homepage.",
  },
] as const;
export function chapterAt(time: number) {
  return chapters.reduce(
    (index, chapter, i) => (time >= chapter.at ? i : index),
    0,
  );
}
// Geographic staging guide, never substituted for the official emblem.
export const louisiana = [
  [-7, -10],
  [0, -10],
  [-0.2, -8.5],
  [0.5, -7.6],
  [0.1, -6.8],
  [0.8, -5.8],
  [0.2, -4.5],
  [0.9, -3.3],
  [0.4, -2.1],
  [1.2, -1],
  [1.7, 0.2],
  [4.8, 0.2],
  [4.5, 1.4],
  [5.2, 2.1],
  [5.3, 3],
  [6.5, 3.8],
  [5.7, 4.3],
  [6.8, 5.2],
  [6.2, 5.8],
  [7.5, 7],
  [6.8, 7.7],
  [5.9, 7.1],
  [5.4, 6.1],
  [4.5, 6.5],
  [3.9, 5.6],
  [3.2, 6.8],
  [2.3, 6.1],
  [1.5, 6.9],
  [0.7, 5.8],
  [-0.3, 6.1],
  [-1.2, 5.1],
  [-2.5, 5.7],
  [-4, 5.1],
  [-5.3, 5],
  [-7.2, 5.5],
  [-6.5, 3.6],
  [-6.9, 2.2],
  [-6.3, 0.5],
  [-6.7, -1],
  [-6.1, -2.3],
  [-6.4, -4],
  [-7, -5.2],
  [-7, -10],
];
