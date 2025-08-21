// src/types/game.ts

export type Game = {
  id?: number;
  title: string;
  coverUrl?: string;
  rating: number;
  genres: string[];
  whyLiked?: string;
  platform?: string;

  // NEW: regrouper par saga (ex: "Dragon Quest", "Zelda")
  saga?: string;

  finishedAt?: string;     // garde si encore utilisé dans ton projet
  createdAt?: string;
  updatedAt?: string;
};

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
