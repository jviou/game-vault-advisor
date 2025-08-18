// src/components/CoverPicker.tsx
import React, { useState } from "react";

const RAWG_BASE = "https://api.rawg.io/api";
const RAWG_KEY = (import.meta as any).env?.VITE_RAWG_KEY as string | undefined;

type Props = {
  initialQuery?: string;
  onSelect: (url: string) => void;
  onClose?: () => void;
};

export function CoverPicker({ initialQuery = "", onSelect, onClose }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setError(null);
    setThumbs([]);
    if (!q.trim()) return;

    if (!RAWG_KEY) {
      setError("Clé RAWG manquante : ajoute VITE_RAWG_KEY dans .env.local");
      return;
    }

    setLoading(true);
    try {
      const u = new URL(`${RAWG_BASE}/games`);
      u.searchParams.set("key", RAWG_KEY);
      u.searchParams.set("search", q);
      u.searchParams.set("page_size", "12");

      const res = await fetch(u.toString());
      if (!res.ok) throw new Error(`RAWG HTTP ${res.status}`);
      const data = await res.json();

      const urls: string[] = (data?.results ?? [])
        .map((g: any) => g.background_image)
        .filter(Boolean);

      if (!urls.length) {
        setError("Aucune image trouvée pour ce titre.");
      }
      setThumbs(urls);
    } catch (e: any) {
      setError(e?.message || "Erreur pendant la recherche RAWG");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {!RAWG_KEY && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-200 p-3 text-sm">
          Ajoute <code>VITE_RAWG_KEY</code> dans <code>.env.local</code> pour activer la recherche.
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un jeu…"
          className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 text-white"
        />
        <button
          type="button"
          onClick={search}
          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          Rechercher
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg bg-neutral-700">
            Fermer
          </button>
        )}
      </div>

      {loading && <p className="opacity-80">Recherche en cours…</p>}
      {error && <p className="text-red-400">{error}</p>}

      <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-[50vh] overflow-auto">
        {thumbs.map((u) => (
          <button key={u} onClick={() => onSelect(u)} className="group">
            <img
              src={u}
              alt=""
              className="rounded-xl w-full aspect-[2/3] object-cover ring-1 ring-white/10 group-hover:ring-indigo-400"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
