// src/pages/Index.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Gamepad2,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import type { GameDTO } from "@/lib/api";
import { listGames, createGame } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

import { GameForm } from "@/components/GameForm";

// --- utils ---
function slugify(s: string) {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

type SagaCard = {
  name: string;        // "DRAGON QUEST"
  slug: string;        // "dragon-quest" ("/s/:slug")
  count: number;       // nb jeux
  coverUrl?: string;   // jaquette (1er jeu trié)
};

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [games, setGames] = useState<GameDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // Search (sur les sagas)
  const [query, setQuery] = useState("");

  // Ajouter un jeu
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Import JSON
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      setLoading(true);
      const data = await listGames();
      setGames(data);
    } catch (e: any) {
      toast({
        title: "Erreur de chargement",
        description: e?.message || "Impossible de charger la collection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // Regroupement par saga + jaquette = 1er jeu trié
  const sagaCards: SagaCard[] = useMemo(() => {
    // Map saga => jeux
    const map = new Map<string, GameDTO[]>();
    for (const g of games) {
      const key = g.saga?.trim() || "JEUX";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }

    const all: SagaCard[] = [];
    map.forEach((arr, sagaName) => {
      // Tri pour garantir que la jaquette = 1er jeu
      // (id croissant, puis fallback titre)
      const sorted = [...arr].sort((a, b) => {
        const aId = a.id ?? 0;
        const bId = b.id ?? 0;
        if (aId !== bId) return aId - bId;
        return (a.title || "").localeCompare(b.title || "");
      });

      const first = sorted[0];
      const slug = sagaName.toLowerCase() === "jeux" ? "jeux" : slugify(sagaName);

      all.push({
        name: sagaName,
        slug,
        count: arr.length,
        coverUrl: first?.coverUrl,
      });
    });

    // Tri alphabétique des sagas, en remontant "JEUX" tout en haut
    return all.sort((a, b) => {
      if (a.name.toLowerCase() === "jeux") return -1;
      if (b.name.toLowerCase() === "jeux") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [games]);

  // Filtre par recherche (sur le nom de saga)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sagaCards;
    return sagaCards.filter((s) => s.name.toLowerCase().includes(q));
  }, [sagaCards, query]);

  // --- Export JSON ---
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

  // --- Import JSON ---
  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<GameDTO>[];

      let created = 0;
      for (const item of parsed) {
        // on ne met que le nécessaire, tu peux enrichir si besoin
        const payload = {
          title: item.title || "Sans titre",
          coverUrl: item.coverUrl,
          rating: item.rating ?? 1,
          genres: item.genres || [],
          whyLiked: item.whyLiked,
          platform: item.platform,
          saga: item.saga,
          finishedAt: item.finishedAt,
        };
        await createGame(payload as any);
        created++;
      }
      toast({ title: "Import terminé", description: `${created} jeux importés.` });
      await refresh();
    } catch (err: any) {
      toast({
        title: "Import échoué",
        description: err?.message || "Le fichier n’a pas pu être importé.",
        variant: "destructive",
      });
    } finally {
      // reset input pour pouvoir ré-importer le même fichier si besoin
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4 flex-col sm:flex-row">
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

          <div className="flex items-center gap-2">
            {/* Menu Actions (Import / Export) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MoreHorizontal className="w-4 h-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>JSON</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleImportClick} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Importer JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAll} className="gap-2">
                  <Download className="w-4 h-4" />
                  Exporter JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  (Autres actions à venir)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Ajouter */}
            <Button
              onClick={() => setIsFormOpen(true)}
              className="gap-2 shadow-glow-primary"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Barre de recherche + Filtres (visuel) */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative w-full max-w-5xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une saga..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Filtres
          </Button>
        </div>

        {/* Sagas */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              Aucune saga
            </h3>
            {games.length === 0 && (
              <Button onClick={() => setIsFormOpen(true)} className="mt-4 gap-2">
                <Plus className="w-4 h-4" /> Ajouter un jeu
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filtered.map((saga) => (
              <button
                key={saga.slug}
                onClick={() => navigate(`/s/${saga.slug}`)}
                className="group text-left rounded-2xl overflow-hidden bg-card shadow hover:shadow-lg transition border border-border"
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
                  {saga.coverUrl ? (
                    <img
                      src={saga.coverUrl}
                      alt={saga.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      Pas de jaquette
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-semibold line-clamp-1">{saga.name}</div>
                  <div className="text-xs text-muted-foreground">{saga.count} jeu(x)</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Dialog : Formulaire Ajouter */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <GameForm
              onSave={async (payload) => {
                try {
                  await createGame(payload as any);
                  toast({
                    title: "Jeu ajouté",
                    description: `${payload.title} a été ajouté à votre collection.`,
                  });
                  setIsFormOpen(false);
                  await refresh();
                } catch (e: any) {
                  toast({
                    title: "Erreur",
                    description: e?.message || "Échec de l’enregistrement.",
                    variant: "destructive",
                  });
                }
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* input caché pour Import JSON */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
    </div>
  );
};

export default Index;
