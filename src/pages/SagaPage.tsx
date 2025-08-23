// src/pages/SagaPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import type { GameDTO } from "@/lib/api";
import { listGames, deleteGame, updateGame, createGame } from "@/lib/api";
import GameCard from "@/components/GameCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GameForm } from "@/components/GameForm";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const deslug = (s: string) =>
  s.replace(/-/g, " ").trim().toUpperCase();

export default function SagaPage() {
  const { sagaSlug = "jeux" } = useParams();
  const title = deslug(sagaSlug); // "JEUX", "DRAGON QUEST", ...
  const isJeux = title === "JEUX";

  const { toast } = useToast();
  const [games, setGames] = useState<GameDTO[]>([]);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);
  const [viewingGame, setViewingGame] = useState<GameDTO | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
  useEffect(() => { refresh(); }, []);

  const list = useMemo(() => {
    return games.filter(g =>
      isJeux ? !g.saga : (g.saga || "").trim().toUpperCase() === title
    );
  }, [games, isJeux, title]);

  const handleEditGame = (game: GameDTO) => {
    setEditingGame(game);
    setIsFormOpen(true);
  };

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

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header compact pour mobile */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-glow-primary">
              <Gamepad2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">{list.length} jeu(s)</p>
            </div>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
          </Button>
        </div>

        {/* Grille des jeux de la saga */}
        {list.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Aucun jeu.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {list.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onEdit={handleEditGame}
                onDelete={handleDeleteGame}
                onView={setViewingGame}
              />
            ))}
          </div>
        )}

        {/* Formulaire Ajouter/Modifier */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              game={editingGame as any}
              onSave={handleSaveGame}
              onCancel={() => { setIsFormOpen(false); setEditingGame(null); }}
              availableSagas={Array.from(
                new Set(games.map(g => g.saga?.trim()).filter(Boolean) as string[])
              ).sort()}
            />
          </DialogContent>
        </Dialog>

        {/* Fiche jeu */}
        <Dialog open={!!viewingGame} onOpenChange={(open) => !open && setViewingGame(null)}>
          <DialogContent className="max-w-xl w-[95vw] sm:w-auto max-h-[90vh] p-0 overflow-y-auto">
            {viewingGame && (
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className="bg-black/20 p-4 flex items-center justify-center">
                  {viewingGame.coverUrl ? (
                    <img src={viewingGame.coverUrl} alt={viewingGame.title}
                      className="rounded-lg w-full h-auto sm:max-h-none max-h-[40vh] object-contain" />
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
                    {typeof viewingGame.rating === "number" && <div>Note : {viewingGame.rating}/5</div>}
                    {viewingGame.saga && <div>Saga : {viewingGame.saga}</div>}
                  </div>
                  {!!viewingGame.genres?.length && (
                    <div className="flex flex-wrap gap-2">
                      {viewingGame.genres.map((g) => (
                        <span key={g} className="text-xs px-2 py-1 rounded bg-secondary/40">{g}</span>
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
}
