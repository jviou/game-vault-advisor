import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, GripVertical, MoreVertical, Pencil, Trash2 } from "lucide-react";
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

const SANS_SAGA_NAME = "JEUX";

export default function SagaPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // nom “humain” depuis l’URL
  const sagaHuman = useMemo(() => fromSlug(slug), [slug]);
  const sagaCanonical = useMemo(() => normalizeSaga(sagaHuman), [sagaHuman]);

  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  // fiche “jeu”
  const [viewingGame, setViewingGame] = useState<GameDTO | null>(null);

  async function refresh() {
    try {
      const data = await listGames();

      let only: GameDTO[];
      if (slug === "jeux") {
        // Cas spécial JEUX → tous les jeux sans saga
        only = data.filter((g) => !g.saga || g.saga.trim() === "");
      } else {
        // Autres sagas → comparaison normalisée
        only = data.filter((g) => normalizeSaga(g.saga) === sagaCanonical);
      }

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
      const payload = {
        ...form,
        saga: form.saga ? normalizeSaga(form.saga) : "",
      };

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

  // --- Réorganisation (flèches + drag & drop natif) ---
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
  // ---------------------------------------------------

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
                {slug === "jeux" ? SANS_SAGA_NAME : sagaCanonical || "Saga"}
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

        {/* ... (reste de ton rendu identique) ... */}
      </div>
    </div>
  );
}
