import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Gamepad2, Plus, MoreVertical, Upload, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SearchAndFilters, type Filters } from "@/components/SearchAndFilters";
import { useToast } from "@/hooks/use-toast";

import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";
import { GameForm } from "@/components/GameForm";
import { GameDetails } from "@/components/GameDetails";

import { slugify, normalizeSaga } from "@/lib/slug";

const SANS_SAGA_NAME = "JEUX";
const SANS_SAGA_SLUG = "jeux";

export default function Index() {
  const { toast } = useToast();

  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingGame, setViewingGame] = useState<GameDTO | null>(null);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    genres: [],
    minRating: 1,
    platform: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // ---- Load ----
  const refresh = useCallback(async () => {
    try {
      const data = await listGames();
      setGames(data ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Impossible de charger la collection.";
      toast({
        title: "Erreur de chargement",
        description: message,
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ---- Platforms for the filter ----
  const availablePlatforms = useMemo(() => {
    return Array.from(
      new Set(games.map((g) => g.platform).filter(Boolean) as string[])
    ).sort();
  }, [games]);

  // Count of backlog games
  const backlogCount = useMemo(
    () => games.filter((g) => g.backlog === true).length,
    [games]
  );

  // Collection = NOT backlog
  const nonBacklogGames = useMemo(
    () => games.filter((g) => g.backlog !== true),
    [games]
  );

  // Filtered search dataset (only on non-backlog games)
  const matchingGames: GameDTO[] = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return nonBacklogGames.filter((game) => {
      if (term && !game.title?.toLowerCase().includes(term)) return false;
      if (filters.genres.length > 0 && !filters.genres.some((g) => (game.genres || []).includes(g))) return false;
      if ((game.rating ?? 0) < filters.minRating) return false;
      if (filters.platform && game.platform !== filters.platform) return false;
      return true;
    });
  }, [nonBacklogGames, filters]);

  const hasActiveSearch = filters.search.trim().length > 0;

  type SagaGroup = {
    name: string;
    slug: string;
    items: GameDTO[];
    cover?: string;
    count: number;
  };

  // Build saga groups from filtered non-backlog games
  const { sagaGroups } = useMemo(() => {
    const map = new Map<string, GameDTO[]>();
    for (const g of matchingGames) {
      const key = normalizeSaga(g.saga) || SANS_SAGA_NAME;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }

    const sagas: SagaGroup[] = [];

    for (const [nameUpper, items] of map.entries()) {
      const sorted = [...items].sort((a, b) => {
        const ao = a.order ?? Number.POSITIVE_INFINITY;
        const bo = b.order ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ac - bc;
      });

      const cover = sorted[0]?.coverUrl;
      const slug = nameUpper === SANS_SAGA_NAME ? SANS_SAGA_SLUG : slugify(nameUpper);
      const group: SagaGroup = { name: nameUpper, slug, items, cover, count: items.length };
      sagas.push(group);
    }

    sagas.sort((a, b) => a.name.localeCompare(b.name));
    return { sagaGroups: sagas };
  }, [matchingGames]);

  // ---- Create / update ----
  const handleSaveGame = async (
    gameData: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      const payload = {
        ...gameData,
        saga: gameData.saga ? normalizeSaga(gameData.saga) : undefined,
      };

      if (editingGame?.id != null) {
        await updateGame(editingGame.id, payload);
        toast({ title: "Jeu mis à jour" });
      } else {
        await createGame(payload);
        toast({ title: "Jeu ajouté" });
      }
      setIsFormOpen(false);
      setEditingGame(null);
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de l'enregistrement.";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  // ---- Delete ----
  const handleDeleteGame = async (game: GameDTO) => {
    try {
      await deleteGame(game.id);
      toast({ title: "Jeu supprimé" });
      setIsDetailsOpen(false);
      setViewingGame(null);
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Impossible de supprimer.";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  // ---- Export ----
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
    } catch (e) {
      const message = e instanceof Error ? e.message : "Impossible d'exporter le JSON.";
      toast({ title: "Export échoué", description: message, variant: "destructive" });
    }
  };

  // ---- Import ----
  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        console.log("[IMPORT] Début de l'import du fichier:", file.name);
        const rawData = String(reader.result);
        const parsed: unknown = JSON.parse(rawData);

        let payload: GameDTO[];
        if (Array.isArray(parsed)) {
          payload = parsed as GameDTO[];
          console.log("[IMPORT] Format Array de", payload.length, "jeux");
        } else if (
          parsed !== null &&
          typeof parsed === "object" &&
          "games" in parsed &&
          Array.isArray((parsed as Record<string, unknown>).games)
        ) {
          payload = (parsed as { games: GameDTO[] }).games;
          console.log("[IMPORT] Format Object.games de", payload.length, "jeux");
        } else {
          throw new Error("Format JSON non supporté. Attendu: Array ou {games: Array}");
        }

        if (payload.length === 0) {
          toast({
            title: "Import vide",
            description: "Le fichier JSON ne contient aucun jeu.",
            variant: "destructive",
          });
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const g of payload) {
          try {
            const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = g;
            await createGame({
              ...rest,
              saga: rest.saga ? normalizeSaga(rest.saga) : undefined,
            });
            successCount++;
          } catch (err) {
            console.error(`Erreur pour "${g.title}":`, err instanceof Error ? err.message : err);
            errorCount++;
          }
        }

        await refresh();

        if (errorCount > 0) {
          toast({
            title: "Import partiel",
            description: `${successCount} jeux importés, ${errorCount} erreurs. Voir la console (F12).`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Import réussi",
            description: `${successCount} jeux importés avec succès.`,
          });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Le fichier n'est pas valide.";
        console.error("[IMPORT] Erreur fatale:", e);
        toast({ title: "Import échoué", description: message, variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4">
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

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MoreVertical className="w-4 h-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <label className="w-full">
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImport(f);
                      e.currentTarget.value = "";
                    }}
                  />
                  <DropdownMenuItem className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Importer JSON
                  </DropdownMenuItem>
                </label>
                <DropdownMenuItem onClick={handleExportAll}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => {
                setEditingGame(null);
                setIsFormOpen(true);
              }}
              className="gap-2 shadow-glow-primary hidden sm:flex"
              title="Ajouter"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="mb-3 sm:mb-4">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            availablePlatforms={availablePlatforms}
          />
        </div>

        {/* Banner À FAIRE */}
        <Link
          to="/todo"
          className="relative mb-8 block w-full overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-card transition hover:shadow-card-hover"
        >
          <img
            src="/banner_todo_1600x450.jpg"
            alt="Section À FAIRE"
            className="w-full h-auto object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white drop-shadow-md tracking-wider">
                À FAIRE
              </h2>
              <p className="text-white/90 text-sm sm:text-lg font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm mx-auto w-fit mt-2">
                {backlogCount} jeux
              </p>
            </div>
          </div>
        </Link>

        {/* Banner JEUX */}
        <Link
          to={`/s/${SANS_SAGA_SLUG}`}
          className="relative mb-8 block w-full overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-card transition hover:shadow-card-hover"
        >
          <img
            src="/banner_jeux_1600x450.jpg"
            srcSet="/banner_jeux_1024x360.jpg 1024w, /banner_jeux_1600x450.jpg 1600w, /banner_jeux_1920x500.jpg 1920w"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 90vw, 1200px"
            alt="Section JEUX"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "center 50%" }}
          />
          <div className="relative flex min-h-[140px] sm:min-h-[160px] lg:min-h-[180px]" />
        </Link>

        {/* Résultats de recherche */}
        {hasActiveSearch && (
          <>
            <h2 className="text-lg font-semibold mb-3">
              Résultats ({matchingGames.length})
            </h2>

            {matchingGames.length === 0 ? (
              <div className="text-muted-foreground mb-8">Aucun jeu trouvé.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
                {matchingGames.map((g) => {
                  const nameUpper = normalizeSaga(g.saga) || SANS_SAGA_NAME;
                  return (
                    <div
                      key={g.id}
                      onClick={() => {
                        setViewingGame(g);
                        setIsDetailsOpen(true);
                      }}
                      className="group rounded-xl overflow-hidden border border-border bg-gradient-card shadow-card hover:shadow-card-hover transition block cursor-pointer"
                    >
                      {g.coverUrl ? (
                        <img
                          src={g.coverUrl}
                          alt={g.title}
                          className="w-full aspect-[3/4] object-cover group-hover:scale-[1.02] transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center text-muted-foreground">
                          Pas de jaquette
                        </div>
                      )}
                      <div className="p-3">
                        <div className="font-semibold leading-tight line-clamp-2">{g.title}</div>
                        <div className="text-xs text-muted-foreground">{nameUpper}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Sagas */}
        <h2 className="text-lg font-semibold mb-3">Sagas</h2>
        {sagaGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucune saga.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {sagaGroups.map((g) => (
              <Link
                key={g.slug}
                to={`/s/${g.slug}`}
                className="group rounded-xl overflow-hidden border border-border bg-gradient-card shadow-card hover:shadow-card-hover transition block"
              >
                {g.cover ? (
                  <img
                    src={g.cover}
                    alt={g.name}
                    className="w-full aspect-[3/4] object-cover group-hover:scale-[1.02] transition-transform"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center text-muted-foreground">
                    Pas de jaquette
                  </div>
                )}
                <div className="p-3">
                  <div className="font-semibold leading-tight line-clamp-2 uppercase">
                    {g.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {g.count} jeu{g.count > 1 ? "x" : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Dialog Ajouter/Modifier */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              game={editingGame}
              onSave={handleSaveGame}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingGame(null);
              }}
              availableSagas={Array.from(
                new Set(
                  games.map((g) => normalizeSaga(g.saga)).filter(Boolean) as string[]
                )
              ).sort()}
            />
          </DialogContent>
        </Dialog>

        {/* Détails popup */}
        <GameDetails
          game={viewingGame}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onDelete={handleDeleteGame}
        />

        {/* FAB mobile */}
        <Button
          className="fixed sm:hidden bottom-4 right-4 rounded-full h-12 w-12 shadow-glow-primary"
          onClick={() => {
            setEditingGame(null);
            setIsFormOpen(true);
          }}
          title="Ajouter"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
