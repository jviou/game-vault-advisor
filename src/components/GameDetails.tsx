import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Star, Calendar, Gamepad2 } from "lucide-react";
import type { GameDTO } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface GameDetailsProps {
  game: GameDTO | null;
  isOpen: boolean;
  onClose: () => void;
}

export function GameDetails({ game, isOpen, onClose }: GameDetailsProps) {
  if (!game) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background/95 backdrop-blur-xl border-white/10">
        {/* Header Image */}
        <div className="relative w-full h-48 sm:h-64 overflow-hidden bg-muted">
          {game.coverUrl ? (
            <>
              <img
                src={game.coverUrl}
                alt={game.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/50">
              <Gamepad2 className="w-16 h-16 opacity-20" />
            </div>
          )}
          
          <div className="absolute bottom-4 left-4 right-4">
            <DialogTitle className="text-2xl sm:text-4xl font-bold text-white drop-shadow-md">
              {game.title}
            </DialogTitle>
            {game.saga && (
                <Badge variant="secondary" className="mt-2 bg-black/50 backdrop-blur-md text-white border-none">
                    {game.saga}
                </Badge>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
            <DialogDescription className="hidden">
                Détails du jeu {game.title}
            </DialogDescription>

          {/* Meta Info Bar */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
             {game.platform && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary/50 rounded-full border border-white/5">
                    <Gamepad2 className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">{game.platform}</span>
                </div>
             )}
             
             {game.finishedAt && (
                <div className="flex items-center gap-1.5 ">
                    <Calendar className="w-4 h-4" />
                    <span>Fini le {format(new Date(game.finishedAt), "d MMMM yyyy", { locale: fr })}</span>
                </div>
             )}
          </div>

          <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
                {/* Rating */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        Note
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tabular-nums text-foreground">{game.rating}</span>
                        <span className="text-muted-foreground">/ 10</span>
                    </div>
                </div>

                {/* Genres */}
                {game.genres && game.genres.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Genres</h3>
                        <div className="flex flex-wrap gap-2">
                            {game.genres.map((genre) => (
                                <Badge key={genre} variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
                                    {genre}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
             {/* Description / Why Liked */}
             {game.whyLiked && (
                <div className="bg-secondary/30 p-4 rounded-xl border border-white/5 h-fit">
                    <h3 className="font-semibold mb-2 text-foreground">Pourquoi j'ai aimé</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        {game.whyLiked}
                    </p>
                </div>
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
