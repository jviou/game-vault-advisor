// src/lib/api.ts
export type GameDTO = {
  id?: number; // géré par json-server
  title: string;
  coverUrl?: string;
  rating: number;         // 1..5
  genres: string[];       // ["JRPG","Action"]
  whyLiked?: string;
  platform?: string;      // "PC", "PS5", ...
  finishedAt?: string;    // ISO string
  createdAt?: string;     // ISO string
  updatedAt?: string;     // ISO string
};

const BASE = (import.meta as any).env?.VITE_API_BASE as string;

async function jfetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new Error("VITE_API_BASE manquant (.env.local)");
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${txt || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// --- CRUD ---
export async function listGames(): Promise<GameDTO[]> {
  // tri récent d’abord
  return jfetch<GameDTO[]>(`/games?_sort=createdAt&_order=desc`);
}

export async function createGame(g: Omit<GameDTO, "id" | "createdAt" | "updatedAt">): Promise<GameDTO> {
  const now = new Date().toISOString();
  return jfetch<GameDTO>(`/games`, {
    method: "POST",
    body: JSON.stringify({ ...g, createdAt: now, updatedAt: now }),
  });
}

export async function updateGame(id: number, g: Omit<GameDTO, "id" | "createdAt" | "updatedAt"> & Partial<Pick<GameDTO,"createdAt">>): Promise<GameDTO> {
  const now = new Date().toISOString();
  return jfetch<GameDTO>(`/games/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...g, updatedAt: now }),
  });
}

export async function deleteGame(id: number): Promise<void> {
  await jfetch<void>(`/games/${id}`, { method: "DELETE" });
}
