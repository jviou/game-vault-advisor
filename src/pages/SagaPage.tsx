// src/pages/SagaPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, GripVertical, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import GameCard from "@/components/GameCard";
import { GameForm } from "@/components/GameForm";

import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const SagaPage = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [allGames, setAllGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);
  const [viewingGame, setViewingGame] = useState<GameDTO | null>(null);

  const [reorderMode, setReorderMode] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [ordered, setOrdered] = useState<GameDTO[]>([]);

  async function refresh() {
    try {
      const data = await listGames();
      setAllGames(data);
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

  const sagaTitle = useMemo(() => slug.replace(/-/g, " ").toUpperCase(), [slug]);

  const gamesOfSaga = useMemo(() => {
    return allGames
      .filter((g) => (g.saga || "").trim().toLowerCase() === slug.toLowerCase())
      .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }, [allGames, slug]);

  useEffect(() => {
    setOrdered(gamesOfSaga);
  }, [gamesOfSaga]);

  const handleSaveGame = async (
    gameData: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      if (editingGame?.id != null) {
        await updateGame(editingGame.id, gameData);
        toast({ title: "Jeu mis à jour", description: `${gameData.title} a été mis à jour.` });
      } else {
        await createGame(gameData);
        toast({ title: "Jeu ajouté", description: `${gameData.title} a été ajouté.` });
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
    const game = allGames.find((g) => g.id === id);
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

  const onDragStart = (index: number) => (e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (overIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === overIndex) return;
    setOrdered((prev) => {
      const copy = prev.slice();
      const [moved] = copy.splice(dragIndex, 1);
      copy.splice(overIndex, 0, moved);
      setDragIndex(overIndex);
      return copy;
    });
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragIndex(null);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {sagaTitle || "JEUX"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {gamesOfSaga.length} {gamesOfSaga.length > 1 ? "jeux" : "jeu"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={reorderMode ? "default" : "outline"}
              onClick={() => setReorderMode((v) => !v)}
              className="gap-2"
              title="Réorganiser (glisser-déposer)"
            >
              <GripVertical className="w-4 h-4" />
              {reorderMode ? "Réorganisation" : "Réorganiser"}
            </Button>

            {/* NEW bouton Ajouter */}
            <Button
              onClick={() => {
                setEditingGame({
                  id: -1,
                  title: "",
                  coverUrl: "",
                  rating: 1,
                  genres: [],
                  platform: "",
                  saga: slug.replace(/-/g, " "),
                  createdAt: "",
                  updatedAt: "",
                });
                setIsFormOpen(true);
              }}
              className="gap-2 shadow-glow-primary"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Grille */}
        {ordered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucun jeu dans cette saga.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {ordered.map((g, idx) => (
              <div
                key={g.id}
                className={reorderMode ? "cursor-move ring-2 ring-dashed ring-border rounded-xl" : ""}
                draggable={reorderMode}
                onDragStart={onDragStart(idx)}
                onDragOver={onDragOver(idx)}
                onDrop={onDrop}
              >
                <GameCard
                  game={g}
                  onEdit={() => handleEditGame(g)}
                  onDelete={() => handleDeleteGame(g.id)}
                  onView={() => setViewingGame(g)}
                />
              </div>
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
              availableSagas={Array.from(
                new Set(allGames.map((g) => g.saga?.trim()).filter(Boolean) as string[])
              ).sort()}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog : Voir un jeu */}
        <Dialog open={!!viewingGame} onOpenChange={(open) => !open && setViewingGame(null)}>
          <DialogContent className="max-w-xl w-[95vw] sm:w-auto max-h-[90vh] p-0 overflow-y-auto">
            {viewingGame && (
              <div className="grid grid-cols-1 sm:grid-cols-2">
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
                <div className="p-4 space-y-3">
                  <h3 className="text-xl font-bold">{viewingGame.title}</h3>
                  <div className="text-sm text-muted-foreground">
                    {viewingGame.platform && <div>Plateforme : {viewingGame.platform}</div>}
                    {typeof viewingGame.rating === "number" && (
                      <div>Note : {viewingGame.rating}/5</div>
                    )}
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
                  {viewingGame.whyLiked && (
                    <p className="text-sm leading-relaxed">{viewingGame.whyLiked}</p>
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

export default SagaPage;
