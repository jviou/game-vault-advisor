import { useState, useMemo } from "react";
import { Plus, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GameCard } from "@/components/GameCard";
import { GameForm } from "@/components/GameForm";
import { SearchAndFilters, Filters } from "@/components/SearchAndFilters";
import { Game } from "@/types/game";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [games, setGames] = useLocalStorage<Game[]>("games", []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [viewingGame, setViewingGame] = useState<Game | null>(null);
  const { toast } = useToast();

  const [filters, setFilters] = useState<Filters>({
    search: '',
    genres: [],
    minRating: 1,
    platform: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let filtered = games.filter(game => {
      // Search filter
      if (filters.search && !game.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Genre filter
      if (filters.genres.length > 0 && !filters.genres.some(genre => game.genres.includes(genre))) {
        return false;
      }
      
      // Rating filter
      if (game.rating < filters.minRating) {
        return false;
      }
      
      // Platform filter
      if (filters.platform && game.platform !== filters.platform) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'finishedAt':
          aValue = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
          bValue = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      if (filters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [games, filters]);

  // Get available platforms for filter
  const availablePlatforms = useMemo(() => {
    const platforms = games
      .map(game => game.platform)
      .filter(Boolean)
      .filter((platform, index, arr) => arr.indexOf(platform) === index)
      .sort();
    return platforms as string[];
  }, [games]);

  const handleSaveGame = (gameData: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    
    if (editingGame) {
      // Update existing game
      const updatedGame: Game = {
        ...editingGame,
        ...gameData,
        updatedAt: now
      };
      setGames(games.map(g => g.id === editingGame.id ? updatedGame : g));
      toast({
        title: "Jeu mis à jour",
        description: `${gameData.title} a été mis à jour avec succès.`
      });
    } else {
      // Create new game
      const newGame: Game = {
        id: crypto.randomUUID(),
        ...gameData,
        createdAt: now,
        updatedAt: now
      };
      setGames([...games, newGame]);
      toast({
        title: "Jeu ajouté",
        description: `${gameData.title} a été ajouté à votre collection.`
      });
    }

    setIsFormOpen(false);
    setEditingGame(null);
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setIsFormOpen(true);
  };

  const handleDeleteGame = (id: string) => {
    const game = games.find(g => g.id === id);
    setGames(games.filter(g => g.id !== id));
    toast({
      title: "Jeu supprimé",
      description: `${game?.title} a été supprimé de votre collection.`,
      variant: "destructive"
    });
  };

  const handleViewGame = (game: Game) => {
    setViewingGame(game);
  };

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
                {games.length} jeu{games.length !== 1 ? 's' : ''} dans votre collection
              </p>
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
            Ajouter un jeu
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            availablePlatforms={availablePlatforms}
          />
        </div>

        {/* Games Grid */}
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
              <Button
                onClick={() => {
                  setEditingGame(null);
                  setIsFormOpen(true);
                }}
                className="gap-2"
              >
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

        {/* Add/Edit Game Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              game={editingGame}
              onSave={handleSaveGame}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingGame(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Game Details Dialog */}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingGame(null)}
                  >
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
                  {/* Rating */}
                  <div>
                    <h3 className="font-semibold mb-2">Note</h3>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span
                          key={i}
                          className={`text-xl ${
                            i < viewingGame.rating ? "text-gaming-gold" : "text-muted-foreground"
                          }`}
                        >
                          ⭐
                        </span>
                      ))}
                      <span className="text-muted-foreground ml-2">
                        {viewingGame.rating}/5
                      </span>
                    </div>
                  </div>

                  {/* Genres */}
                  {viewingGame.genres.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Genres</h3>
                      <div className="flex flex-wrap gap-2">
                        {viewingGame.genres.map((genre) => (
                          <span
                            key={genre}
                            className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Why I liked it */}
                  {viewingGame.whyLiked && (
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
                        {new Date(viewingGame.finishedAt).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Ajouté le :</span><br />
                      {new Date(viewingGame.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setViewingGame(null);
                      handleEditGame(viewingGame);
                    }}
                    className="flex-1"
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDeleteGame(viewingGame.id);
                      setViewingGame(null);
                    }}
                  >
                    Supprimer
                  </Button>
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
