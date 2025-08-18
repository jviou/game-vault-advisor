// src/components/CoverPicker.tsx
import React, { useState } from "react";
import { sgdbSearchGames, sgdbGetGrids } from "../lib/steamgriddb";

type Props = {
  initialQuery?: string;
  onSelect: (url: string) => void;
  onClose?: () => void;
  apiKey?: string; // optionnel : override manuel de la clé
};

export function CoverPicker({ initialQuery = "", onSelect, onClose, apiKey }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const envKey = (import.meta as any).env?.VITE_SGDB_KEY as string | undefined;
  const effectiveKey = apiKey || envKey;

  async function search() {
    setError(null);
    setLoading(true);
    try {
      if (!effectiveKey) {
        throw new Error("Clé API SteamGridDB non configurée (VITE_SGDB_KEY).");
      }
      const games = await sgdbSearchGames(q, effectiveKey);
      if (games.length) {
        const grids = await sgdbGetGrids(games[0].id, effectiveKey);
        const urls = (grids || []).map((g: any) => g.url).slice(0, 12);
        setThumbs(urls);
        if (!urls.length) setError("Aucune jaquette trouvée pour ce jeu.");
      } else {
        setError("Jeu introuvable sur SteamGridDB.");
        setThumbs([]);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur de recherche");
      setThumbs([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {!effectiveKey && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-200 p-3 text-sm">
          Clé API absente. Ajoute <code>VITE_SGDB_KEY</code> dans <code>.env.local</code>.
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
