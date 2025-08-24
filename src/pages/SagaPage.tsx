import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import GameCard from "@/components/GameCard";
import { GameForm } from "@/components/GameForm";

import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";

function titleFromSlug(slug: string) {
  // "dragon-ball" -> "DRAGON BALL"
  return slug.replace(/-/g, " ").toUpperCase();
}

export default function SagaPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [allGames, setAllGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);

  // Chargement
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

  // Filtre par saga (slug)
  const sagaName = useMemo(() => titleFromSlug(slug), [slug]);

  const games = useMemo(() => {
    return allGames.filter(
      (g) => (g.saga || "").trim().toLowerCase() === sagaName.toLowerCase()
    );
  }, [allGames, sagaName]);

  // Edition / ajout
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
            {/* (Si tu as un mode réorganisation, tu le laisses ici) */}
            <Button variant="outline" className="gap-2">
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
                  saga: sagaName, // prérempli
                } as any);
                setIsFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Grille jeux de la saga */}
        {games.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            Aucun jeu dans cette saga.
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {games.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                // ouvrir une future « vue rapide » si tu veux
                onView={() => {}}
                onEdit={handleEditGame}
                onDelete={handleDeleteGame}
                showActions
              />
            ))}
          </div>
        )}

        {/* Dialog : formulaire ajouter / modifier */}
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
      </div>
    </div>
  );
}
