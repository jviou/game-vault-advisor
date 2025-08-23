import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Gamepad2 } from "lucide-react";

import type { GameDTO } from "@/lib/api";
import { listGames } from "@/lib/api";
import GameCard from "@/components/GameCard";
import { Button } from "@/components/ui/button";

const SagaPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  // Nom de la saga depuis l’URL (decode pour gérer les espaces/accents)
  const sagaName = slug ? decodeURIComponent(slug) : "JEUX";

  const [games, setGames] = useState<GameDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listGames();
        if (!cancelled) setGames(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (sagaName.toUpperCase() === "JEUX") {
      return games.filter((g) => !g.saga || !g.saga.trim());
    }
    const target = sagaName.trim().toLowerCase();
    return games.filter(
      (g) => (g.saga ?? "").trim().toLowerCase() === target
    );
  }, [games, sagaName]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-glow-primary">
              <Gamepad2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {sagaName}
              </h1>
              {!loading && (
                <p className="text-sm sm:text-base text-muted-foreground">
                  {filtered.length} jeu(x)
                </p>
              )}
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </Button>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="text-muted-foreground">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground">Aucun jeu.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {filtered.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                onEdit={() => {}}
                onDelete={() => {}}
                onView={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SagaPage;
