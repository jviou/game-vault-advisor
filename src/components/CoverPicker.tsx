// src/components/CoverPicker.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Search } from "lucide-react";

type SgdbGame = { id: number; name: string };
type SgdbGrid = { url: string };

interface CoverPickerProps {
  gameTitle: string;
  apiKey?: string; // non utilisé côté proxy, mais on garde la signature
  onCoverSelect: (url: string) => void;
}

export const CoverPicker: React.FC<CoverPickerProps> = ({
  gameTitle,
  onCoverSelect,
}) => {
  const [query, setQuery] = useState(gameTitle || "");
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState<SgdbGame[]>([]);
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [grids, setGrids] = useState<SgdbGrid[]>([]);
  const [error, setError] = useState<string | null>(null);

  // maj champ si le titre change
  useEffect(() => {
    if (gameTitle && !query) setQuery(gameTitle);
  }, [gameTitle]);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  const searchGames = async () => {
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setGames([]);
    setGrids([]);
    setActiveGameId(null);

    try {
      const res = await fetch(`/sgdb/search?query=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data: SgdbGame[] = json?.data ?? [];
      setGames(data);
      // pré-sélection du 1er jeu
      if (data.length > 0) {
        pickGame(data[0].id);
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

  return (
    <div className="space-y-3">
      {/* barre de recherche */}
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
        <Button onClick={searchGames} disabled={!canSearch || loading}>
          {loading ? "Recherche…" : "Rechercher"}
        </Button>
      </div>

      {/* suggestions de jeux */}
      {games.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {games.slice(0, 12).map((g) => {
            const isActive = g.id === activeGameId;
            return (
              <Badge
                key={g.id}
                onClick={() => pickGame(g.id)}
                variant={isActive ? "default" : "secondary"}
                className={`cursor-pointer transition ${
                  isActive ? "ring-2 ring-primary" : "hover:bg-secondary/80"
                }`}
              >
                {g.name}
              </Badge>
            );
          })}
        </div>
      )}

      {/* messages d'état */}
      {!!error && (
        <p className="text-sm text-destructive">{String(error)}</p>
      )}
      {!loading && games.length === 0 && !error && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Tape un nom de jeu et lance la recherche.
        </div>
      )}

      {/* grille des jaquettes (hauteur fixe, même taille) */}
      {grids.length > 0 && (
        <div className="max-h-[60vh] overflow-y-auto pr-0.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {grids.map((grid, idx) => (
              <button
                key={`${grid.url}-${idx}`}
                type="button"
                onClick={() => onCoverSelect(grid.url)}
                className="group relative rounded-lg border bg-background hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-primary"
                title="Choisir cette jaquette"
              >
                <div className="w-28 h-40 overflow-hidden rounded-md">
                  <img
                    src={grid.url}
                    alt="cover"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-0 rounded-lg ring-0 group-hover:ring-2 ring-primary/60 pointer-events-none" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverPicker;
