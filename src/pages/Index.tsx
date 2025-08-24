import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Download, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { getAllGames, createGame, updateGame } from "@/lib/db";
import type { GameDTO } from "@/types";


// --- helper: choisir la jaquette "de référence" d'une saga ---
function pickSagaCover(gamesOfSaga: GameDTO[]): string | undefined {
  const ordered = [...gamesOfSaga].sort((a, b) => {
    const ao = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
    const bo = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;

    const ad = a.createdAt ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bd = b.createdAt ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (ad !== bd) return ad - bd;

    return (a.title || "").localeCompare(b.title || "");
  });

  return ordered.find((g) => !!g.coverUrl)?.coverUrl;
}

export default function Index() {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameDTO[]>([]);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const all = await getAllGames();
    setGames(all);
  };

  useEffect(() => {
    refresh();
  }, []);

  // Regrouper par saga
  const sagaSummaries = useMemo(() => {
    const map = new Map<string, GameDTO[]>();
    for (const g of games) {
      const k = g.saga?.trim() || "JEUX";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(g);
    }

    return Array.from(map.entries()).map(([name, list]) => ({
      name,
      count: list.length,
      coverUrl: pickSagaCover(list),
    }));
  }, [games]);

  // --- EXPORT JSON ---
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
        description: e?.message || "Impossible d’exporter.",
        variant: "destructive",
      });
    }
  };

  // --- IMPORT JSON ---
  const handleImportJson = async (file: File) => {
    try {
      const txt = await file.text();
      const arr = JSON.parse(txt);
      if (!Array.isArray(arr)) throw new Error("Format attendu: un tableau d’objets jeu.");

      for (const it of arr) {
        if (typeof it?.id === "number") {
          await updateGame(it.id, {
            title: it.title,
            coverUrl: it.coverUrl,
            rating: it.rating,
            genres: it.genres || [],
            whyLiked: it.whyLiked,
            platform: it.platform,
            saga: it.saga,
            orderIndex: it.orderIndex,
            finishedAt: it.finishedAt,
          });
        } else {
          await createGame({
            title: it.title,
            coverUrl: it.coverUrl,
            rating: it.rating ?? 1,
            genres: it.genres || [],
            whyLiked: it.whyLiked,
            platform: it.platform,
            saga: it.saga,
            orderIndex: it.orderIndex,
            finishedAt: it.finishedAt,
          });
        }
      }

      toast({ title: "Import terminé", description: "La collection a été importée." });
      await refresh();
    } catch (e: any) {
      toast({
        title: "Import échoué",
        description: e?.message || "Impossible d’importer.",
        variant: "destructive",
      });
    }
  };

  const filtered = sagaSummaries.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span role="img" aria-label="logo">🎮</span> Ma Collection
          </h1>
          <p className="text-muted-foreground">{games.length} jeux</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <MoreHorizontal className="w-4 h-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Importer JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAll}>
                <Download className="w-4 h-4 mr-2" /> Exporter JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={() => navigate("/add")}
            className="gap-2 shadow-glow-primary"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </div>
      </div>

      {/* Input caché pour import JSON */}
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportJson(f);
          e.currentTarget.value = "";
        }}
      />

      {/* Recherche */}
      <Input
        placeholder="Rechercher une saga..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {/* Liste des sagas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filtered.map((s) => (
          <button
            key={s.name}
            onClick={() =>
              navigate(`/s/${encodeURIComponent(s.name.toLowerCase())}`)
            }
            className="group relative overflow-hidden rounded-xl bg-card shadow hover:shadow-lg transition"
          >
            <div className="aspect-[3/4] w-full bg-muted">
              {s.coverUrl ? (
                <img
                  src={s.coverUrl}
                  alt={s.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  Pas d’image
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="font-semibold truncate">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.count} jeu(x)</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
