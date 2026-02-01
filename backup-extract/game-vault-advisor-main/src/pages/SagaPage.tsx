import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Plus } from "lucide-react";

import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame } from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GameForm } from "@/components/GameForm";
import { normalizeSaga, slugify } from "@/lib/slug";

const SANS_SAGA_NAME = "JEUX";
const SANS_SAGA_SLUG = "jeux";

// Coercion identique à l'index
function toBool(v: any): boolean {
  return v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";
}

export default function SagaPage() {
  const params = useParams();
  const slug = (params.slug || "").toLowerCase();

  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);

  async function refresh() {
    const data = await listGames();
    setGames(data ?? []);
  }
  useEffect(() => {
    refresh();
  }, []);

  // what saga name are we viewing?
  const sagaKey = useMemo<string>(() => {
    if (slug === SANS_SAGA_SLUG) return SANS_SAGA_NAME;
    return (slug || "").split("-").join(" ").toUpperCase();
  }, [slug]);

  // show only NON planned games of that saga (robust)
  const items = useMemo(() => {
    return (games ?? []).filter((g) => {
      const group = normalizeSaga(g.saga) || SANS_SAGA_NAME; // undefined -> JEUX
      const sameSaga =
        (group === SANS_SAGA_NAME && sagaKey === SANS_SAGA_NAME) ||
        (group !== SANS_SAGA_NAME && slugify(group) === slug);
      const notPlanned = !toBool((g as any).isPlanned);
      return sameSaga && notPlanned;
    });
  }, [games, slug, sagaKey]);

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {items.map((g) => (
              <div
                key={g.id}
                className="group rounded-xl overflow-hidden border border-border bg-gradient-card shadow-card hover:shadow-card-hover transition"
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
                <div className="p-3">
                  <div className="font-semibold leading-tight line-clamp-2">
                    {g.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {g.platform || "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
      </div>
    </div>
  );
}
