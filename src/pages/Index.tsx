// src/pages/Index.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Gamepad2, Upload, Download, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import GameCard from "@/components/GameCard";
import { GameForm } from "@/components/GameForm";
import { SearchAndFilters, Filters } from "@/components/SearchAndFilters";
import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);
  const [viewingGame, setViewingGame] = useState<GameDTO | null>(null);
  const { toast } = useToast();

  const importInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    genres: [],
    minRating: 1,
    platform: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Affichage groupé par saga
  const [groupBySaga, setGroupBySaga] = useState(true);

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

  // Plateformes (pour les filtres)
  const availablePlatforms = useMemo(() => {
    return Array.from(
      new Set(games.map((g) => g.platform).filter(Boolean) as string[])
    ).sort();
  }, [games]);

  // Sagas (pour la datalist du formulaire)
  const availableSagas = useMemo(() => {
    return Array.from(
      new Set(games.map((g) => g.saga?.trim()).filter(Boolean) as string[])
    ).sort();
  }, [games]);

  // Groupes par saga
  const groups = useMemo(() => {
    if (!groupBySaga) return [["Tous les jeux", filteredGames] as const];

    const map = new Map<string, GameDTO[]>();
    for (const g of filteredGames) {
      const key = g.saga?.trim() || "Jeux";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Jeux") return -1; // "Jeux" toujours en premier
      if (b === "Jeux") return 1;
      return a.localeCompare(b);
    });
  }, [filteredGames, groupBySaga]);

  // --- Export JSON de toute la collection ---
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

  // --- Import JSON ---
  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const importedGames: GameDTO[] = JSON.parse(text);

      for (const g of importedGames) {
        await createGame({
          title: g.title,
          coverUrl: g.coverUrl,
          rating: g.rating,
          genres: g.genres || [],
          whyLiked: g.whyLiked,
          platform: g.platform,
          saga: g.saga,
        });
      }

      await refresh();
      toast({
        title: "Import réussi",
        description: `${importedGames.length} jeux importés.`,
      });
    } catch (e: any) {
      toast({
        title: "Import échoué",
        description: e?.message || "Impossible d’importer le JSON.",
        variant: "destructive",
      });
    }
  };

  const handleSaveGame = async (
    gameData: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      if (editingGame?.id != null) {
        await updateGame(editingGame.id, gameData);
        toast({
          title: "Jeu mis à jour",
          description: `${gameData.title} a été mis à jour.`,
        });
      } else {
        await createGame(gameData);
        toast({
          title: "Jeu ajouté",
          description: `${gameData.title} a été ajouté à votre collection.`,
        });
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

          <div className="flex gap-2 w-full sm:w-auto items-center justify-end">
            {/* Bouton Ajouter */}
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

            {/* Menu Import/Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="ml-2">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => importInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Importer JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportAll} className="gap-2">
                  <Download className="w-4 h-4" />
                  Exporter JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Input caché pour import */}
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
              }}
            />
          </div>
        </div>

        {/* Search + Filtres */}
        <div className="mb-3 sm:mb-4">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            availablePlatforms={availablePlatforms}
          />
        </div>

        {/* Toggle regrouper par saga */}
        <div className="flex items-center gap-2 mb-6">
          <label className="text-sm text-muted-foreground">Regrouper par saga</label>
          <input
            type="checkbox"
            checked={groupBySaga}
            onChange={(e) => setGroupBySaga(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
        </div>

        {/* Grilles */}
        {groups.length === 0 || (groups.length === 1 && groups[0][1].length === 0) ? (
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
          <div className="space-y-8">
            {groups.map(([saga, list]) => (
              <section key={saga}>
                {groupBySaga && (
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg sm:text-xl font-semibold">
                      {saga}{" "}
                      <span className="text-muted-foreground">({list.length})</span>
                    </h2>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                  {list.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onEdit={handleEditGame}
                      onDelete={handleDeleteGame}
                      onView={handleViewGame}
                    />
                  ))}
                </div>
              </section>
            ))}
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
              availableSagas={availableSagas}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog : Voir un jeu */}
        <Dialog
          open={!!viewingGame}
          onOpenChange={(open) => !open && setViewingGame(null)}
        >
          <DialogContent className="max-w-xl w-[95vw] sm:w-auto max-h-[90vh] p-0 overflow-y-auto">
            {viewingGame && (
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {/* Cover */}
                <div className="bg-black/20 p-4 flex items-center justify-center">
                  {viewingGame.coverUrl ? (
                    <img
                      src={viewingGame.coverUrl}
                      alt={viewingGame.title}
                      className="rounded-lg w-full h-auto sm:max-h-none max-h-[40vh] object-contain"
                    />
                  ) : (
                    <div className="w-full aspect-[3/4] rounded-lg bg-muted flex items-center justify-center">
                      Pas de jaquette
                    </div>
                  )}
                </div>

                {/* Infos */}
                <div className="p-4 space-y-3">
                  <h3 className="text-xl font-bold">{viewingGame.title}</h3>

                  <div className="text-sm text-muted-foreground">
                    {viewingGame.platform && (
                      <div>Plateforme : {viewingGame.platform}</div>
                    )}
                    {typeof viewingGame.rating === "number" && (
                      <div>Note : {viewingGame.rating}/5</div>
                    )}
                    {viewingGame.saga && <div>Saga : {viewingGame.saga}</div>}
                  </div>

                  {!!viewingGame.genres?.length && (
                    <div className="flex flex-wrap gap-2">
                      {viewingGame.genres.map((g) => (
                        <span
                          key={g}
                          className="text-xs px-2 py-1 rounded bg-secondary/40"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {viewingGame.whyLiked && (
                    <p className="text-sm leading-relaxed">
                      {viewingGame.whyLiked}
                    </p>
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
