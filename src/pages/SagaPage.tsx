import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, MoreVertical, Pencil, Trash2 } from "lucide-react";

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
import { normalizeSaga, slugify, displaySaga } from "@/lib/slug";

const SANS_SAGA_NAME = "JEUX";
const SANS_SAGA_SLUG = "jeux";

export default function SagaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);

  async function refresh() {
    try {
      const data = await listGames();
      setGames(data);
    } catch (e: any) {
      toast({
        title: "Erreur de chargement",
        description: e?.message || "Impossible de charger.",
        variant: "destructive",
      });
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  // Nom lisible de la saga (slug => UPPER)
  const wantedUpper = useMemo(() => {
    if (!slug) return SANS_SAGA_NAME;
    if (slug === SANS_SAGA_SLUG) return SANS_SAGA_NAME;
    return displaySaga(slug);
  }, [slug]);

  // Filtrage local : hors backlog et par saga
  const filtered = useMemo(() => {
    const term = (params.get("q") || "").trim().toLowerCase();

    return games
      .filter((g) => g.backlog !== true) // on ne montre pas la TODO ici
      .filter((g) => {
        const s = normalizeSaga(g.saga) || SANS_SAGA_NAME;
        return wantedUpper === SANS_SAGA_NAME
          ? s === SANS_SAGA_NAME // "JEUX" = pas de saga
          : s === wantedUpper;
      })
      .filter((g) => (term ? g.title?.toLowerCase().includes(term) : true))
      .sort((a, b) => {
        const ao = a.order ?? Number.POSITIVE_INFINITY;
        const bo = b.order ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ac - bc;
      });
  }, [games, wantedUpper, params]);

  const titleForHeader = useMemo(() => {
    return wantedUpper;
  }, [wantedUpper]);

  const handleDelete = async (g: GameDTO) => {
    if (!confirm(`Supprimer “${g.title}” ?`)) return;
    try {
      await deleteGame(g.id);
      toast({ title: "Jeu supprimé", variant: "destructive" });
      refresh();
    } catch (e: any) {
      toast({
        title: "Échec",
        description: e?.message || "Impossible de supprimer.",
        variant: "destructive",
      });
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
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {titleForHeader}
              </h1>
              <p className="text-muted-foreground text-sm">
                {filtered.length} jeu{filtered.length > 1 ? "x" : ""}
              </p>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucun jeu dans cette saga.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filtered.map((g) => (
              <div
                key={g.id}
                className="group relative rounded-xl overflow-hidden border border-border bg-gradient-card shadow-card"
              >
                {/* menu contextuel */}
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
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingGame(g);
                          setIsFormOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(g)}
                      >
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

                <div className="p-3">
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
                  await updateGame(editingGame!.id, form as any);
                  setIsFormOpen(false);
                  setEditingGame(null);
                  refresh();
                }}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingGame(null);
                }}
                availableSagas={Array.from(
                  new Set(
                    games
                      .map((g) => normalizeSaga(g.saga))
                      .filter(Boolean) as string[]
                  )
                ).sort()}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
