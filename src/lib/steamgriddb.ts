// src/lib/steamgriddb.ts
export async function sgdbSearchGames(query: string) {
  if (!query.trim()) return [];
  const res = await fetch(`/sgdb/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Proxy search ${res.status}`);
  const json = await res.json();
  return (json?.data ?? []) as Array<{ id: number; name: string }>;
}

export async function sgdbGetGrids(gameId: number) {
  const res = await fetch(`/sgdb/grids?gameId=${gameId}`);
  if (!res.ok) throw new Error(`Proxy grids ${res.status}`);
  const json = await res.json();
  return (json?.data ?? []) as Array<{ url: string }>;
}
