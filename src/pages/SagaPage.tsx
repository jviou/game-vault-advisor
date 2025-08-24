import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";
import { GameForm } from "@/components/GameForm";

// util: saga slug -> label
const fromSlug = (slug?: string) =>
  (slug || "").replace(/-/g, " ").replace(/\s+/g, " ").trim().toUpperCase();

export default function SagaPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const sagaName = useMemo(() => fromSlug(slug), [slug]);

  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  async function refresh() {
    try {
      const data = await listGames();
      // ne garder que les jeux de cette saga
      const only = data.filter((g) => (g.saga || "").toUpperCase() === sagaName);
      // tri par order asc puis createdAt asc
      only.sort((a, b) => {
        const ao = a.order ?? Number.POSITIVE_INFINITY;
        const bo = b.order ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ac - bc;
      });
      setGames(only);
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de charger la saga.",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    refresh();
  }, [slug]);

  const handleSave = async (
    form: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      if (editingGame?.id) {
        await updateGame(editingGame.id, form);
        toast({ title: "Jeu mis à jour" });
      } else {
        await createGame(form);
        toast({ title: "Jeu ajouté" });
      }
      setIsFormOpen(false);
      setEditingGame(null);
      refresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Échec de l’enregistrement.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    const g = games.find((x) => x.id === id);
    if (!confirm(`Supprimer “${g?.title ?? "ce jeu"}” ?`)) return;
    try {
      await deleteGame(id);
      toast({ title: "Jeu supprimé", variant: "destructive" });
      refresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Échec de la suppression.",
        variant: "destructive",
      });
    }
  };

  // Réorganisation simple: cliquer ↑/↓ (mobile friendly). Si tu as déjà un drag&drop,
  // tu peux garder le tien — celui-ci est minimal et fiable sur mobile.
  const bump = async (idx: number, dir: -1 | 1) => {
    const arr = [...games];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const a = arr[idx];
    const b = arr[j];
    // swap des order
    const aOrder = a.order ?? idx;
    const bOrder = b.order ?? j;

    await Promise.all([
      updateGame(a.id, { ...a, order: bOrder }),
      updateGame(b.id, { ...b, order: aOrder }),
    ]);
    refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header mobile friendly */}
        <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {sagaName || "SAGA"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {games.length} jeu{games.length > 1 ? "x" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={reorderMode ? "default" : "outline"}
              className="gap-2"
              onClick={() => setReorderMode((v) => !v)}
              title="Réorganiser"
            >
              <GripVertical className="w-4 h-4" />
              Réorganiser
            </Button>

            {/* Toujours visible sur mobile */}
            <Button
              className="gap-2 shadow-glow-primary"
              onClick={() => {
                setEditingGame(null);
                setIsFormOpen(true);
              }}
              title="Ajouter un jeu"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          </div>
        </div>

        {/* Grille responsive */}
        {games.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucun jeu dans cette saga.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {games.map((g, idx) => (
              <div
                key={g.id}
                className="group rounded-xl overflow-hidden border border-border bg-gradient-card shadow-card hover:shadow-card-hover transition"
              >
                {/* Cover */}
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

                {/* Infos compactes (toujours visibles sur mobile) */}
                <div className="p-3 space-y-2">
                  <div className="font-semibold leading-tight line-clamp-2">
                    {g.title}
                  </div>

                  {/* LIGNE INFO mobile : plateforme + genres (1–2) */}
                  <div className="text-xs flex flex-wrap items-center gap-2">
                    {g.platform && (
                      <span className="rounded px-2 py-0.5 bg-secondary/50">
                        {g.platform}
                      </span>
                    )}
                    {!!g.genres?.length &&
                      g.genres.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded px-2 py-0.5 bg-secondary/40"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>

                  {/* Actions & réorg */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-muted-foreground">
                      Note: {typeof g.rating === "number" ? `${g.rating}/5` : "–"}
                    </div>
                    {!reorderMode ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingGame(g);
                            setIsFormOpen(true);
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(g.id)}
                        >
                          Suppr.
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => bump(idx, -1)}
                          disabled={idx === 0}
                          title="Monter"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => bump(idx, +1)}
                          disabled={idx === games.length - 1}
                          title="Descendre"
                        >
                          ↓
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog : Ajouter / Modifier */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              game={
                editingGame || {
                  title: "",
                  coverUrl: "",
                  rating: 3,
                  genres: [],
                  platform: "",
                  saga: sagaName, // prérempli
                  order:
                    games.length > 0
                      ? (games[games.length - 1].order ?? games.length - 1) + 1
                      : 0,
                }
              }
              onSave={handleSave}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingGame(null);
              }}
              availableSagas={[]} // pas utile ici
            />
          </DialogContent>
        </Dialog>

        {/* FAB mobile (toujours visible) */}
        <Button
          className="fixed sm:hidden bottom-4 right-4 rounded-full h-12 w-12 shadow-glow-primary"
          onClick={() => {
            setEditingGame(null);
            setIsFormOpen(true);
          }}
          title="Ajouter un jeu"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
