import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, SlidersHorizontal, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GameCard from "@/components/GameCard";
import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";
import { GameForm } from "@/components/GameForm";

export default function Index() {
  const [games, setGames] = useState<GameDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<GameDTO | null>(null);

  const [search, setSearch] = useState("");
  const [showFilters] = useState(false); // placeholder si plus tard tu ajoutes de vrais filtres

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listGames();
      setGames(data);
    } catch (e: any) {
      setError(e.message || "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return games;
    return games.filter(g =>
      g.title?.toLowerCase().includes(q) ||
      g.platform?.toLowerCase().includes(q) ||
      (g.genres || []).some(x => x.toLowerCase().includes(q)) ||
      (g.whyLiked || "").toLowerCase().includes(q)
    );
  }, [games, search]);

  async function handleCreate(payload: Omit<GameDTO,"id"|"createdAt"|"updatedAt">) {
    await createGame(payload);
    setAdding(false);
    await refresh();
  }
  async function handleUpdate(id: number, payload: Omit<GameDTO,"id"|"createdAt"|"updatedAt">) {
    await updateGame(id, payload);
    setEditing(null);
    await refresh();
  }
  async function handleDelete(id: number) {
    if (!confirm("Supprimer ce jeu ?")) return;
    await deleteGame(id);
    await refresh();
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* HEADER joli */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 grid place-items-center ring-1 ring-white/10">
            <Gamepad2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 text-transparent bg-clip-text">
              Ma Collection de Jeux
            </h1>
            <p className="text-sm text-muted-foreground">
              {games.length} jeu{games.length > 1 ? "x" : ""} dans votre collection
            </p>
          </div>
        </div>

        <Button onClick={() => setAdding(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter un jeu
        </Button>
      </div>

      {/* RECHERCHE + (filtres) */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un jeu..."
            className="pl-9 bg-background/70"
          />
        </div>
        <Button variant="outline" className="gap-2" disabled>
          <SlidersHorizontal className="h-4 w-4" /> Filtres
        </Button>
      </div>

      {/* LISTE / ETATS */}
      {loading && <p className="opacity-80">Chargement…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20 opacity-90">
          <div className="mx-auto mb-4 w-10 h-10 rounded-2xl bg-background grid place-items-center">
            <Gamepad2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Aucun jeu dans votre collection</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Commencez par ajouter votre premier jeu !
          </p>
          <Button onClick={() => setAdding(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter mon premier jeu
          </Button>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              onEdit={() => setEditing(g)}
              onDelete={(id) => handleDelete(id)}
            />
          ))}
        </div>
      )}

      {/* MODALES */}
      {adding && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-50">
          <div className="bg-neutral-900 rounded-2xl p-4 w-full max-w-xl">
            <GameForm
              game={null}
              onSave={(payload) => handleCreate(payload)}
              onCancel={() => setAdding(false)}
            />
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-50">
          <div className="bg-neutral-900 rounded-2xl p-4 w-full max-w-xl">
            <GameForm
              game={editing as any}
              onSave={(payload) => editing?.id && handleUpdate(editing.id, payload)}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
