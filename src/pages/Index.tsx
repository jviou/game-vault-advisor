// src/pages/Index.tsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Gamepad2, EllipsisVertical, ArrowLeft } from "lucide-react";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const slug = (s: string) =>
  (s || "jeux")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const Index = () => {
  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);
  const [viewingGame, setViewingGame] = useState<GameDTO | null>(null);
  const [groupBySaga, setGroupBySaga] = useState(true); // gardé pour cohérence mais on reste en mode vignettes
  const [activeSection, setActiveSection] = useState<string | null>(null); // <- la section ouverte
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

  // Filtrage + tri
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

  // Plateformes (filtres)
  const availablePlatforms = useMemo(() => {
    return Array.from(
      new Set(filteredGames.map((g) => g.platform).filter(Boolean) as string[])
    ).sort();
  }, [filteredGames]);

  // Sagas (form datalist)
  const availableSagas = useMemo(() => {
    return Array.from(
      new Set(filteredGames.map((g) => g.saga?.trim()).filter(Boolean) as string[])
    ).sort();
  }, [filteredGames]);

  // Groupes par saga (et JEUX pour les jeux hors-saga)
  const groups = useMemo(() => {
    const map = new Map<string, GameDTO[]>();
    const unsaga: GameDTO[] = [];

    for (const g of filteredGames) {
      const key = g.saga?.trim();
      if (!key) {
        unsaga.push(g);
        continue;
      }
      const upper = key.toUpperCase();
      if (!map.has(upper)) map.set(upper, []);
      map.get(upper)!.push(g);
    }

    const arr: [string, GameDTO[]][] = [];
    if (unsaga.length) arr.push(["JEUX", unsaga]);
    for (const [k, v] of map.entries()) arr.push([k, v]);

    // JEUX en premier, puis tri alpha
    return arr.sort(([a], [b]) => {
      if (a === "JEUX") return -1;
      if (b === "JEUX") return 1;
      return a.localeCompare(b);
    });
  }, [filteredGames]);

  // Tuile d’aperçu (prend la 1re cover dispo)
  const sagaTiles = useMemo(() => {
    return groups.map(([saga, list]) => {
      const first = list.find((g) => !!g.coverUrl) || list[0];
      return {
        saga,
        count: list.length,
        thumb: first?.coverUrl || "",
      };
    });
  }, [groups]);

  // --- Import/Export ---
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

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data: GameDTO[] = JSON.parse(text);
        // reset + réinsertion
        const toDelete = await listGames();
        await Promise.allSettled(toDelete.map((g) => deleteGame(g.id)));
        for (const g of data) {
          const { id, createdAt, updatedAt, ...rest } = g as any;
          await createGame(rest);
        }
        toast({ title: "Import JSON", description: "Collection importée." });
        await refresh();
      } catch (e: any) {
        toast({
          title: "Import échoué",
          description: e?.message || "Impossible d’importer ce JSON.",
          variant: "destructive",
        });
      }
    };
    input.click();
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

  // Rendu
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" title="Plus d’options">
                  <EllipsisVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleImport}>
                  Importer JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAll}>
                  Exporter JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setGroupBySaga((v) => !v)}
                >
                  {groupBySaga ? "Désactiver le regroupement" : "Regrouper par saga"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Recherche + Filtres */}
        <div className="mb-3 sm:mb-4">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            availablePlatforms={availablePlatforms}
          />
        </div>

        {/* === VIGNETTES DE SAGAS & JEUX === */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6 mb-8">
          {groups.map(([saga, list]) => {
            const first = list.find((g) => !!g.coverUrl) || list[0];
            return (
              <button
                key={saga}
                onClick={() => setActiveSection(saga)}
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
                  <span className="text-xs bg-white/15 px-2 py-0.5 rounded-full">
                    {list.length}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* === SECTION ACTIVE UNIQUEMENT (si sélectionnée) === */}
        {activeSection && (
          <div className="space-y-4 mb-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold">{activeSection}</h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setActiveSection(null)}
              >
                <ArrowLeft className="w-4 h-4" />
                Retour aux sagas
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {(() => {
                const entry = groups.find(([s]) => s === activeSection);
                const list = entry ? entry[1] : [];
                return list.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onEdit={handleEditGame}
                    onDelete={handleDeleteGame}
                    onView={handleViewGame}
                  />
                ));
              })()}
            </div>
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
        <Dialog open={!!viewingGame} onOpenChange={(open) => !open && setViewingGame(null)}>
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
                    {viewingGame.platform && <div>Plateforme : {viewingGame.platform}</div>}
                    {typeof viewingGame.rating === "number" && <div>Note : {viewingGame.rating}/5</div>}
                    {viewingGame.saga && <div>Saga : {viewingGame.saga}</div>}
                  </div>
                  {!!viewingGame.genres?.length && (
                    <div className="flex flex-wrap gap-2">
                      {viewingGame.genres.map((g) => (
                        <span key={g} className="text-xs px-2 py-1 rounded bg-secondary/40">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                  {viewingGame.whyLiked && <p className="text-sm leading-relaxed">{viewingGame.whyLiked}</p>}
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
