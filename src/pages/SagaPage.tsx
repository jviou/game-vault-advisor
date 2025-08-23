// src/pages/SagaPage.tsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Gamepad2, GripVertical, Save } from "lucide-react";

import type { GameDTO } from "@/lib/api";
import { listGames, updateGame } from "@/lib/api";
import GameCard from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SagaPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const sagaName = slug ? decodeURIComponent(slug) : "JEUX";

  const [allGames, setAllGames] = useState<GameDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // mode réorg
  const [reorderMode, setReorderMode] = useState(false);
  // liste locale affichée (triée par order)
  const [ordered, setOrdered] = useState<GameDTO[]>([]);
  // pour savoir si on a modifié l'ordre
  const [dirty, setDirty] = useState(false);

  // index du drag en cours
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listGames();
        if (!cancelled) setAllGames(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Jeux de la saga courante (ou sans saga si JEUX)
  const filtered = useMemo(() => {
    if (sagaName.toUpperCase() === "JEUX") {
      return allGames.filter((g) => !g.saga || !g.saga.trim());
    }
    const target = sagaName.trim().toLowerCase();
    return allGames.filter(
      (g) => (g.saga ?? "").trim().toLowerCase() === target
    );
  }, [allGames, sagaName]);

  // Met à jour le tableau `ordered` (tri par order croissant, puis fallback titre)
  useEffect(() => {
    const byOrder = [...filtered].sort((a, b) => {
      const ao = Number.isFinite(a.order as number) ? (a.order as number) : Number.POSITIVE_INFINITY;
      const bo = Number.isFinite(b.order as number) ? (b.order as number) : Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      // fallback si pas d'order
      return (a.title || "").localeCompare(b.title || "");
    });
    setOrdered(byOrder);
    setDirty(false);
  }, [filtered]);

  // --- Drag & Drop HTML5 ---
  const onDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndex.current = index;
    // image fantôme plus discrète
    const crt = document.createElement("div");
    crt.style.opacity = "0";
    document.body.appendChild(crt);
    e.dataTransfer.setDragImage(crt, 0, 0);
    setTimeout(() => document.body.removeChild(crt), 0);
  };

  const onDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault(); // obligatoire pour autoriser drop
    const from = dragIndex.current;
    if (from === null || from === index) return;
    setOrdered((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(index, 0, moved);
      dragIndex.current = index;
      return arr;
    });
    setDirty(true);
  };

  const onDrop = () => {
    dragIndex.current = null;
  };

  const cancelReorder = () => {
    // on réinitialise l'ordre depuis filtered
    const reset = [...filtered].sort((a, b) => {
      const ao = Number.isFinite(a.order as number) ? (a.order as number) : Number.POSITIVE_INFINITY;
      const bo = Number.isFinite(b.order as number) ? (b.order as number) : Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return (a.title || "").localeCompare(b.title || "");
    });
    setOrdered(reset);
    setDirty(false);
    setReorderMode(false);
  };

  const saveOrder = async () => {
    try {
      // calcule l'order pour CETTE saga uniquement
      const updates = ordered.map((g, idx) =>
        updateGame(g.id, { ...g, order: idx })
      );
      await Promise.all(updates);
      toast({ title: "Ordre enregistré", description: "Votre tri a été sauvegardé." });

      // recharge “propre”
      const data = await listGames();
      setAllGames(data);
      setReorderMode(false);
      setDirty(false);
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible d’enregistrer l’ordre.",
        variant: "destructive",
      });
    }
  };

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
                  {ordered.length} jeu(x)
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {reorderMode ? (
              <>
                <Button variant="secondary" onClick={cancelReorder}>
                  Annuler
                </Button>
                <Button onClick={saveOrder} disabled={!dirty} className="gap-2">
                  <Save className="w-4 h-4" />
                  Enregistrer l’ordre
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setReorderMode(true)}
                  className="gap-2"
                >
                  <GripVertical className="w-4 h-4" />
                  Réorganiser
                </Button>
                <Button variant="secondary" onClick={() => navigate(-1)} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Retour
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="text-muted-foreground">Chargement…</div>
        ) : ordered.length === 0 ? (
          <div className="text-muted-foreground">Aucun jeu.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {ordered.map((g, idx) => {
              const wrapperCommon =
                "rounded-xl transition ring-offset-background " +
                (reorderMode ? "cursor-move ring-2 ring-dashed ring-border" : "");
              return (
                <div
                  key={g.id}
                  className={wrapperCommon}
                  draggable={reorderMode}
                  onDragStart={onDragStart(idx)}
                  onDragOver={onDragOver(idx)}
                  onDrop={onDrop}
                  title={reorderMode ? "Glissez pour réordonner" : g.title}
                >
                  <GameCard
                    game={g}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onView={() => {}}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SagaPage;
