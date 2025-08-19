// src/components/GameCard.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import type { GameDTO } from "@/lib/api";

type Props = {
  game: GameDTO;
  onEdit: () => void;
  onDelete: () => void;
};

export default function GameCard({ game, onEdit, onDelete }: Props) {
  return (
    <div className="bg-neutral-900 rounded-xl p-3 space-y-3">
      <div className="aspect-[2/3] w-full overflow-hidden rounded-lg ring-1 ring-white/10">
        {game.coverUrl ? (
          <img src={game.coverUrl} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-sm opacity-70">Pas de jaquette</div>
        )}
      </div>

      <div className="space-y-1">
        <div className="font-semibold">{game.title}</div>
        {game.platform && <div className="text-xs opacity-70">{game.platform}</div>}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onEdit}>Modifier</Button>
        <Button variant="destructive" className="flex-1" onClick={onDelete}>Supprimer</Button>
      </div>
    </div>
  );
}
