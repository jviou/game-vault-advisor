// src/pages/SagaPage.tsx
import { useMemo, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import type { GameDTO } from "@/lib/api";
import { listGames } from "@/lib/api";
import GameCard from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/lib/slug";

const ORDER_KEY = (slug: string) => `sagaOrder/${slug}`;

const SagaPage = () => {
  const { slug = "" } = useParams();
  const { toast } = useToast();

  const [games, setGames] = useState<GameDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listGames();
        setGames(data);
      } catch (e: any) {
        toast({
          title: "Erreur de chargement",
          description: e?.message || "Impossible de charger les jeux.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const { displayName, items } = useMemo(() => {
    // "jeux" = sans saga
    const targetIsNoSaga = slug === "jeux";
    const filtered = games.filter((g) => {
      const s = (g.saga || "").trim();
      if (!s && targetIsNoSaga) return true;
      return !targetIsNoSaga && slugify(s) === slug;
    });

    const name =
      targetIsNoSaga
        ? "JEUX"
        : filtered[0]?.saga?.trim() || slug.toUpperCase();

    // ordre utilisateur (drag&drop) sauvegardé ?
    const savedOrder = JSON.parse(
      localStorage.getItem(ORDER_KEY(slug)) || "[]"
    ) as number[];

    const ordered = [...filtered].sort((a, b) => {
      const ia = savedOrder.indexOf(a.id);
      const ib = savedOrder.indexOf(b.id);
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }
      // fallback : trier par titre (sans casser l’existant)
      return (a.title || "").localeCompare(b.title || "");
    });

    return { displayName: name, items: ordered };
  }, [games, slug]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="btn btn-sm">
            ← Retour
          </Link>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {displayName}
            </h1>
            <p className="text-muted-foreground">{items.length} jeu{items.length>1?"x":""}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild>
            <Link to="/">{/* simple retour si besoin */}Accueil</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          Aucun jeu dans cette saga.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SagaPage;
