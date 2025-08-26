import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, GripVertical, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";
import { GameForm } from "@/components/GameForm";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { normalizeSaga } from "@/lib/slug";

// util
const fromSlug = (slug?: string) =>
  (slug || "").replace(/-/g, " ").replace(/\s+/g, " ").trim();

export default function SagaPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { search } = useLocation();
  const searchTerm = useMemo(() => {
    const q = new URLSearchParams(search).get("q") || "";
    return q.trim().toLowerCase();
  }, [search]);

  // human name from URL, then normalized (UPPER)
  const sagaHuman = useMemo(() => fromSlug(slug), [slug]);
  const sagaCanonical = useMemo(() => normalizeSaga(sagaHuman), [sagaHuman]);

  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [viewingGame, setViewingGame] = useState<GameDTO | null>(null);

  async function refresh() {
    try {
      const data = await listGames();

      // filter by saga (normalized)
      let only = data.filter((g) => normalizeSaga(g.saga) === sagaCanonical);

      // if ?q= is present, filter titles again
      if (searchTerm) {
        only = only.filter((g) =>
          g.title?.toLowerCase().includes(searchTerm)
        );
      }

      // sort by order then createdAt
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
  }, [slug, searchTerm]);

  const handleSave = async (
    form: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      const payload = { ...form, saga: normalizeSaga(form.saga) };

      if (editingGame?.id) {
        await updateGame(editingGame.id, payload);
        toast({ title: "Jeu mis à jour" });
      } else {
        await createGame(payload);
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

  // -------- Reorder --------
  const bump = async (idx: number, dir: -1 | 1) => {
    const arr = [...games];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const a = arr[idx];
    const b = arr[j];
    const aOrder = a.order ?? idx;
    const bOrder = b.order ?? j;
    await Promise.all([
      updateGame(a.id, { ...a, order: bOrder }),
      updateGame(b.id, { ...b, order: aOrder }),
    ]);
    refresh();
  };

  const dragFrom = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const onDragStart = (i: number) => {
    if (!reorderMode) return;
    dragFrom.current = i;
  };
  const onDragOver = (i: number, e: React.DragEvent) => {
    if (!reorderMode) return;
    e.preventDefault();
    setDragOverIndex(i);
  };
  const onDrop = async (toIndex: number) => {
    if (!reorderMode) return;
    const fromIndex = dragFrom.current;
    dragFrom.current = null;
    setDragOverIndex(null);
    if (fromIndex == null || fromIndex === toIndex) return;

    const arr = [...games];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);

    await Promise.all(
      arr.map((g, idx) => updateGame(g.id, { ...g, order: idx }))
    );
    refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {sagaCanonical || "Saga"}
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

            <Button
              className="gap-2 shadow-glow-primary"
              onClick={() => {
                setEditingGame(null);
                setIsFormOpen(true);
              }}
              title="Ajouter"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          </div>
        </div>

        {/* Active search hint */}
        {searchTerm && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded bg-secondary/40">
              Filtre : “{searchTerm}”
            </span>
            <Link
              to={`/s/${slug}`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
              title="Effacer le filtre"
            >
              <X className="w-4 h-4" /> Effacer
            </Link>
          </div>
        )}

        {/* Grid */}
        {games.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucun jeu dans cette saga.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {games.map((g, idx) => {
              const dragging = reorderMode;
              const dragClasses =
                reorderMode && dragOverIndex === idx ? "ring-2 ring-primary" : "";

              return (
                <div
                  key={g.id}
                  className={`group relative rounded-xl overflow-hidden border border-border bg-gradient-card shadow-card hover:shadow-card-hover transition ${dragClasses}`}
                  draggable={dragging}
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={(e) => onDragOver(idx, e)}
                  onDrop={() => onDrop(idx)}
                >
                  {/* Menu */}
                  <div
                    className="absolute top-2 right-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingGame(g);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(g.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Cover */}
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => !reorderMode && setViewingGame(g)}
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
                  </button>

                  {/* Infos */}
                  <div className="p-3 space-y-2">
                    <div className="font-semibold leading-tight line-clamp-2">
                      {g.title}
                    </div>

                    <div className="text-xs flex flex-wrap items-center gap-2">
                      {g.platform && (
                        <span className="rounded px-2 py-0.5 bg-secondary/50">
                          {g.platform}
                        </span>
                      )}
                      {!!g.genres?.length &&
                        g.genres.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded px-2 py-0.5 bg-secondary/40">
                            {tag}
                          </span>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs text-muted-foreground">
                        Note: {typeof g.rating === "number" ? `${g.rating}/5` : "–"}
                      </div>
                      {reorderMode && (
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
              );
            })}
          </div>
        )}

        {/* Dialog Add / Edit */}
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
                  saga: sagaCanonical,
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
              availableSagas={[]}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
