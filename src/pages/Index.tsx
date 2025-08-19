// src/pages/Index.tsx (exemple d’intégration)
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GameForm } from "@/components/GameForm";
import GameCard from "@/components/GameCard";
import type { GameDTO } from "@/lib/api";
import { listGames, createGame, updateGame, deleteGame } from "@/lib/api";

export default function Index() {
  const [games, setGames] = useState<GameDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<GameDTO | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listGames();
      setGames(data);
    } catch (e:any) {
      setError(e.message || "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

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
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Game Vault</h1>
        <Button onClick={() => setAdding(true)}>Ajouter un jeu</Button>
      </div>

      {loading && <p>Chargement…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && games.length === 0 && (
        <p>Aucun jeu pour le moment.</p>
      )}

      {/* Liste */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {games.map(g => (
          <GameCard
            key={g.id}
            game={g}
            onEdit={() => setEditing(g)}
            onDelete={() => g.id && handleDelete(g.id)}
          />
        ))}
      </div>

      {/* Ajouter */}
      {adding && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4">
          <div className="bg-neutral-900 rounded-2xl p-4 w-full max-w-xl">
            <GameForm
              game={null}
              onSave={(payload) => handleCreate(payload)}
              onCancel={() => setAdding(false)}
            />
          </div>
        </div>
      )}

      {/* Éditer */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4">
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
