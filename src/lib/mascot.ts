/**
 * Искра — the WordQuest mascot. An original glowing firefly guide
 * (no Tolkien IP). Built as an animated component in P3.
 */
export const MASCOT = {
  name: "Искра",
  nameEn: "Iskra",
  species: "firefly",
  states: ["idle", "happy", "celebrate", "encourage"] as const,
} as const;

export type MascotState = (typeof MASCOT.states)[number];
