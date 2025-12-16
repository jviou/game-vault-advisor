import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, reorderSaga, deleteGame } from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GameForm } from "@/components/GameForm";
import GameCard from "@/components/GameCard";
import { GameDetails } from "@/components/GameDetails";
import { normalizeSaga, slugify } from "@/lib/slug";
import { useToast } from "@/hooks/use-toast";

const SANS_SAGA_NAME = "JEUX";
const SANS_SAGA_SLUG = "jeux";

// Robust coercion
function toBool(v: any): boolean {
  return v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";
}

// --- Sortable Item Wrapper ---
function SortableGameItem({
  game,
  onView,
  onEdit,
}: {
  game: GameDTO;
  onView: (g: GameDTO) => void;
  onEdit: (g: GameDTO) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: game.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <GameCard
        game={game}
        onView={onView}
        onEdit={onEdit}
        showActions
        className="h-full"
      />
    </div>
  );
}

export default function SagaPage() {
  const params = useParams();
  const slug = (params.slug || "").toLowerCase();
  const { toast } = useToast();

  const [games, setGames] = useState<GameDTO[]>([]);

  // Dialogs state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingGame, setViewingGame] = useState<GameDTO | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require movement to start drag (allows simple click)
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function refresh() {
    const data = await listGames();
    setGames(data ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  // Compute View params
  const sagaKey = useMemo<string>(() => {
    if (slug === SANS_SAGA_SLUG) return SANS_SAGA_NAME;
    return (slug || "").split("-").join(" ").toUpperCase();
  }, [slug]);

  // Filter games for THIS saga
  const items = useMemo(() => {
    const relevant = (games ?? []).filter((g) => {
      const group = normalizeSaga(g.saga) || SANS_SAGA_NAME;
      const sameSaga =
        (group === SANS_SAGA_NAME && sagaKey === SANS_SAGA_NAME) ||
        (group !== SANS_SAGA_NAME && slugify(group) === slug);
      const notPlanned = !toBool((g as any).isPlanned);
      return sameSaga && notPlanned;
    });

    // Locally sort by `order`, then `createdAt`
    return relevant.sort((a, b) => {
      const ao = a.order ?? Number.POSITIVE_INFINITY;
      const bo = b.order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      // Fallback
      const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ac - bc;
    });
  }, [games, slug, sagaKey]);

  // -- CRUD --
  const handleSave = async (data: Omit<GameDTO, "id" | "createdAt" | "updatedAt">) => {
    const payload: any = {
      ...data,
      saga: data.saga ? normalizeSaga(data.saga) : undefined,
      isPlanned: toBool((data as any).isPlanned),
    };

    if (editingGame?.id != null) {
      await updateGame(editingGame.id, payload);
    } else {
      await createGame(payload);
    }
    setIsFormOpen(false);
    setEditingGame(null);
    await refresh();
  };

  const handleDeleteGame = async (game: GameDTO) => {
    try {
      await deleteGame(game.id);
      toast({ title: "Jeu supprimé" });
      await refresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de supprimer.",
        variant: "destructive",
      });
    }
  };

  // -- DnD --
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Optimistic update
    const oldIndex = items.findIndex((g) => g.id === active.id);
    const newIndex = items.findIndex((g) => g.id === over.id);

    // New sorted array
    const newSorted = arrayMove(items, oldIndex, newIndex);

    // We update the GLOBAL list to reflect this change
    // We must find the other games (not in this list) and keep them
    const otherGames = games.filter(g => !items.includes(g));

    // We need to apply the new indices as 'order' property to the items
    // NOTE: assuming order starts at 0 or existing min
    const updates: { id: number; order: number }[] = [];

    const reorderedItems = newSorted.map((g, idx) => {
      const newOrder = idx; // 0-based for this saga
      updates.push({ id: g.id, order: newOrder });
      return { ...g, order: newOrder };
    });

    setGames([...otherGames, ...reorderedItems]);

    // Async save
    await reorderSaga(updates);
  };

  const title = sagaKey;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link to="/" className="text-sm text-primary hover:underline">
              ← Retour
            </Link>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent uppercase">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length > 1 ? "jeux" : "jeu"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setEditingGame(null);
                setIsFormOpen(true);
              }}
              className="gap-2 shadow-glow-primary"
              title="Ajouter"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Aucun jeu dans cette saga.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((g) => g.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {items.map((g) => (
                  <SortableGameItem
                    key={g.id}
                    game={g}
                    onView={(game) => {
                      setViewingGame(game);
                      setIsDetailsOpen(true);
                    }}
                    onEdit={(game) => {
                      setEditingGame(game);
                      setIsFormOpen(true);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Dialog Ajouter/Modifier */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              game={editingGame as any}
              onSave={handleSave}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingGame(null);
              }}
              availableSagas={Array.from(
                new Set(
                  games.map((g) => normalizeSaga(g.saga)).filter(Boolean) as string[]
                )
              ).sort()}
            />
          </DialogContent>
        </Dialog>

        {/* DETAILS POPUP */}
        <GameDetails
          game={viewingGame}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onDelete={handleDeleteGame}
        />
      </div>
    </div>
  );
}

