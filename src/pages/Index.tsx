import { useEffect, useMemo, useState } from "react";
import { Gamepad2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

import GameCard from "@/components/GameCard";
import { GameForm } from "@/components/GameForm";
import { SearchAndFilters, Filters } from "@/components/SearchAndFilters";
import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";

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

  // --- Sagas présentes + vignette (on prend la 1re jaquette trouvée) ---
  const sagaTiles = useMemo(() => {
    // Map saga -> premier jeu rencontré
    const map = new Map<string, GameDTO>();

    // 1) Les sagas nommées
    for (const g of games) {
      const key = (g.saga ?? "").trim();
      if (!key) continue;
      if (!map.has(key)) map.set(key, g);
    }

    // 2) Le groupe "JEUX" = sans saga
    const firstNoSaga = games.find((g) => !g.saga || !g.saga.trim());
    if (firstNoSaga) map.set("JEUX", firstNoSaga);

    // Tri alpha, "JEUX" en premier
    const entries = Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "JEUX") return -1;
      if (b === "JEUX") return 1;
      return a.localeCompare(b);
    });

    return entries.map(([saga, sample]) => ({
      saga,
      count:
        saga === "JEUX"
          ? games.filter((g) => !g.saga || !g.saga.trim()).length
          : games.filter(
              (g) => (g.saga ?? "").trim().toLowerCase() === saga.toLowerCase()
            ).length,
      cover: sample.coverUrl || "",
    }));
  }, [games]);

  // --- Filtres (pour la barre de recherche si tu veux “pré-filtrer” sur /) ---
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

    // tri
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

  const availablePlatforms = useMemo(() => {
    return Array.from(
      new Set(games.map((g) => g.platform).filter(Boolean) as string[])
    ).sort();
  }, [games]);

  const availableSagas = useMemo(() => {
    return Array.from(
      new Set(games.map((g) => g.saga?.trim()).filter(Boolean) as string[])
    ).sort();
  }, [games]);

  // --- CRUD ---
  const handleSaveGame = async (
    gameData: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      if (editingGame?.id != null) {
        await updateGame(editingGame.id, gameData);
        toast({ title: "Jeu mis à jour", description: `${gameData.title} mis à jour.` });
      } else {
        await createGame(gameData);
        toast({ title: "Jeu ajouté", description: `${gameData.title} ajouté.` });
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

  const handleEditGame = (game: GameDTO) => {
    setEditingGame(game);
    setIsFormOpen(true);
  };

  const handleDeleteGame = async (id: number) => {
    const game = games.find((g) => g.id === id);
    if (!confirm(`Supprimer “${game?.title ?? "ce jeu"}” ?`)) return;
    try {
      await deleteGame(id);
      toast({
        title: "Jeu supprimé",
        description: `${game?.title ?? "Jeu"} supprimé.`,
        variant: "destructive",
      });
      await refresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Échec de la suppression.",
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

          <Button
            onClick={() => {
              setEditingGame(null);
              setIsFormOpen(true);
            }}
            className="gap-2 shadow-glow-primary w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </Button>
        </div>

        {/* Recherche/Filtres */}
        <div className="mb-6 sm:mb-8">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            availablePlatforms={availablePlatforms}
          />
        </div>

        {/* ---- Grille des vignettes de sagas (inclut “JEUX”) ---- */}
        <div className="space-y-6">
          <h2 className="text-lg sm:text-xl font-semibold">Sagas</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
            {sagaTiles.map(({ saga, cover, count }) => (
              <Link
                key={saga}
                to={`/s/${encodeURIComponent(saga)}`} // <-- IMPORTANT
                className="group block rounded-xl overflow-hidden bg-card shadow hover:shadow-lg transition"
                title={saga}
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
                  {cover ? (
                    <img
                      src={cover}
                      alt={saga}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      Pas de jaquette
                    </div>
                  )}
                </div>
                <div className="px-3 py-2">
                  <div className="font-semibold truncate">{saga}</div>
                  <div className="text-xs text-muted-foreground">{count} jeu(x)</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Optionnel : si tu veux garder un aperçu des jeux filtrés sur la page d’accueil */}
        {filteredGames.length > 0 && (
          <div className="mt-10 space-y-3">
            <h2 className="text-lg sm:text-xl font-semibold">Aperçu (recherche)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {filteredGames.slice(0, 10).map((g) => (
                <GameCard
                  key={g.id}
                  game={g}
                  onEdit={handleEditGame}
                  onDelete={handleDeleteGame}
                  onView={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {/* Dialog : Ajouter/Modifier */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              game={editingGame as any}
              onSave={handleSaveGame}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingGame(null);
              }}
              availableSagas={availableSagas}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;
