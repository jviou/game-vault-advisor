import React, { useState } from "react";
import { sgdbSearchGames, sgdbGetGrids } from "@/lib/steamgriddb";
import { rawgSearchFirstImage } from "@/lib/rawg";

type Props = {
  initialQuery?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
};

export default function CoverPicker({ initialQuery = "", onSelect, onClose }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setError(null);
    setLoading(true);
    try {
      const games = await sgdbSearchGames(q);
      if (games.length) {
        const grids = await sgdbGetGrids(games[0].id); // on prend le 1er match
        const urls = (grids || []).map((g: any) => g.url).slice(0, 12);
        if (urls.length) { setThumbs(urls); return; }
      }
      // fallback RAWG si rien trouvé
      const rawg = await rawgSearchFirstImage(q);
      setThumbs(rawg ? [rawg] : []);
      if (!rawg) setError("Aucune jaquette trouvée.");
    } catch (e: any) {
      setError(e.message || "Erreur de recherche");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 text-white rounded-2xl p-4 w-full max-w-2xl shadow-xl">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Rechercher un jeu…"
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-800"
          />
          <button onClick={search} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500">
            Rechercher
          </button>
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-neutral-700">Fermer</button>
        </div>

        {loading && <p className="mt-4 opacity-80">Recherche en cours…</p>}
        {error && <p className="mt-4 text-red-400">{error}</p>}

        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-4 max-h-[60vh] overflow-auto">
          {thumbs.map((u) => (
            <button key={u} onClick={() => onSelect(u)} className="group">
              <img src={u} alt="" className="rounded-xl w-full aspect-[2/3] object-cover ring-1 ring-white/10 group-hover:ring-indigo-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
