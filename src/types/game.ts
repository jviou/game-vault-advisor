export interface Game {
  id: string;
  title: string;
  coverUrl?: string;
  rating: number; // 1-5
  genres: string[];
  whyLiked?: string;
  platform?: string;
  finishedAt?: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

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
  "Autre"
];