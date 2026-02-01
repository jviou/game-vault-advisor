import { Pencil, Trash2 } from "lucide-react";
import * as React from "react";
import type { GameDTO } from "@/lib/api";

type Props = {
  game: GameDTO;
  onView?: (g: GameDTO) => void;
  onEdit?: (g: GameDTO) => void;
  onDelete?: (id: number) => void;
  /** Laisse à true pour afficher l’overlay d’actions (edit/delete) */
  showActions?: boolean;
  /** Tail optionnel (classes supplémentaires) */
  className?: string;
};

export default function GameCard({
  game,
  onView,
  onEdit,
  onDelete,
  showActions = true,
  className = "",
}: Props) {
  const handleCardClick = React.useCallback(() => {
    onView?.(game);
  }, [onView, game]);

  const handleEdit = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onEdit?.(game);
    },
    [onEdit, game]
  );

  const handleDelete = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (game.id != null) onDelete?.(game.id);
    },
    [onDelete, game.id]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={[
        "relative group rounded-xl overflow-hidden border bg-card/70 hover:bg-card transition-colors",
        "cursor-pointer hover:shadow-xl",
        className,
      ].join(" ")}
    >
      {/* Image de jaquette */}
      <div className="aspect-[3/4] w-full bg-muted/20 overflow-hidden">
        {game.coverUrl ? (
          <img
            src={game.coverUrl}
            alt={game.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
            Pas de jaquette
          </div>
        )}
      </div>

      {/* Titre + mini-infos */}
      <div className="p-3">
        <div className="font-medium leading-tight line-clamp-2">{game.title}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {game.platform || ""}
        </div>
      </div>

      {/* Overlay d’actions (Edit/Delete) */}
      {showActions && (onEdit || onDelete) && (
        <div
          className="
            absolute top-3 left-3 z-20
            flex gap-2
            opacity-0 group-hover:opacity-100
            transition-opacity
          "
        >
          {onEdit && (
            <button
              aria-label="Modifier"
              title="Modifier"
              onClick={handleEdit}
              className="p-2 rounded-md bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              aria-label="Supprimer"
              title="Supprimer"
              onClick={handleDelete}
              className="p-2 rounded-md bg-red-500/85 hover:bg-red-600 text-white"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
