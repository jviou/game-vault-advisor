const SGDB_BASE = "https://www.steamgriddb.com/api/v2";
const SGDB_KEY = import.meta.env.VITE_SGDB_KEY as string;

// Recherche un jeu par titre (autocomplétion)
export async function sgdbSearchGames(query: string) {
  if (!SGDB_KEY) throw new Error("SGDB API key manquante (VITE_SGDB_KEY)");
  const res = await fetch(`${SGDB_BASE}/search/autocomplete/${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${SGDB_KEY}` },
  });
  if (!res.ok) throw new Error(`SGDB search failed: ${res.status}`);
  const data = await res.json(); // {data:[{id,name, ...}]}
  return data?.data ?? [];
}

// Récupère les jaquettes (grids) d’un jeu SGDB
export async function sgdbGetGrids(gameId: number) {
  if (!SGDB_KEY) throw new Error("SGDB API key manquante (VITE_SGDB_KEY)");
  const url = new URL(`${SGDB_BASE}/grids/game/${gameId}`);
  // dimensions classiques “box art” verticales
  url.searchParams.set("dimensions", "600x900,342x482");
  url.searchParams.set("types", "static");      // pas animé
  url.searchParams.set("styles", "alternate");  // ou 'material','white_logo', etc.

  const res = await fetch(url, { headers: { Authorization: `Bearer ${SGDB_KEY}` } });
  if (!res.ok) throw new Error(`SGDB grids failed: ${res.status}`);
  const data = await res.json(); // {data:[{url, ...}]}
  return data?.data ?? [];
}
