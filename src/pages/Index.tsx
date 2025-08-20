// src/pages/Index.tsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import GameCard from "@/components/GameCard";                  // 👈 default export
import { GameForm } from "@/components/GameForm";
import { SearchAndFilters, Filters } from "@/components/SearchAndFilters";
import type { GameDTO } from "@/lib/api";                      // 👈 type API
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
      // Search
      if (
        filters.search &&
        !game.title?.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      // Genres
      if (
        filters.genres.length > 0 &&
        !filters.genres.some((g) => (game.genres || []).includes(g))
      ) {
        return false;
      }
      // Note mini
      if ((game.rating ?? 0) < filters.minRating) {
        return false;
      }
      // Plateforme
      if (filters.platform && game.platform !== filters.platform) {
        return false;
      }
      return true;
    });

    // Tri
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

      if (filters.sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [games, filters]);

  // Plateformes pour le filtre
  const availablePlatforms = useMemo(() => {
    return Array.from(
      new Set((games.map((g) => g.platform).filter(Boolean) as string[]))
    ).sort();
  }, [games]);

  // Create / Update via API
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
      toast({ title: "Erreur", description: e?.message || "Échec de l’enregistrement.", variant: "destructive" });
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
      toast({ title: "Jeu supprimé", description: `${game?.title ?? "Jeu"} supprimé de votre collection.`, variant: "destructive" });
      await refresh();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Échec de la suppression.", variant: "destructive" });
    }
  };

  const handleViewGame = (game: GameDTO) => setViewingGame(game);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-glow-primary">
              <Gamepad2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Ma Collection de Jeux
              </h1>
              <p className="text-muted-foreground">
                {games.length} jeu{games.length !== 1 ? "s" : ""} dans votre collection
              </p>
            </div>
          </div>

          <Button
            onClick={() => { setEditingGame(null); setIsFormOpen(true); }}
            className="gap-2 shadow-glow-primary"
          >
            <Plus className="w-4 h-4" />
            Ajouter un jeu
          </Button>
        </div>

        {/* Search + Filtres */}
        <div className="mb-8">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            availablePlatforms={availablePlatforms}
          />
        </div>

        {/* Grille */}
        {filteredGames.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-muted/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {games.length === 0 ? "Aucun jeu dans votre collection" : "Aucun jeu trouvé"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {games.length === 0
                ? "Commencez par ajouter votre premier jeu !"
                : "Essayez de modifier vos filtres de recherche."}
            </p>
            {games.length === 0 && (
              <Button onClick={() => { setEditingGame(null); setIsFormOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter mon premier jeu
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onEdit={handleEditGame}
                onDelete={handleDeleteGame}
                onView={handleViewGame}
              />
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              game={editingGame as any}
              onSave={handleSaveGame}
              onCancel={() => { setIsFormOpen(false); setEditingGame(null); }}
            />
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={!!viewingGame} onOpenChange={() => setViewingGame(null)}>
          <DialogContent className="max-w-2xl">
            {viewingGame && (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{viewingGame.title}</h2>
                    {viewingGame.platform && (
                      <p className="text-muted-foreground">{viewingGame.platform}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setViewingGame(null)}>
                    <Plus className="h-4 w-4 rotate-45" />
                  </Button>
                </div>

                {viewingGame.coverUrl && (
                  <div className="flex justify-center">
                    <img
                      src={viewingGame.coverUrl}
                      alt={`${viewingGame.title} cover`}
                      className="max-w-48 max-h-64 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  {/* Note */}
                  <div>
                    <h3 className="font-semibold mb-2">Note</h3>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span
                          key={i}
                          className={`text-xl ${
                            i < (viewingGame.rating ?? 0)
                              ? "text-gaming-gold"
                              : "text-muted-foreground"
                          }`}
                        >
                          ⭐
                        </span>
                      ))}
                      <span className="text-muted-foreground ml-2">
                        {viewingGame.rating ?? 0}/5
                      </span>
                    </div>
                  </div>

                  {/* Genres */}
                  {!!viewingGame.genres?.length && (
                    <div>
                      <h3 className="font-semibold mb-2">Genres</h3>
                      <div className="flex flex-wrap gap-2">
                        {viewingGame.genres.map((genre) => (
                          <span key={genre} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pourquoi j’ai aimé */}
                  {!!viewingGame.whyLiked && (
                    <div>
                      <h3 className="font-semibold mb-2">Pourquoi j'ai aimé</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {viewingGame.whyLiked}
                      </p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                    {viewingGame.finishedAt && (
                      <div>
                        <span className="font-medium">Terminé le :</span><br />
                        {new Date(viewingGame.finishedAt).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                    {viewingGame.createdAt && (
                      <div>
                        <span className="font-medium">Ajouté le :</span><br />
                        {new Date(viewingGame.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => { setViewingGame(null); handleEditGame(viewingGame); }}
                    className="flex-1"
                  >
                    Modifier
                  </Button>
                  {typeof viewingGame.id === "number" && (
                    <Button
                      variant="destructive"
                      onClick={() => { handleDeleteGame(viewingGame.id!); setViewingGame(null); }}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;
