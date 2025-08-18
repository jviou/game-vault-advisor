// src/lib/steamgriddb.ts
const SGDB_BASE = "https://www.steamgriddb.com/api/v2";

function getKey(override?: string) {
  const k = override || (import.meta as any).env?.VITE_SGDB_KEY;
  if (!k) throw new Error("SGDB API key manquante (VITE_SGDB_KEY)");
  return k as string;
}

// Recherche un jeu par titre (autocomplete)
export async function sgdbSearchGames(query: string, apiKey?: string) {
  const key = getKey(apiKey);
  const res = await fetch(
    `${SGDB_BASE}/search/autocomplete/${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) throw new Error(`SGDB search failed: ${res.status}`);
  const data = await res.json(); // { data: [...] }
  return data?.data ?? [];
}

// Récupère des jaquettes (grids) pour un gameId SGDB
export async function sgdbGetGrids(gameId: number, apiKey?: string) {
  const key = getKey(apiKey);
  const url = new URL(`${SGDB_BASE}/grids/game/${gameId}`);
  url.searchParams.set("dimensions", "600x900,342x482");
  url.searchParams.set("types", "static");
  url.searchParams.set("styles", "alternate");

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`SGDB grids failed: ${res.status}`);
  const data = await res.json(); // { data: [...] }
  return data?.data ?? [];
}
