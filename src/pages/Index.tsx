import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Gamepad2, Plus, MoreVertical, Upload, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SearchAndFilters, type Filters } from "@/components/SearchAndFilters";
import { useToast } from "@/hooks/use-toast";

import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame } from "@/lib/api";
import { GameForm } from "@/components/GameForm";

// ---> IMPORTANT : on utilise ceux du fichier utils
import { slugify, normalizeSaga } from "@/lib/slug";

const SANS_SAGA_NAME = "JEUX";   // affichage & groupage
const SANS_SAGA_SLUG = "jeux";   // route pour la section "JEUX"

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);

  // Filtres existants
  const [filters, setFilters] = useState<Filters>({
    search: "",
    genres: [],
    minRating: 1,
    platform: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Chargement
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

  // Plateformes pour le filtre
  const availablePlatforms = useMemo(() => {
    return Array.from(
      new Set(games.map((g) => g.platform).filter(Boolean) as string[])
    ).sort();
  }, [games]);

  // ---- Groupage par saga (MAJUSCULES) + cover + slug ----
  type SagaGroup = {
    name: string;      // affichage (MAJUSCULES)
    slug: string;      // route /s/<slug>
    items: GameDTO[];  // jeux du groupe
    cover?: string;    // url de la cover choisie
    count: number;
  };

  const sagaGroups: SagaGroup[] = useMemo(() => {
    // appliquer les filtres avant de regrouper
    const filtered = games.filter((game) => {
      if (filters.search && !game.title?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.genres.length > 0 && !filters.genres.some((g) => (game.genres || []).includes(g))) return false;
      if ((game.rating ?? 0) < filters.minRating) return false;
      if (filters.platform && game.platform !== filters.platform) return false;
      return true;
    });

    // groupage : clé = saga normalisée en MAJUSCULES, sinon "JEUX"
    const map = new Map<string, GameDTO[]>();
    for (const g of filtered) {
      const key = normalizeSaga(g.saga) || SANS_SAGA_NAME;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }

    // calcul cover + slug + tri interne pour trouver le "premier"
    const groups: SagaGroup[] = Array.from(map.entries()).map(([nameUpper, items]) => {
      const sorted = [...items].sort((a, b) => {
        const ao = a.order ?? Number.POSITIVE_INFINITY;
        const bo = b.order ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ac - bc;
      });
      const cover = sorted[0]?.coverUrl;

      const slug = nameUpper === SANS_SAGA_NAME ? SANS_SAGA_SLUG : slugify(nameUpper);
      return { name: nameUpper, slug, items, cover, count: items.length };
    });

    // tri alpha, en gardant JEUX en premier
    groups.sort((a, b) => {
      if (a.name === SANS_SAGA_NAME && b.name !== SANS_SAGA_NAME) return -1;
      if (b.name === SANS_SAGA_NAME && a.name !== SANS_SAGA_NAME) return 1;
      return a.name.localeCompare(b.name);
    });

    return groups;
  }, [games, filters]);

  // ---- Ajouter / modifier ----
  const handleSaveGame = async (gameData: Omit<GameDTO, "id" | "createdAt" | "updatedAt">) => {
    try {
      // on normalise la saga à l’enregistrement (pour éviter de re-créer crash bandicoot / CRASH BANDICOOT)
      const payload = {
        ...gameData,
        saga: gameData.saga ? normalizeSaga(gameData.saga) : undefined,
      };

      if (editingGame?.id != null) {
        await updateGame(editingGame.id, payload);
        toast({ title: "Jeu mis à jour" });
      } else {
        await createGame(payload);
        toast({ title: "Jeu ajouté" });
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

  // Export JSON
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

  // Import JSON
  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload = JSON.parse(String(reader.result)) as GameDTO[];
        for (const g of payload) {
          const { id, createdAt, updatedAt, ...rest } = g as any;
          // normalise la saga au passage
          await createGame({
            ...rest,
            saga: rest.saga ? normalizeSaga(rest.saga) : undefined,
          });
        }
        toast({ title: "Import JSON", description: "Import terminé." });
        refresh();
      } catch (e: any) {
        toast({
          title: "Import échoué",
          description: e?.message || "Le fichier n’est pas valide.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4">
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

          {/* Menu Actions + bouton Ajouter desktop */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MoreVertical className="w-4 h-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <label className="w-full">
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImport(f);
                      e.currentTarget.value = "";
                    }}
                  />
                  <DropdownMenuItem className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Importer JSON
                  </DropdownMenuItem>
                </label>
                <DropdownMenuItem onClick={handleExportAll}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => {
                setEditingGame(null);
                setIsFormOpen(true);
              }}
              className="gap-2 shadow-glow-primary hidden sm:flex"
              title="Ajouter"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Barre de recherche + filtres */}
        <div className="mb-3 sm:mb-4">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            availablePlatforms={availablePlatforms}
          />
        </div>

        {/* Section Sagas */}
        <h2 className="text-lg font-semibold mb-3">Sagas</h2>

        {sagaGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucun résultat.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {sagaGroups.map((g) => (
              <Link
                key={g.slug}
                to={`/s/${g.slug}`} // JEUX -> /s/jeux
                className="group rounded-xl overflow-hidden border border-border bg-gradient-card shadow-card hover:shadow-card-hover transition block"
              >
                {g.cover ? (
                  <img
                    src={g.cover}
                    alt={g.name}
                    className="w-full aspect-[3/4] object-cover group-hover:scale-[1.02] transition-transform"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center text-muted-foreground">
                    Pas de jaquette
                  </div>
                )}
                <div className="p-3">
                  <div className="font-semibold leading-tight line-clamp-2 uppercase">
                    {g.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {g.count} jeu{g.count > 1 ? "x" : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

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
              // Sagas proposées en autocomplétion : on les normalise (MAJUSCULES)
              availableSagas={Array.from(
                new Set(
                  games
                    .map((g) => normalizeSaga(g.saga))
                    .filter(Boolean) as string[]
                )
              ).sort()}
            />
          </DialogContent>
        </Dialog>

        {/* FAB mobile “+” */}
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
