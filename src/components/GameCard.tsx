import { Star, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GameDTO } from "@/lib/api"; // <- le DTO utilisé avec json-server

interface GameCardProps {
  game: GameDTO;
  onEdit: (game: GameDTO) => void;
  onDelete: (id: number) => void;
  onView: (game: GameDTO) => void;
}

export const GameCard = ({ game, onEdit, onDelete, onView }: GameCardProps) => {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < (game.rating ?? 0)
            ? "fill-gaming-gold text-gaming-gold"
            : "text-muted-foreground"
        }`}
      />
    ));
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const handleDelete = () => {
    if (typeof game.id !== "number") return; // sécurité si id manquant
    onDelete(game.id);
  };

  return (
    <div className="group relative bg-gradient-card border border-border rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
      {/* Cover Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {game.coverUrl ? (
          <img
            src={game.coverUrl}
            alt={`${game.title} cover`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Pas de jaquette</span>
          </div>
        )}

        {/* Overlay actions */}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); onView(game); }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); onEdit(game); }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            disabled={typeof game.id !== "number"}
            title={typeof game.id !== "number" ? "ID manquant" : undefined}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-lg leading-tight">
          {game.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1">
          {renderStars(game.rating ?? 0)}
          <span className="text-sm text-muted-foreground ml-2">
            {(game.rating ?? 0)}/5
          </span>
        </div>

        {/* Genres */}
        {!!(game.genres?.length) && (
          <div className="flex flex-wrap gap-1">
            {game.genres.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
            {game.genres.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{game.genres.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Why I liked it - excerpt */}
        {!!game.whyLiked && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {truncateText(game.whyLiked, 100)}
          </p>
        )}

        {/* Platform & Date */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {game.platform && <span>{game.platform}</span>}
          {game.finishedAt && (
            <span>{new Date(game.finishedAt).toLocaleDateString("fr-FR")}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameCard;
