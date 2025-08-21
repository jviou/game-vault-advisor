// src/lib/steamgriddb.ts
const SGDB_BASE = "https://www.steamgriddb.com/api/v2";
const SGDB_KEY = import.meta.env.VITE_SGDB_KEY as string;

function authHeaders(): HeadersInit {
  if (!SGDB_KEY) {
    throw new Error(
      "VITE_SGDB_KEY manquante. Crée un fichier .env.local à la racine avec VITE_SGDB_KEY=ton_token"
    );
  }
  return {
    Authorization: `Bearer ${SGDB_KEY}`,
    Accept: "application/json",
  };
}

/** Autocomplete de jeux par titre */
export async function sgdbSearchGames(query: string) {
  if (!query.trim()) return [];
  const url = `${SGDB_BASE}/search/autocomplete/${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: authHeaders(), cache: "no-store", mode: "cors" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SGDB search ${res.status}: ${text || res.statusText}`);
  }
  const json = await res.json(); // { data: [...] }
  return (json?.data ?? []) as Array<{ id: number; name: string }>;
}

/** Grids (jaquettes verticales) pour un id de jeu SGDB */
export async function sgdbGetGrids(gameId: number) {
  const url = new URL(`${SGDB_BASE}/grids/game/${gameId}`);
  // dimensions verticales classiques (retire si tu veux tout)
  url.searchParams.set("dimensions", "600x900,342x482");
  url.searchParams.set("types", "static");
  url.searchParams.set("styles", "alternate");

  const res = await fetch(url.toString(), { headers: authHeaders(), cache: "no-store", mode: "cors" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SGDB grids ${res.status}: ${text || res.statusText}`);
  }
  const json = await res.json(); // { data: [...] }
  return (json?.data ?? []) as Array<{ url: string; thumb?: string }>;
}
