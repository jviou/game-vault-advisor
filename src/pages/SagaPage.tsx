import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import GameCard from "@/components/GameCard";
import { GameForm } from "@/components/GameForm";

import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";

function titleFromSlug(slug: string) {
  return slug.replace(/-/g, " ").toUpperCase();
}

export default function SagaPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [allGames, setAllGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);

  // vue rapide
  const [viewingGame, setViewingGame] = useState<GameDTO | null>(null);

  // mode réorganisation
  const [reorderMode, setReorderMode] = useState(false);

  async function refresh() {
    try {
      const data = await listGames();
      setAllGames(data);
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de charger les jeux.",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const sagaName = useMemo(() => titleFromSlug(slug), [slug]);

  const games = useMemo(() => {
    const rows = allGames.filter(
      (g) => (g.saga || "").trim().toLowerCase() === sagaName.toLowerCase()
    );
    // ordre stable pour la page : d’abord orderIndex, puis createdAt, puis id
    return rows.sort((a, b) => {
      const ao = (a as any).orderIndex ?? Number.POSITIVE_INFINITY;
      const bo = (b as any).orderIndex ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;

      const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (ac !== bc) return ac - bc;

      return (a.id ?? 0) - (b.id ?? 0);
    });
  }, [allGames, sagaName]);

  // ---------- CRUD ----------
  const handleSaveGame = async (
    gameData: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      if (editingGame?.id != null) {
        await updateGame(editingGame.id, gameData);
        toast({ title: "Jeu mis à jour", description: gameData.title });
      } else {
        await createGame(gameData);
        toast({ title: "Jeu ajouté", description: gameData.title });
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

  // ---------- Réorganisation (HTML5 DnD) ----------
  const dragIndex = useRef<number | null>(null);

  const onDragStart = (idx: number) => (e: React.DragEvent) => {
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (idx: number) => (e: React.DragEvent) => {
    if (!reorderMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (idx: number) => async (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === idx) return;

    // copie locale
    const local = [...games];
    const [moved] = local.splice(dragIndex.current, 1);
    local.splice(idx, 0, moved);

    // assigne un orderIndex 0..n-1
    const updates = local.map((g, i) =>
      updateGame(g.id!, { ...(g as any), orderIndex: i })
    );
    try {
      await Promise.all(updates);
      toast({ title: "Ordre mis à jour" });
      dragIndex.current = null;
      refresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible d’enregistrer l’ordre.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-3 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                ← Retour
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {sagaName}
              </h1>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {games.length} {games.length > 1 ? "jeux" : "jeu"}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={reorderMode ? "default" : "outline"}
              className="gap-2"
              onClick={() => setReorderMode((v) => !v)}
              title="Réorganiser l'ordre (glisser/déposer)"
            >
              <GripVertical className="w-4 h-4" />
              Réorganiser
            </Button>

            <Button
              className="gap-2"
              onClick={() => {
                setEditingGame({
                  id: 0,
                  title: "",
                  coverUrl: "",
                  rating: 1,
                  genres: [],
                  platform: "",
                  saga: sagaName,
                } as any);
                setIsFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Grille jeux */}
        {games.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            Aucun jeu dans cette saga.
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {games.map((g, i) => (
              <div
                key={g.id}
                draggable={reorderMode}
                onDragStart={onDragStart(i)}
                onDragOver={onDragOver(i)}
                onDrop={onDrop(i)}
                className={reorderMode ? "cursor-move" : ""}
              >
                <GameCard
                  game={g}
                  onView={(gg) => setViewingGame(gg)}
                  onEdit={handleEditGame}
                  onDelete={handleDeleteGame}
                  showActions={!reorderMode}
                />
              </div>
            ))}
          </div>
        )}

        {/* Dialog : formulaire */}
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

        {/* Dialog : vue d’un jeu */}
        <Dialog
          open={!!viewingGame}
          onOpenChange={(open) => !open && setViewingGame(null)}
        >
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
}
