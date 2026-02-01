// src/pages/TodoPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreVertical, Pencil, Trash2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useToast } from "@/hooks/use-toast";
import type { GameDTO } from "@/lib/api";
import { listGames, updateGame, deleteGame } from "@/lib/api";
import { GameForm } from "@/components/GameForm";

export default function TodoPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);

  async function refresh() {
    try {
      const data = await listGames();
      setGames(data.filter((g: any) => g.backlog === true));
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de charger la liste À FAIRE.",
        variant: "destructive",
      });
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  const removeFromBacklog = async (g: GameDTO) => {
    try {
      await updateGame(g.id, { ...(g as any), backlog: false } as any);
      toast({ title: "Retiré de À FAIRE", description: g.title });
      refresh();
    } catch (e: any) {
      toast({ title: "Échec", description: e?.message || "Impossible de modifier.", variant: "destructive" });
    }
  };

  const handleDelete = async (g: GameDTO) => {
    if (!confirm(`Supprimer “${g.title}” ?`)) return;
    try {
      await deleteGame(g.id);
      toast({ title: "Jeu supprimé", variant: "destructive" });
      refresh();
    } catch (e: any) {
      toast({ title: "Échec", description: e?.message || "Impossible de supprimer.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">À FAIRE</h1>
              <p className="text-muted-foreground text-sm">{games.length} jeu{games.length > 1 ? "x" : ""}</p>
            </div>
          </div>
        </div>

        {games.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucun jeu dans À FAIRE.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {games.map((g) => (
              <div key={g.id} className="group relative rounded-xl overflow-hidden border border-border bg-gradient-card shadow-card">
                {/* ⋯ menu */}
                <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="secondary" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => { setEditingGame(g); setIsFormOpen(true); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => removeFromBacklog(g)}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Marquer comme fait (retirer)
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(g)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {g.coverUrl ? (
                  <img
                    src={g.coverUrl}
                    alt={g.title}
                    className="w-full aspect-[3/4] object-cover group-hover:scale-[1.02] transition-transform"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center text-muted-foreground">
                    Pas de jaquette
                  </div>
                )}

                <div className="p-3 space-y-1">
                  <div className="font-semibold leading-tight line-clamp-2">{g.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.platform || "—"} {typeof g.rating === "number" ? ` • ${g.rating}/5` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog edit */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {editingGame && (
              <GameForm
                game={editingGame as any}
                onSave={async (form) => {
                  // IMPORTANT : on conserve/force backlog=true pour rester dans la page
                  await updateGame(editingGame!.id, { ...(form as any), backlog: true } as any);
                  setIsFormOpen(false);
                  setEditingGame(null);
                  refresh();
                }}
                onCancel={() => { setIsFormOpen(false); setEditingGame(null); }}
                availableSagas={[]}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
