// src/pages/Index.tsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Gamepad2, MoreVertical, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import GameCard from "@/components/GameCard";
import { GameForm } from "@/components/GameForm";
import { SearchAndFilters, Filters } from "@/components/SearchAndFilters";
import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

// (petit utilitaire pour créer l’URL /s/:slug)
const slug = (s: string) =>
  (s || "JEUX")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();

const Index = () => {
  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);
  const { toast } = useToast();

  const [filters, setFilters] = useState<Filters>({
    search: "",
    genres: [],
    minRating: 1,
    platform: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Import / Export JSON (menu)
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
      toast({ title: "Export JSON", description: "La collection a été exportée." });
    } catch (e: any) {
      toast({
        title: "Export échoué",
        description: e?.message || "Impossible d’exporter le JSON.",
        variant: "destructive",
      });
    }
  };

  const handleImportAll = async (file: File) => {
    try {
      const text = await file.text();
      const arr = JSON.parse(text) as GameDTO[];
      // Import simple : on crée un par un (à adapter si tu veux écraser/vider avant)
      for (const g of arr) {
        const { id, createdAt, updatedAt, ...payload } = g as any;
        await createGame(payload);
      }
      toast({ title: "Import JSON", description: "Import terminé." });
      refresh();
    } catch (e: any) {
      toast({
        title: "Import échoué",
        description: e?.message || "Impossible d’importer ce JSON.",
        variant: "destructive",
      });
    }
  };

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

  // On garde les filtres de recherche pour que la liste de vignettes obéisse à la recherche/plateforme/note/genres
  const filteredGames = useMemo(() => {
    let filtered = games.filter((game) => {
      if (filters.search && !game.title?.toLowerCase().includes(filters.search.toLowerCase()))
        return false;
      if (filters.genres.length > 0 && !filters.genres.some((g) => (game.genres || []).includes(g)))
        return false;
      if ((game.rating ?? 0) < filters.minRating) return false;
      if (filters.platform && game.platform !== filters.platform) return false;
      return true;
    });

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
      return filters.sortOrder === "asc" ? (aValue < bValue ? -1 : aValue > bValue ? 1 : 0)
                                         : (aValue > bValue ? -1 : aValue < bValue ? 1 : 0);
    });

    return filtered;
  }, [games, filters]);

  // Construit les groupes : "JEUX" (= sans saga) + chaque saga
  const groups = useMemo(() => {
    const map = new Map<string, GameDTO[]>();
    for (const g of filteredGames) {
      const key = (g.saga?.trim() || "").toUpperCase();
      const groupName = key || "JEUX";
      if (!map.has(groupName)) map.set(groupName, []);
      map.get(groupName)!.push(g);
    }
    // JEUX en premier, puis sagas triées alpha
    const entries = Array.from(map.entries());
    const first = entries.filter(([k]) => k === "JEUX");
    const rest = entries.filter(([k]) => k !== "JEUX").sort(([a], [b]) => a.localeCompare(b));
    return [...first, ...rest];
  }, [filteredGames]);

  const availablePlatforms = useMemo(() => {
    return Array.from(new Set(games.map((g) => g.platform).filter(Boolean) as string[])).sort();
  }, [games]);

  const handleSaveGame = async (
    gameData: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      if (editingGame?.id != null) {
        await updateGame(editingGame.id, gameData);
        toast({ title: "Jeu mis à jour", description: `${gameData.title} a été mis à jour.` });
      } else {
        await createGame(gameData);
        toast({ title: "Jeu ajouté", description: `${gameData.title} a été ajouté à votre collection.` });
      }
      setIsFormOpen(false);
      setEditingGame(null);
      await refresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Échec de l’enregistrement.",
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

          {/* Boutons à droite : menu Import/Export + Ajouter */}
          <div className="flex items-center gap-2">
            {/* Menu simple (Importer/Exporter) */}
            <div className="relative group">
              <Button variant="outline" className="gap-2">
                <MoreVertical className="w-4 h-4" />
              </Button>
              <div className="hidden group-hover:block absolute right-0 mt-2 w-44 rounded-md border bg-popover p-1 shadow-md z-20">
                <button
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded hover:bg-muted"
                  onClick={handleExportAll}
                >
                  <Download className="w-4 h-4" /> Exporter JSON
                </button>
                <label className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded hover:bg-muted cursor-pointer">
                  <Upload className="w-4 h-4" /> Importer JSON
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImportAll(f);
                    }}
                  />
                </label>
              </div>
            </div>

            <Button
              onClick={() => {
                setEditingGame(null);
                setIsFormOpen(true);
              }}
              className="gap-2 shadow-glow-primary"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Barre de recherche / filtres */}
        <div className="mb-6 sm:mb-8">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            availablePlatforms={availablePlatforms}
          />
        </div>

        {/* === Grille de vignettes (JEUX + Sagas) === */}
        {groups.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              {games.length === 0 ? "Aucun jeu" : "Aucun résultat"}
            </h3>
            {games.length === 0 && (
              <Button
                onClick={() => {
                  setEditingGame(null);
                  setIsFormOpen(true);
                }}
                className="mt-4 gap-2"
              >
                <Plus className="w-4 h-4" /> Ajouter un jeu
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
            {groups.map(([saga, list]) => {
              const first = list.find((g) => !!g.coverUrl) || list[0];
              return (
                <Link
                  key={saga}
                  to={`/s/${slug(saga)}`}
                  className="group relative rounded-xl overflow-hidden bg-muted/30 border border-border hover:shadow-lg transition focus:outline-none"
                  title={`Voir ${saga}`}
                >
                  <div className="aspect-[3/4] w-full overflow-hidden bg-black/20">
                    {first?.coverUrl ? (
                      <img
                        src={first.coverUrl}
                        alt={saga}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                        Aucun visuel
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white">
                    <div className="font-semibold truncate">{saga}</div>
                    <span className="text-xs bg-white/15 px-2 py-0.5 rounded-full">{list.length}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Dialog : Formulaire Ajouter/Modifier */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              game={editingGame as any}
              onSave={handleSaveGame}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingGame(null);
              }}
              availableSagas={Array.from(
                new Set(games.map((g) => g.saga?.trim()).filter(Boolean) as string[])
              ).sort()}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;
