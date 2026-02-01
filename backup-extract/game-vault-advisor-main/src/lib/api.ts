// src/lib/api.ts
export type GameDTO = {
  id: number;
  title: string;
  coverUrl?: string;
  rating: number;
  genres: string[];
  whyLiked?: string;
  platform?: string;

  // Regroupement par saga
  saga?: string;

  // Position dans la saga (0, 1, 2, ...) – optionnel
  order?: number;

  finishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
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

// --- CRUD de base ---
export async function listGames(): Promise<GameDTO[]> {
  // Tri récent d’abord (ne gêne pas le tri local par `order` dans les pages de saga)
  return jfetch<GameDTO[]>(`/games?_sort=createdAt&_order=desc`);
}

export async function createGame(
  g: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
): Promise<GameDTO> {
  const now = new Date().toISOString();
  return jfetch<GameDTO>(`/games`, {
    method: "POST",
    body: JSON.stringify({ ...g, createdAt: now, updatedAt: now }),
  });
}

export async function updateGame(
  id: number,
  g: Omit<GameDTO, "id" | "createdAt" | "updatedAt"> &
    Partial<Pick<GameDTO, "createdAt">>
): Promise<GameDTO> {
  const now = new Date().toISOString();
  return jfetch<GameDTO>(`/games/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...g, updatedAt: now }),
  });
}

export async function deleteGame(id: number): Promise<void> {
  await jfetch<void>(`/games/${id}`, { method: "DELETE" });
}

// --- Utilitaires (optionnels) pour les pages Saga ---
// 1) Récupérer les jeux d'une saga (pratique en page /s/:slug)
export async function listGamesBySaga(saga: string): Promise<GameDTO[]> {
  const enc = encodeURIComponent(saga);
  return jfetch<GameDTO[]>(`/games?saga=${enc}`);
}

// 2) Mettre à jour uniquement l'ordre d'un jeu (PATCH json-server)
export async function updateGameOrder(id: number, order: number): Promise<GameDTO> {
  const now = new Date().toISOString();
  return jfetch<GameDTO>(`/games/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ order, updatedAt: now }),
  });
}

// 3) Réordonner en lot (simple boucle PATCH)
export async function reorderSaga(items: Array<{ id: number; order: number }>) {
  for (const it of items) {
    await updateGameOrder(it.id, it.order);
  }
}
