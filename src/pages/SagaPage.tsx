import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { MoreVertical, Send, CheckCircle2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import type { GameDTO } from "@/lib/api";
import { listGames, updateGame, deleteGame, createGame } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { GameForm } from "@/components/GameForm";
import { normalizeSaga, slugify, deslugify } from "@/lib/slug";

const SANS_SAGA_NAME = "JEUX";

export default function SagaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [query] = useSearchParams();
  const { toast } = useToast();

  const [games, setGames] = useState<GameDTO[]>([]);
  const [editing, setEditing] = useState<GameDTO | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const searchTerm = (query.get("q") || "").toLowerCase();

  async function refresh() {
    try {
      const data = await listGames();
      setGames(data);
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
  }, [slug]);

  // Détermination du nom de saga à partir du slug
  const sagaNameUpper = useMemo(() => {
    if (!slug) return "";
    const raw = deslugify(slug);
    const norm = normalizeSaga(raw);
    return norm || SANS_SAGA_NAME;
  }, [slug]);

  // Jeux de la saga (hors backlog)
  const items = useMemo(() => {
    const isJeux = sagaNameUpper === SANS_SAGA_NAME;
    return games
      .filter((g) => !(g as any).backlog) // exclure backlog
      .filter((g) =>
        isJeux ? !normalizeSaga(g.saga) : normalizeSaga(g.saga) === sagaNameUpper
      )
      .filter((g) =>
        searchTerm ? g.title?.toLowerCase().includes(searchTerm) : true
      )
      .sort((a, b) => {
        const ao = a.order ?? Number.POSITIVE_INFINITY;
        const bo = b.order ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ac - bc;
      });
  }, [games, sagaNameUpper, searchTerm]);

  // Actions
  const moveToBacklog = async (g: GameDTO) => {
    try {
      await updateGame(g.id!, { backlog: true });
      toast({ title: `« ${g.title} » envoyé dans À FAIRE` });
      refresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible d’envoyer dans À FAIRE.",
        variant: "destructive",
      });
    }
  };

  const markDone = async (g: GameDTO) => {
    try {
      await updateGame(g.id!, { backlog: false });
      toast({ title: `« ${g.title} » marqué comme fait` });
      refresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de marquer comme fait.",
        variant: "destructive",
      });
    }
  };

  const remove = async (g: GameDTO) => {
    if (!confirm(`Supprimer « ${g.title} » ?`)) return;
    try {
      await deleteGame(g.id!);
      toast({ title: "Jeu supprimé" });
      refresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de supprimer.",
        variant: "destructive",
      });
    }
  };

  const handleSaveGame = async (
    payload: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      const data: any = {
        ...payload,
        saga: payload.saga ? normalizeSaga(payload.saga) : undefined,
      };
      if (editing?.id) {
        await updateGame(editing.id, data);
        toast({ title: "Jeu mis à jour" });
      } else {
        await createGame(data);
        toast({ title: "Jeu ajouté" });
      }
      setIsFormOpen(false);
      setEditing(null);
      refresh();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Échec de l’enregistrement.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent uppercase">
            {sagaNameUpper}
          </h1>
          <p className="text-muted-foreground text-sm">
            {items.length} jeu{items.length > 1 ? "x" : ""}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            Aucun jeu dans cette saga.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {items.map((g) => (
              <div
                key={g.id}
                className="group rounded-xl overflow-hidden border border-border bg-gradient-card shadow-card transition hover:shadow-card-hover"
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

                <div className="flex items-start justify-between p-3">
                  <div className="pr-2">
                    <div className="font-semibold leading-tight line-clamp-2">
                      {g.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {g.platform || ""}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem
                        onClick={() => moveToBacklog(g)}
                        className="gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Envoyer dans « À FAIRE »
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(g);
                          setIsFormOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => remove(g)}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulaire Ajouter/Modifier */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              game={editing as any}
              onSave={handleSaveGame}
              onCancel={() => {
                setIsFormOpen(false);
                setEditing(null);
              }}
              availableSagas={Array.from(
                new Set(
                  games
                    .filter((x) => !(x as any).backlog)
                    .map((x) => normalizeSaga(x.saga))
                    .filter(Boolean) as string[]
                )
              ).sort()}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
