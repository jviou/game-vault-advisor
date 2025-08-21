// DEBUG: retirer après test
console.log("[SGDB] key present?", Boolean(import.meta.env.VITE_SGDB_KEY));

// src/lib/steamgriddb.ts
const SGDB_BASE = "https://www.steamgriddb.com/api/v2";
const SGDB_KEY = import.meta.env.VITE_SGDB_KEY as string;

function authHeaders() {
  if (!SGDB_KEY) {
    throw new Error("VITE_SGDB_KEY manquante (config .env.local)");
  }
  return { Authorization: `Bearer ${SGDB_KEY}` };
}

// Autocomplete par titre
export async function sgdbSearchGames(query: string) {
  const url = `${SGDB_BASE}/search/autocomplete/${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`SGDB search ${res.status}`);
  const json = await res.json(); // { data: [...] }
  return (json?.data ?? []) as Array<{ id: number; name: string }>;
}

// Récupère les "grids" (jaquettes verticales) d’un jeu SGDB
export async function sgdbGetGrids(gameId: number) {
  const url = new URL(`${SGDB_BASE}/grids/game/${gameId}`);
  // formats “box art” verticaux classiques
  url.searchParams.set("dimensions", "600x900,342x482");
  url.searchParams.set("types", "static");      // pas de GIF
  url.searchParams.set("styles", "alternate");  // variantes propres

  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`SGDB grids ${res.status}`);
  const json = await res.json(); // { data: [...] }
  return (json?.data ?? []) as Array<{ url: string }>;
}
