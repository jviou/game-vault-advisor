import { Star, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GameDTO } from "@/lib/api";

interface GameCardProps {
  game: GameDTO;
  onEdit: (game: GameDTO) => void;
  onDelete: (id: number) => void;
  onView?: (game: GameDTO) => void;
}

export const GameCard = ({ game, onEdit, onDelete, onView }: GameCardProps) => {
  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 sm:w-4 sm:h-4 ${
          i < (rating ?? 0) ? "fill-gaming-gold text-gaming-gold" : "text-muted-foreground"
        }`}
      />
    ));

  const truncateText = (text = "", maxLength: number) =>
    text.length <= maxLength ? text : text.slice(0, maxLength) + "...";

  const handleDelete = () => {
    if (typeof game.id !== "number") return;
    onDelete(game.id);
  };

  return (
    <div className="group relative bg-gradient-card border border-border rounded-lg sm:rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
      {/* Cover */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {game.coverUrl ? (
          <img
            src={game.coverUrl}
            alt={`${game.title} cover`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-xs sm:text-sm">
            Pas de jaquette
          </div>
        )}

        {/* Actions overlay */}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-1 sm:gap-2">
          {onView && (
            <Button size="icon" variant="secondary" className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={(e) => { e.stopPropagation(); onView(game); }}>
              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          )}
          <Button size="icon" variant="secondary" className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={(e) => { e.stopPropagation(); onEdit(game); }}>
            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          <Button size="icon" variant="destructive" className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            disabled={typeof game.id !== "number"}>
            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
        <h3 className="font-semibold text-sm sm:text-lg leading-tight">{game.title}</h3>

        <div className="flex items-center gap-1">
          {renderStars(game.rating ?? 0)}
          <span className="text-xs sm:text-sm text-muted-foreground ml-1 sm:ml-2">{(game.rating ?? 0)}/5</span>
        </div>

        {!!game.genres?.length && (
          <div className="flex flex-wrap gap-1">
            {game.genres.slice(0, 2).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-[10px] sm:text-xs">
                {genre}
              </Badge>
            ))}
            {game.genres.length > 2 && (
              <Badge variant="outline" className="text-[10px] sm:text-xs">+{game.genres.length - 2}</Badge>
            )}
          </div>
        )}

        {!!game.whyLiked && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {truncateText(game.whyLiked, 80)}
          </p>
        )}

        <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
          {game.platform && <span>{game.platform}</span>}
          {game.finishedAt && <span>{new Date(game.finishedAt).toLocaleDateString("fr-FR")}</span>}
        </div>
      </div>
    </div>
  );
};

export default GameCard;
