// src/pages/Index.tsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";

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

  // ---- Filtres + Tri (inchangé) ----
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

  // Sagas (datalist formulaire)
  const availableSagas = useMemo(() => {
    return Array.from(
      new Set(games.map((g) => g.saga?.trim()).filter(Boolean) as string[])
    ).sort();
  }, [games]);

  // ---- Regroupement par saga + tri interne pour déterminer le "premier" jeu ----
  const sagasWithGames = useMemo(() => {
    // Map<Saga, GameDTO[]>
    const m = new Map<string, GameDTO[]>();

    filteredGames.forEach((g) => {
      const key = (g.saga?.trim() || "JEUX").toUpperCase(); // Harmonise en MAJ
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(g);
    });

    // Trie chaque saga pour que le "premier" soit stable : createdAt ASC puis titre
    for (const [, arr] of m) {
      arr.sort((a, b) => {
        const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aT !== bT) return aT - bT;
        return (a.title || "").localeCompare(b.title || "");
      });
    }

    // Retour trié par nom de saga (facultatif)
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredGames]);

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

  // Liste "JEUX" (jeux sans saga)
  const jeuxSansSaga: GameDTO[] = useMemo(() => {
    const entry = sagasWithGames.find(([s]) => s === "JEUX");
    return entry ? entry[1] : [];
  }, [sagasWithGames]);

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

        {/* Search + Filtres */}
        <div className="mb-6 sm:mb-8">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            availablePlatforms={availablePlatforms}
          />
        </div>

        {/* ===== Section Sagas (vignettes) ===== */}
        <section className="space-y-4 mb-10">
          <h2 className="text-xl font-semibold">Sagas</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {sagasWithGames
              .filter(([s]) => s !== "JEUX")
              .map(([sagaName, list]) => {
                if (list.length === 0) return null;

                // 👉 1er jeu de la saga = vignette
                const coverGame = list[0]; // <- Mets list[list.length - 1] pour "dernier ajouté"
                const cover = coverGame.coverUrl || "/default-cover.jpg";
                const slug = encodeURIComponent(sagaName.toLowerCase());

                return (
                  <Link
                    key={sagaName}
                    to={`/s/${slug}`}
                    className="group rounded-xl overflow-hidden bg-card/60 border hover:bg-card transition-colors"
                    title={sagaName}
                  >
                    <div className="relative">
                      <img
                        src={cover}
                        alt={sagaName}
                        className="w-full aspect-[3/4] object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <div className="font-semibold text-white drop-shadow">
                          {sagaName}
                        </div>
                        <div className="text-xs text-white/80">
                          {list.length} jeu(x)
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </section>

        {/* ===== Section JEUX (jeux sans saga) ===== */}
        {jeuxSansSaga.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">JEUX</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {jeuxSansSaga.map((game) => (
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
