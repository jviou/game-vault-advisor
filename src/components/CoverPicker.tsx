// src/components/CoverPicker.tsx
import React, { useState } from "react";
import { sgdbSearchGames, sgdbGetGrids } from "../lib/steamgriddb";

type Props = {
  /** Requête de départ (souvent le titre du jeu) */
  initialQuery?: string;
  /** Callback quand l’utilisateur choisit une jaquette */
  onSelect: (url: string) => void;
  /** Optionnel si tu veux fermer une modale parent */
  onClose?: () => void;
};

/** Sélecteur de jaquette basé uniquement sur SteamGridDB */
export function CoverPicker({ initialQuery = "", onSelect, onClose }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [games, setGames] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedGame, setSelectedGame] = useState<number | null>(null);

  async function search() {
    setError(null);
    setLoading(true);
    try {
      const results = await sgdbSearchGames(q);
      setGames(results);
      setSelectedGame(results[0]?.id ?? null);
      if (results[0]) {
        const grids = await sgdbGetGrids(results[0].id);
        setThumbs(grids.map(g => g.url).slice(0, 20));
      } else {
        setThumbs([]);
        setError("Aucun jeu trouvé.");
      }
    } catch (e: any) {
      setError(e.message || "Erreur de recherche SGDB");
      setThumbs([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadGrids(id: number) {
    setError(null);
    setLoading(true);
    setSelectedGame(id);
    try {
      const grids = await sgdbGetGrids(id);
      setThumbs(grids.map(g => g.url).slice(0, 20));
      if (grids.length === 0) setError("Aucune jaquette pour ce jeu.");
    } catch (e: any) {
      setError(e.message || "Erreur de chargement des jaquettes");
      setThumbs([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Champ de recherche + bouton */}
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 text-white outline-none"
          placeholder="Rechercher un jeu…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button
          onClick={search}
          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          Rechercher
        </button>
      </div>

      {/* Liste des jeux trouvés (cliquables) */}
      {games.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {games.slice(0, 10).map((g) => (
            <button
              key={g.id}
              onClick={() => loadGrids(g.id)}
              className={`px-3 py-1 rounded-full text-sm border ${
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

      {/* Grille des jaquettes */}
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
              className="rounded-xl w-full aspect-[2/3] object-cover ring-1 ring-white/10 group-hover:ring-indigo-400"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// on exporte aussi en default pour éviter toute casse côté imports existants
export default CoverPicker;
