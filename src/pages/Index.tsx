// src/pages/Index.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Gamepad2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import GameCard from "@/components/GameCard";
import { GameForm } from "@/components/GameForm";
import { SearchAndFilters, Filters } from "@/components/SearchAndFilters";
import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { slugify, numberKeyFromTitle } from "@/lib/slug";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type SagaTile = {
  slug: string;
  name: string;
  count: number;
  coverUrl?: string;
};

const ORDER_KEY = (slug: string) => `sagaOrder/${slug}`;

const Index = () => {
  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);
  const { toast } = useToast();

  const [filters, setFilters] = useState<Filters>({
    search: "",
    genres: [],
    minRating: 1,
    platform: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  async function refresh() {
    try {
      const data = await listGames();
      setGames(data);
    } catch (e: any) {
      toast({
        title: "Erreur de chargement",
        description: e?.message || "Impossible de charger la collection.",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // ---- filtre/tris carte par carte (pour la vue "JEUX" si tu l'affiches un jour) ----
  const filteredGames = useMemo(() => {
    let filtered = games.filter((game) => {
      if (
        filters.search &&
        !game.title?.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      if (
        filters.genres.length > 0 &&
        !filters.genres.some((g) => (game.genres || []).includes(g))
      )
        return false;
      if ((game.rating ?? 0) < filters.minRating) return false;
      if (filters.platform && game.platform !== filters.platform) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (filters.sortBy) {
        case "title":
          aValue = (a.title || "").toLowerCase();
          bValue = (b.title || "").toLowerCase();
          break;
        case "rating":
          aValue = a.rating ?? 0;
          bValue = b.rating ?? 0;
          break;
        case "finishedAt":
          aValue = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
          bValue = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
          break;
        default:
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }
      return filters.sortOrder === "asc"
        ? aValue < bValue
          ? -1
          : aValue > bValue
          ? 1
          : 0
        : aValue > bValue
        ? -1
        : aValue < bValue
        ? 1
        : 0;
    });

    return filtered;
  }, [games, filters]);

  // Plateformes (filtres)
  const availablePlatforms = useMemo(() => {
    return Array.from(
      new Set(games.map((g) => g.platform).filter(Boolean) as string[])
    ).sort();
  }, [games]);

  // ---- Groupes de sagas (avec jaquette cohérente) ----
  const sagaTiles = useMemo<SagaTile[]>(() => {
    const bySlug = new Map<
      string,
      { name: string; items: GameDTO[] }
    >();

    for (const g of filteredGames) {
      const sagaName = (g.saga || "").trim();
      const key = sagaName ? slugify(sagaName) : "jeux";
      if (!bySlug.has(key))
        bySlug.set(key, { name: sagaName || "JEUX", items: [] });
      bySlug.get(key)!.items.push(g);
    }

    const tiles: SagaTile[] = [];
    for (const [slug, { name, items }] of bySlug.entries()) {
      // 1) Ordre utilisateur enregistré ?
      const savedOrder = JSON.parse(
        localStorage.getItem(ORDER_KEY(slug)) || "[]"
      ) as number[];

      let best: GameDTO | undefined;
      if (savedOrder.length) {
        const firstId = savedOrder.find((id) =>
          items.some((g) => g.id === id)
        );
        best = items.find((g) => g.id === firstId);
      }

      // 2) Sinon on essaye de prendre le "1" (ou le plus petit numéro)
      if (!best) {
        best = [...items]
          .sort((a, b) => {
            const na = numberKeyFromTitle(a.title);
            const nb = numberKeyFromTitle(b.title);
            if (na !== nb) return na - nb;
            return (a.title || "").localeCompare(b.title || "");
          })
          .find(Boolean);
      }

      tiles.push({
        slug,
        name,
        count: items.length,
        coverUrl: best?.coverUrl || items[0]?.coverUrl || undefined,
      });
    }

    // ordre alpha sur le nom d’affichage
    tiles.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return tiles;
  }, [filteredGames]);

  // ---- Export/Import JSON (menu Actions) ----
  const handleExportAll = () => {
    try {
      const data = JSON.stringify(games, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `game-vault_${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Export JSON", description: "La collection a été exportée." });
    } catch (e: any) {
      toast({
        title: "Export échoué",
        description: e?.message || "Impossible d’exporter le JSON.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text) as GameDTO[];
        // stratégie simple : purge + recréation
        // (à adapter si tu veux fusionner)
        await Promise.all(games.map((g) => deleteGame(g.id)));
        for (const g of payload) {
          const { id, createdAt, updatedAt, ...rest } = g;
          await createGame(rest as any);
        }
        await refresh();
        toast({ title: "Import JSON", description: "Collection restaurée." });
      } catch (e: any) {
        toast({
          title: "Import échoué",
          description: e?.message || "JSON invalide.",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  // ---- CRUD helpers ----
  const handleSaveGame = async (
    gameData: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      if (editingGame?.id != null) {
        await updateGame(editingGame.id, gameData);
        toast({
          title: "Jeu mis à jour",
          description: `${gameData.title} a été mis à jour.`,
        });
      } else {
        await createGame(gameData);
        toast({
          title: "Jeu ajouté",
          description: `${gameData.title} a été ajouté à votre collection.`,
        });
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

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-glow-primary">
              <Gamepad2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Ma Collection
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {games.length} {games.length > 1 ? "jeux" : "jeu"}
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MoreVertical className="w-4 h-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Collection</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleImport}>
                  Importer JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAll}>
                  Exporter JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/">{/* placeholder */}Rafraîchir</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => {
                setEditingGame(null);
                setIsFormOpen(true);
              }}
              className="gap-2 shadow-glow-primary"
            >
              + Ajouter
            </Button>
          </div>
        </div>

        {/* Search + Filtres */}
        <div className="mb-4 sm:mb-6">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            availablePlatforms={availablePlatforms}
          />
        </div>

        {/* Sagas (vignettes) */}
        <h2 className="text-lg sm:text-xl font-semibold mb-3">Sagas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sagaTiles.map((s) => (
            <Link
              key={s.slug}
              to={`/s/${s.slug}`}
              className="group rounded-xl overflow-hidden bg-card shadow hover:shadow-lg transition"
            >
              <div className="aspect-[3/4] bg-black/30">
                {s.coverUrl ? (
                  <img
                    src={s.coverUrl}
                    alt={s.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Pas d’image
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="font-semibold uppercase tracking-wide">
                  {s.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.count} jeu{s.count > 1 ? "x" : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Dialog : Formulaire Ajouter/Modifier */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              game={editingGame as any}
              onSave={handleSaveGame}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingGame(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;
