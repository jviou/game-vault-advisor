// src/components/CoverPicker.tsx
import React, { useEffect, useState } from "react";
import { sgdbSearchGames, sgdbGetGrids } from "@/lib/steamgriddb";

type Props = {
  /** Titre initial (ex: le champ "Titre" du formulaire) */
  initialQuery?: string;
  /** Callback quand on choisit une jaquette */
  onSelect: (url: string) => void;
  /** Optionnel si tu veux fermer une modale parente */
  onClose?: () => void;
};

export function CoverPicker({ initialQuery = "", onSelect, onClose }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);

  useEffect(() => {
    // si le titre est pré-rempli, on peut pré-lancer
    if (initialQuery && initialQuery.trim().length >= 2) {
      void search(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(term: string) {
    setError(null);
    setLoading(true);
    try {
      const results = await sgdbSearchGames(term);
      setGames(results);
      const first = results[0];
      if (first) {
        setSelectedGame(first.id);
        const grids = await sgdbGetGrids(first.id);
        setThumbs(grids.map((g) => g.url).slice(0, 24));
        if (grids.length === 0) setError("Aucune jaquette pour ce jeu.");
      } else {
        setSelectedGame(null);
        setThumbs([]);
        setError("Aucun jeu trouvé.");
      }
    } catch (e: any) {
      setSelectedGame(null);
      setThumbs([]);
      setError(e?.message || "Erreur de recherche SGDB");
    } finally {
      setLoading(false);
    }
  }

  async function loadGrids(gameId: number) {
    setError(null);
    setLoading(true);
    try {
      setSelectedGame(gameId);
      const grids = await sgdbGetGrids(gameId);
      setThumbs(grids.map((g) => g.url).slice(0, 24));
      if (grids.length === 0) setError("Aucune jaquette pour ce jeu.");
    } catch (e: any) {
      setThumbs([]);
      setError(e?.message || "Erreur de chargement des jaquettes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Recherche */}
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 text-white outline-none"
          placeholder="Rechercher un jeu…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search(q)}
        />
        <button
          onClick={() => search(q)}
          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          Rechercher
        </button>
      </div>

      {/* Jeux trouvés */}
      {games.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {games.slice(0, 12).map((g) => (
            <button
              key={g.id}
              onClick={() => loadGrids(g.id)}
              className={`px-3 py-1 rounded-full text-sm border whitespace-nowrap ${
                selectedGame === g.id
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-transparent text-white border-white/20"
              }`}
              title={g.name}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="opacity-80">Chargement…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {/* Grille de jaquettes */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-auto">
        {thumbs.map((u) => (
          <button
            key={u}
            onClick={() => {
              onSelect(u);
              onClose?.();
            }}
            className="group"
            title="Choisir cette jaquette"
          >
            <img
              src={u}
              alt=""
              loading="lazy"
              className="rounded-xl w-full aspect-[2/3] object-cover ring-1 ring-white/10 group-hover:ring-indigo-400"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// on expose aussi un default pour éviter tout souci d'import
export default CoverPicker;
