// src/pages/Index.tsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import GameCard from "@/components/GameCard";
import { GameForm } from "@/components/GameForm";
import { SearchAndFilters, Filters } from "@/components/SearchAndFilters";
import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);
  const [viewingGame, setViewingGame] = useState<GameDTO | null>(null);
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

  // Filtre + tri
  const filteredGames = useMemo(() => {
    let filtered = games.filter((game) => {
      if (
        filters.search &&
        !game.title?.toLowerCase().includes(filters.search.toLowerCase())
      ) return false;
      if (
        filters.genres.length > 0 &&
        !filters.genres.some((g) => (game.genres || []).includes(g))
      ) return false;
      if ((game.rating ?? 0) < filters.minRating) return false;
      if (filters.platform && game.platform !== filters.platform) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (filters.sortBy) {
        case "title": aValue = (a.title || "").toLowerCase(); bValue = (b.title || "").toLowerCase(); break;
        case "rating": aValue = a.rating ?? 0; bValue = b.rating ?? 0; break;
        case "finishedAt": aValue = a.finishedAt ? new Date(a.finishedAt).getTime() : 0; bValue = b.finishedAt ? new Date(b.finishedAt).getTime() : 0; break;
        default: aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0; bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }
      return filters.sortOrder === "asc"
        ? aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        : aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    });

    return filtered;
  }, [games, filters]);

  const availablePlatforms = useMemo(() => {
    return Array.from(new Set((games.map((g) => g.platform).filter(Boolean) as string[]))).sort();
  }, [games]);

  const handleSaveGame = async (gameData: Omit<GameDTO, "id" | "createdAt" | "updatedAt">) => {
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
      toast({ title: "Erreur", description: e?.message || "Échec de l’enregistrement.", variant: "destructive" });
    }
  };

  const handleEditGame = (game: GameDTO) => { setEditingGame(game); setIsFormOpen(true); };
  const handleDeleteGame = async (id: number) => {
    const game = games.find((g) => g.id === id);
    if (!confirm(`Supprimer “${game?.title ?? "ce jeu"}” ?`)) return;
    try {
      await deleteGame(id);
      toast({ title: "Jeu supprimé", description: `${game?.title ?? "Jeu"} supprimé.`, variant: "destructive" });
      await refresh();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Échec de la suppression.", variant: "destructive" });
    }
  };
  const handleViewGame = (game: GameDTO) => setViewingGame(game);

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
            onClick={() => { setEditingGame(null); setIsFormOpen(true); }}
            className="gap-2 shadow-glow-primary w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </Button>
        </div>

        {/* Search + Filtres */}
        <div className="mb-6 sm:mb-8">
          <SearchAndFilters filters={filters} onFiltersChange={setFilters} availablePlatforms={availablePlatforms} />
        </div>

        {/* Grille */}
        {filteredGames.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              {games.length === 0 ? "Aucun jeu" : "Aucun résultat"}
            </h3>
            {games.length === 0 && (
              <Button onClick={() => { setEditingGame(null); setIsFormOpen(true); }} className="mt-4 gap-2">
                <Plus className="w-4 h-4" /> Ajouter un jeu
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} onEdit={handleEditGame} onDelete={handleDeleteGame} onView={handleViewGame} />
            ))}
          </div>
        )}

        {/* Dialogs */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              game={editingGame as any}
              onSave={handleSaveGame}
              onCancel={() => { setIsFormOpen(false); setEditingGame(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;
