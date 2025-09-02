// src/pages/SagaPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, GripVertical, MoreVertical, Pencil, Trash2, CheckCircle2, Inbox } from "lucide-react";
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

import { normalizeSaga, slugify } from "@/lib/slug";

// --- utils ---
const fromSlug = (slug?: string) =>
  (slug || "").replace(/-/g, " ").replace(/\s+/g, " ").trim();

const TODO_SLUG = "a-faire";
const SANS_SAGA_NAME = "JEUX";

export default function SagaPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // -------- Contexte : saga ou backlog ? --------
  const isBacklog = (slug || "").toLowerCase() === TODO_SLUG;
  const sagaHuman = useMemo(() => (isBacklog ? "À FAIRE" : fromSlug(slug)), [slug, isBacklog]);
  const sagaCanonical = useMemo(() => (isBacklog ? "À FAIRE" : normalizeSaga(sagaHuman)), [sagaHuman, isBacklog]);

  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  const [viewingGame, setViewingGame] = useState<GameDTO | null>(null);

  async function refresh() {
    try {
      const data = await listGames();

      const only = isBacklog
        ? data.filter((g: any) => g.backlog === true)
        : data.filter((g) => normalizeSaga(g.saga) === sagaCanonical);

      // tri par order puis createdAt
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
        description: e?.message || "Impossible de charger la liste.",
        variant: "destructive",
      });
    }
  }
  useEffect(() => {
    refresh();
  }, [slug]);

  // -------- Enregistrer (ajout/modif) --------
  const handleSave = async (
    form: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      let payload = { ...form };

      if (isBacklog) {
        // Dans À FAIRE: on force backlog et retire la saga
        payload = { ...payload, backlog: true as any, saga: undefined };
      } else {
        // Dans une saga: on force la saga normalisée et backlog false
        payload = { ...payload, saga: normalizeSaga(sagaHuman), backlog: false as any };
      }

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

  // -------- Suppression --------
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

  // -------- Déplacements backlog/collection --------
  const moveToBacklog = async (g: GameDTO) => {
    try {
      await updateGame(g.id, { ...g, backlog: true as any, saga: undefined, order: g.order ?? 0 });
      toast({ title: "Envoyé dans À FAIRE" });
      refresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de déplacer le jeu.",
        variant: "destructive",
      });
    }
  };

  const markAsDone = async (g: GameDTO) => {
    try {
      // Sort du backlog → retourne dans collection, sans saga (donc JEUX)
      await updateGame(g.id, { ...g, backlog: false as any, saga: undefined });
      toast({ title: "Marqué comme fait" });
      refresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de marquer comme fait.",
        variant: "destructive",
      });
    }
  };

  // -------- Réorganisation (drag & drop natif) --------
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

    await Promise.all(arr.map((g, idx) => updateGame(g.id, { ...g, order: idx })));
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
                {sagaCanonical}
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

        {/* Grille */}
        {games.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {isBacklog ? "Aucun jeu dans À FAIRE." : "Aucun jeu dans cette saga."}
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
                  {/* Menu “⋯” */}
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
                      <DropdownMenuContent align="end" className="w-56">
                        {!isBacklog ? (
                          <DropdownMenuItem onClick={() => moveToBacklog(g)}>
                            <Inbox className="w-4 h-4 mr-2" />
                            Envoyer dans “À FAIRE”
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => markAsDone(g)}>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Marquer comme fait
                          </DropdownMenuItem>
                        )}
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

                  {/* Cover + ouverture fiche */}
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

                  {/* Infos compactes */}
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
                          <span
                            key={tag}
                            className="rounded px-2 py-0.5 bg-secondary/40"
                          >
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
                  saga: isBacklog ? "" : sagaCanonical,
                  backlog: isBacklog ? (true as any) : (false as any),
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
              // On ne propose la liste des sagas que pour les pages "Saga" classiques.
              availableSagas={
                isBacklog
                  ? []
                  : Array.from(
                      new Set(
                        games
                          .map((g) => normalizeSaga(g.saga))
                          .filter(Boolean) as string[]
                      )
                    ).sort()
              }
            />
          </DialogContent>
        </Dialog>

        {/* Dialog : Fiche “jeu” (lecture) */}
        <Dialog open={!!viewingGame} onOpenChange={(o) => !o && setViewingGame(null)}>
          <DialogContent className="max-w-xl p-0 overflow-hidden">
            {viewingGame && (
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {/* Visuel */}
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

                {/* Détails */}
                <div className="p-4 space-y-3">
                  <h3 className="text-xl font-bold">{viewingGame.title}</h3>

                  <div className="text-sm text-muted-foreground space-y-1">
                    {viewingGame.platform && <div>Plateforme : {viewingGame.platform}</div>}
                    {typeof viewingGame.rating === "number" && (
                      <div>Note : {viewingGame.rating}/5</div>
                    )}
                    {!isBacklog && viewingGame.saga && (
                      <div>Saga : {normalizeSaga(viewingGame.saga)}</div>
                    )}
                    {isBacklog && <div className="font-medium">Statut : À FAIRE</div>}
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

                  <div className="pt-2 flex flex-wrap gap-2">
                    {!isBacklog ? (
                      <Button variant="secondary" onClick={() => { setViewingGame(null); moveToBacklog(viewingGame); }}>
                        <Inbox className="w-4 h-4 mr-2" />
                        Envoyer dans “À FAIRE”
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={() => { setViewingGame(null); markAsDone(viewingGame); }}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Marquer comme fait
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingGame(viewingGame);
                        setViewingGame(null);
                        setIsFormOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const id = viewingGame.id;
                        setViewingGame(null);
                        handleDelete(id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
