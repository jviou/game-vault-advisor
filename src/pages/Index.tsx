import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

import { slugify, normalizeSaga } from "@/lib/slug";

const SANS_SAGA_NAME = "JEUX";
const SANS_SAGA_SLUG = "jeux";

export default function Index() {
  const { toast } = useToast();

  const [games, setGames] = useState<GameDTO[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    genres: [],
    minRating: 1,
    platform: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // ---- Load ----
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

  // ---- Platforms for filters ----
  const availablePlatforms = useMemo(() => {
    return Array.from(
      new Set(games.map((g) => g.platform).filter(Boolean) as string[])
    ).sort();
  }, [games]);

  // ---- Filtering (game-level) ----
  const matchingGames: GameDTO[] = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return games.filter((game) => {
      if (term && !game.title?.toLowerCase().includes(term)) return false;
      if (filters.genres.length > 0 && !filters.genres.some((g) => (game.genres || []).includes(g))) return false;
      if ((game.rating ?? 0) < filters.minRating) return false;
      if (filters.platform && game.platform !== filters.platform) return false;
      return true;
    });
  }, [games, filters]);

  const hasActiveSearch = filters.search.trim().length > 0;

  // ---- Grouping into sagas from the already-filtered list ----
  type SagaGroup = {
    name: string;     // display (UPPERCASE)
    slug: string;     // /s/<slug>
    items: GameDTO[];
    cover?: string;
    count: number;
  };

  const { jeuxGroup, sagaGroups } = useMemo(() => {
    const map = new Map<string, GameDTO[]>();
    for (const g of matchingGames) {
      const key = normalizeSaga(g.saga) || SANS_SAGA_NAME;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }

    let jeuxGroup: SagaGroup | null = null;
    const sagas: SagaGroup[] = [];

    for (const [nameUpper, items] of map.entries()) {
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

      const group = { name: nameUpper, slug, items, cover, count: items.length };
      if (nameUpper === SANS_SAGA_NAME) jeuxGroup = group;
      else sagas.push(group);
    }

    sagas.sort((a, b) => a.name.localeCompare(b.name));
    return { jeuxGroup, sagaGroups: sagas };
  }, [matchingGames]);

  // ---- Create / update ----
  const handleSaveGame = async (
    gameData: Omit<GameDTO, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
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

  // ---- Export ----
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

  // ---- Import ----
  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload = JSON.parse(String(reader.result)) as GameDTO[];
        for (const g of payload) {
          const { id, createdAt, updatedAt, ...rest } = g as any;
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

  // --- helpers for result links ---
  const sagaSlugFor = (g: GameDTO) => {
    const nameUpper = normalizeSaga(g.saga) || SANS_SAGA_NAME;
    return nameUpper === SANS_SAGA_NAME ? SANS_SAGA_SLUG : slugify(nameUpper);
  };

  // ===== Bulk actions on sagas (rename / delete -> move to JEUX) =====
  const renameSaga = async (group: SagaGroup) => {
    const current = group.name;
    if (current === SANS_SAGA_NAME) return;

    const proposed = window.prompt("New saga name:", current);
    const newName = (proposed || "").trim();
    if (!newName || normalizeSaga(newName) === current) return;

    try {
      await Promise.all(
        group.items.map((g) =>
          updateGame(g.id, { ...g, saga: normalizeSaga(newName) })
        )
      );
      toast({ title: "Saga renamed", description: `${current} → ${normalizeSaga(newName)}` });
      refresh();
    } catch (e: any) {
      toast({
        title: "Rename failed",
        description: e?.message || "Unable to rename saga.",
        variant: "destructive",
      });
    }
  };

  const deleteSagaToJeux = async (group: SagaGroup) => {
    const current = group.name;
    if (current === SANS_SAGA_NAME) return;

    const ok = window.confirm(
      `Delete saga “${current}” ?\n\nThis will NOT delete games.\nAll games will be moved to JEUX.`
    );
    if (!ok) return;

    try {
      await Promise.all(
        group.items.map((g) => updateGame(g.id, { ...g, saga: undefined }))
      );
      toast({ title: "Saga deleted", description: `Games moved to ${SANS_SAGA_NAME}.` });
      refresh();
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || "Unable to delete saga.",
        variant: "destructive",
      });
    }
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

          {/* Actions */}
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

        {/* Search + Filters */}
        <div className="mb-3 sm:mb-4">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            availablePlatforms={availablePlatforms}
          />
        </div>

        {/* ===== Results (game cards) when searching ===== */}
        {hasActiveSearch && (
          <>
            <h2 className="text-lg font-semibold mb-3">
              Résultats ({matchingGames.length})
            </h2>

            {matchingGames.length === 0 ? (
              <div className="text-muted-foreground mb-8">Aucun jeu trouvé.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
                {matchingGames.map((g) => {
                  const slug = sagaSlugFor(g);
                  const to = `/s/${slug}?q=${encodeURIComponent(filters.search.trim())}`;
                  return (
                    <Link
                      key={g.id}
                      to={to}
                      className="group rounded-xl overflow-hidden border border-border bg-gradient-card shadow-card hover:shadow-card-hover transition block"
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
                        <div className="font-semibold leading-tight line-clamp-2">{g.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {normalizeSaga(g.saga) || SANS_SAGA_NAME}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* === JEUX banner (no overlay/no caption) === */}
        {jeuxGroup && (
          <Link
            to={`/s/${jeuxGroup.slug}`}
            className="relative mb-8 block w-full overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-card transition hover:shadow-card-hover"
          >
            <img
              src="/banner_jeux_1600x450.jpg"
              srcSet="/banner_jeux_1024x360.jpg 1024w, /banner_jeux_1600x450.jpg 1600w, /banner_jeux_1920x500.jpg 1920w"
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 90vw, 1200px"
              alt="Section JEUX"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "center 50%" }}
            />
            <div className="relative flex min-h-[140px] sm:min-h-[160px] lg:min-h-[180px]" />
          </Link>
        )}

        {/* Sagas */}
        <h2 className="text-lg font-semibold mb-3">Sagas</h2>
        {sagaGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucune saga.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {sagaGroups.map((g) => (
              <div key={g.slug} className="relative">
                {/* ⋯ menu (hidden for JEUX) */}
                {g.name !== SANS_SAGA_NAME && (
                  <div className="absolute top-2 right-2 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => renameSaga(g)}>
                          Renommer la saga…
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteSagaToJeux(g)}
                        >
                          Supprimer (déplacer vers JEUX)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                <Link
                  to={`/s/${g.slug}${hasActiveSearch ? `?q=${encodeURIComponent(filters.search.trim())}` : ""}`}
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
              </div>
            ))}
          </div>
        )}

        {/* Dialog Ajouter/Modifier */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              game={editingGame as any}
              onSave={handleSaveGame}
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
