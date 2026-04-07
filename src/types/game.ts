// src/types/game.ts
// Re-export GameDTO as Game for backward compatibility with components using the Game type
export type { GameDTO as Game } from "@/lib/api";

export const DEFAULT_GENRES = [
  "JRPG",
  "Aventure",
  "Action",
  "FPS",
  "Stratégie",
  "Simulation",
  "Rogue-lite",
  "Plateforme",
  "Indé",
  "Puzzle",
  "Sport",
  "Course",
  "Autre",
];
