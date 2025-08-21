// src/components/CoverPicker.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Search } from "lucide-react";

type SgdbGame = { id: number; name: string };
type SgdbGrid = { url: string };

interface CoverPickerProps {
  gameTitle: string;
  apiKey?: string; // non utilisé côté proxy
  onCoverSelect: (url: string) => void;
  onTitlePick?: (title: string) => void; // <-- NOUVEAU : met à jour le champ Titre
}

export const CoverPicker: React.FC<CoverPickerProps> = ({
  gameTitle,
  onCoverSelect,
  onTitlePick,
}) => {
  const [query, setQuery] = useState(gameTitle || "");
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState<SgdbGame[]>([]);
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [grids, setGrids] = useState<SgdbGrid[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  // --- debounce util
  const debRef = useRef<number | null>(null);
  const clearDeb = () => {
    if (debRef.current) {
      window.clearTimeout(debRef.current);
      debRef.current = null;
    }
  };

  const searchGames = async (term: string) => {
    const q = term.trim();
    if (q.length < 2) return;
    setLoading(true);
    setError(null);
    setGames([]);
    setGrids([]);
    setActiveGameId(null);

    try {
      const res = await fetch(`/sgdb/search?query=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data: SgdbGame[] = json?.data ?? [];
      setGames(data);
      if (data.length > 0) {
        // on choisit le premier jeu automatiquement et on remonte son nom
        if (onTitlePick) onTitlePick(data[0].name);
        void pickGame(data[0].id);
      }
    } catch (e: any) {
      setError(e?.message || "Recherche impossible");
    } finally {
      setLoading(false);
    }
  };

  const pickGame = async (id: number) => {
    setActiveGameId(id);
    setGrids([]);
    setError(null);
    try {
      const res = await fetch(`/sgdb/grids?gameId=${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data: SgdbGrid[] = json?.data ?? [];
      setGrids(data);
    } catch (e: any) {
      setError(e?.message || "Chargement des jaquettes impossible");
    }
  };

  // recherche AUTO quand le titre tapé change (petit debounce)
  useEffect(() => {
    const next = (gameTitle || "").trim();
    setQuery(next);
    clearDeb();
    if (next.length >= 2) {
      debRef.current = window.setTimeout(() => searchGames(next), 350);
    }
    return clearDeb;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameTitle]);

  return (
    <div className="space-y-3">
      {/* champ + bouton rechercher */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un jeu…"
            className="pl-8"
          />
        </div>
        <Button onClick={() => searchGames(query)} disabled={!canSearch || loading}>
          {loading ? "Recherche…" : "Rechercher"}
        </Button>
      </div>

      {/* suggestions de jeux */}
      {games.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {games.slice(0, 14).map((g) => {
            const active = g.id === activeGameId;
            return (
              <Badge
                key={g.id}
                className={`cursor-pointer transition ${active ? "ring-2 ring-primary" : "hover:bg-secondary/80"}`}
                variant={active ? "default" : "secondary"}
                onClick={() => {
                  if (onTitlePick) onTitlePick(g.name); // <-- met à jour le champ Titre
                  pickGame(g.id);
                }}
              >
                {g.name}
              </Badge>
            );
          })}
        </div>
      )}

      {!!error && <p className="text-sm text-destructive">{String(error)}</p>}
      {!loading && games.length === 0 && !error && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Tape un nom de jeu (ou utilise le titre) pour lancer la recherche.
        </div>
      )}

      {/* grille de jaquettes — tuiles taille fixe + vrai button */}
      {grids.length > 0 && (
        <div className="max-h-[60vh] overflow-y-auto pr-0.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {grids.map((grid, idx) => (
              <button
                key={`${grid.url}-${idx}`}
                type="button"                // <-- empêche tout submit
                onClick={() => onCoverSelect(grid.url)}
                className="group relative rounded-lg border bg-background hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-primary"
                title="Choisir cette jaquette"
              >
                <div className="w-28 h-40 overflow-hidden rounded-md">
                  <img
                    src={grid.url}
                    alt="cover"
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverPicker;
