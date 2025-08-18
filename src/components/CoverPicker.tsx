import { useState, useEffect } from "react";
import { Search, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SteamGridDBClient, SGDBGame, SGDBGrid } from "@/lib/steamgriddb";
import { toast } from "@/hooks/use-toast";

interface CoverPickerProps {
  gameTitle: string;
  onCoverSelect: (url: string) => void;
  apiKey?: string;
}

export const CoverPicker = ({ gameTitle, onCoverSelect, apiKey }: CoverPickerProps) => {
  const [searchQuery, setSearchQuery] = useState(gameTitle);
  const [games, setGames] = useState<SGDBGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<SGDBGame | null>(null);
  const [grids, setGrids] = useState<SGDBGrid[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingGrids, setIsLoadingGrids] = useState(false);

  useEffect(() => {
    if (gameTitle && gameTitle !== searchQuery) {
      setSearchQuery(gameTitle);
    }
  }, [gameTitle]);

  const searchGames = async () => {
    if (!apiKey || !searchQuery.trim()) {
      toast({
        title: "Erreur",
        description: "Clé API manquante ou recherche vide",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const client = new SteamGridDBClient(apiKey);
      const results = await client.searchGames(searchQuery);
      setGames(results);
      
      if (results.length === 0) {
        toast({
          title: "Aucun résultat",
          description: "Aucun jeu trouvé pour cette recherche",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur de recherche",
        description: "Impossible de rechercher les jeux",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const loadGrids = async (game: SGDBGame) => {
    if (!apiKey) return;

    setSelectedGame(game);
    setIsLoadingGrids(true);
    
    try {
      const client = new SteamGridDBClient(apiKey);
      const gameGrids = await client.getGameGrids(game.id);
      setGrids(gameGrids);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les jaquettes",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGrids(false);
    }
  };

  const handleCoverSelect = (grid: SGDBGrid) => {
    onCoverSelect(grid.url);
    toast({
      title: "Jaquette sélectionnée",
      description: "La jaquette a été ajoutée avec succès",
    });
  };

  if (!apiKey) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        <p>Clé API SteamGridDB non configurée</p>
        <p className="text-sm">Contactez l'administrateur pour activer cette fonctionnalité</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Rechercher un jeu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchGames()}
        />
        <Button 
          onClick={searchGames} 
          disabled={isSearching || !searchQuery.trim()}
          size="sm"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {/* Games List */}
      {games.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Jeux trouvés :</h4>
          <div className="grid gap-2 max-h-32 overflow-y-auto">
            {games.map((game) => (
              <Card
                key={game.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                  selectedGame?.id === game.id ? 'bg-accent border-primary' : ''
                }`}
                onClick={() => loadGrids(game)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{game.name}</span>
                  {game.release_date && (
                    <Badge variant="outline" className="text-xs">
                      {new Date(game.release_date).getFullYear()}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Loading Grids */}
      {isLoadingGrids && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Chargement des jaquettes...</span>
        </div>
      )}

      {/* Grids Gallery */}
      {grids.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">
            Jaquettes pour "{selectedGame?.name}" :
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
            {grids.map((grid) => (
              <Card
                key={grid.id}
                className="relative overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow"
                onClick={() => handleCoverSelect(grid)}
              >
                <div className="aspect-[3/4] relative">
                  <img
                    src={grid.thumb}
                    alt={`Jaquette ${grid.id}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Download className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="p-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">
                      {grid.width}×{grid.height}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      ⭐ {grid.score}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};