import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Gamepad2, Download, Upload, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import type { GameDTO } from "@/lib/api";
import { listGames, createGame } from "@/lib/api";
import { SearchAndFilters, type Filters } from "@/components/SearchAndFilters";

// ---------- Utils ----------
function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

// Choix de jaquette pour une saga (ou pour le groupe “JEUX” sans saga)
// 1) order asc (undefined à la fin), 2) createdAt asc, 3) id asc
function pickCover(gamesOfGroup: GameDTO[]): string | undefined {
  if (!gamesOfGroup?.length) return undefined;
  const sorted = [...gamesOfGroup].sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;

    const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (ac !== bc) return ac - bc;

    return (a.id ?? 0) - (b.id ?? 0);
  });
  return sorted[0]?.coverUrl || undefined;
}

export default function Index() {
  const { toast } = useToast();

  const [games, setGames] = useState<GameDTO[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    genres: [],
    minRating: 1,
    platform: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // pour Import JSON
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const data = await listGames();
      setGames(data);
    } catch (e: any) {
      toast({
        title: "Erreur de chargement",
        description: e?.message || "Impossible de charger la collection.",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // ---------- Filtres & recherche ----------
  const filteredGames = useMemo(() => {
    let filtered = games.filter((game) => {
      if (
        filters.search &&
        !game.title?.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      if (
        filters.genres.length > 0 &&
        !filters.genres.some((g) => (game.genres || []).includes(g))
      )
        return false;
      if ((game.rating ?? 0) < filters.minRating) return false;
      if (filters.platform && game.platform !== filters.platform) return false;
      return true;
    });

    // Tri local sur la liste filtrée (utile si tu affiches une liste de jeux)
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (filters.sortBy) {
        case "title":
          aValue = (a.title || "").toLowerCase();
          bValue = (b.title || "").toLowerCase();
          break;
        case "rating":
          aValue = a.rating ?? 0;
          bValue = b.rating ?? 0;
          break;
        case "finishedAt":
          aValue = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
          bValue = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
          break;
        default:
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }
      return filters.sortOrder === "asc"
        ? aValue < bValue
          ? -1
          : aValue > bValue
          ? 1
          : 0
        : aValue > bValue
        ? -1
        : aValue < bValue
        ? 1
        : 0;
    });

    return filtered;
  }, [games, filters]);

  // Plateformes pour le composant SearchAndFilters
  const availablePlatforms = useMemo(() => {
    return Array.from(
      new Set(filteredGames.map((g) => g.platform).filter(Boolean) as string[])
    ).sort();
  }, [filteredGames]);

  // Groupes de sagas (on sépare bien la “non-saga” sous la tuile JEUX)
  const { sagaMap, noSaga } = useMemo(() => {
    const map = new Map<string, GameDTO[]>();
    const noSagaList: GameDTO[] = [];

    for (const g of filteredGames) {
      const key = (g.saga || "").trim();
      if (!key) {
        noSagaList.push(g);
      } else {
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(g);
      }
    }

    // tri alphabétique des noms de sagas
    const sortedEntries = Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "fr")
    );
    return { sagaMap: sortedEntries, noSaga: noSagaList };
  }, [filteredGames]);

  // ---------- Import / Export JSON ----------
  const handleExportAll = () => {
    try {
      const data = JSON.stringify(games, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `game-vault_${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Export JSON",
        description: "La collection a été exportée.",
      });
    } catch (e: any) {
      toast({
        title: "Export échoué",
        description: e?.message || "Impossible d’exporter le JSON.",
        variant: "destructive",
      });
    }
  };

  const handlePickImport = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const items: GameDTO[] = Array.isArray(json)
        ? json
        : Array.isArray(json.games)
        ? json.games
        : [];

      if (!items.length) {
        toast({
          title: "Import",
          description:
            "Aucun jeu détecté dans ce JSON (attendu: tableau de jeux).",
          variant: "destructive",
        });
        return;
      }

      // Import simple : on (re)crée les entrées
      let ok = 0;
      for (const it of items) {
        const { id, createdAt, updatedAt, ...payload } = it as any;
        try {
          await createGame(payload);
          ok++;
        } catch {
          /* ignore unit error to keep going */
        }
      }

      toast({
        title: "Import terminé",
        description: `${ok}/${items.length} jeux importés.`,
      });
      refresh();
    } catch (err: any) {
      toast({
        title: "Import échoué",
        description: err?.message || "JSON invalide.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-glow-primary">
              <Gamepad2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Ma Collection
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {games.length} {games.length > 1 ? "jeux" : "jeu"}
              </p>
            </div>
          </div>

          {/* Menu actions */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MoreHorizontal className="w-4 h-4" />
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Collection</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportAll} className="gap-2">
                  <Download className="w-4 h-4" />
                  Exporter JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePickImport} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Importer JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={refresh}>Rafraîchir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Si tu veux un ajout global (sinon on ajoute depuis la page saga) */}
            <Link to="/games" className="hidden sm:block">
              <Button className="gap-2 shadow-glow-primary">
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
            </Link>
          </div>
        </div>

        {/* Recherche + Filtres (ta barre large et tes filtres existants) */}
        <div className="mb-6 sm:mb-8">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            availablePlatforms={availablePlatforms}
          />
        </div>

        {/* Tuiles : d’abord JEUX (pas de saga), puis les sagas triées */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-5">
          {/* Tuile JEUX */}
          <Link
            to="/games"
            className="group block rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition hover:-translate-y-0.5 border border-border bg-gradient-card"
            title="Tous les jeux sans saga"
          >
            {pickCover(noSaga) ? (
              <img
                src={pickCover(noSaga)!}
                alt="JEUX"
                className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center text-muted-foreground">
                Pas de jaquette
              </div>
            )}
            <div className="p-3">
              <h2 className="font-bold tracking-wide">JEUX</h2>
              <p className="text-sm text-muted-foreground">
                {noSaga.length} jeu{noSaga.length > 1 ? "x" : ""}
              </p>
            </div>
          </Link>

          {/* Tuiles Sagas */}
          {sagaMap.map(([sagaName, sagaGames]) => {
            const cover = pickCover(sagaGames);
            const slug = toSlug(sagaName);
            return (
              <Link
                key={sagaName}
                to={`/s/${slug}`}
                className="group block rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition hover:-translate-y-0.5 border border-border bg-gradient-card"
                title={sagaName}
              >
                {cover ? (
                  <img
                    src={cover}
                    alt={sagaName}
                    className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center text-muted-foreground">
                    Pas de jaquette
                  </div>
                )}
                <div className="p-3">
                  <h2 className="font-bold truncate">{sagaName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {sagaGames.length} jeu{sagaGames.length > 1 ? "x" : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* input caché pour l'import JSON */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
    </div>
  );
}
