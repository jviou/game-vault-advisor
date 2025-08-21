import React, { useState, useRef } from "react";
import { X, Upload, Star, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Game, DEFAULT_GENRES } from "@/types/game";
import { CoverPicker } from "@/components/CoverPicker";

interface GameFormProps {
  game?: Game | null;
  onSave: (game: Omit<Game, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

export const GameForm = ({ game, onSave, onCancel }: GameFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: game?.title || "",
    coverUrl: game?.coverUrl || "",
    rating: game?.rating || 1,
    genres: game?.genres || [],
    whyLiked: game?.whyLiked || "",
    platform: game?.platform || "",
  });

  const [customGenre, setCustomGenre] = useState("");

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData((prev) => ({ ...prev, coverUrl: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRatingClick = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  const toggleGenre = (genre: string) => {
    setFormData((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const addCustomGenre = () => {
    if (customGenre.trim() && !formData.genres.includes(customGenre.trim())) {
      setFormData((prev) => ({
        ...prev,
        genres: [...prev.genres, customGenre.trim()],
      }));
      setCustomGenre("");
    }
  };

  const removeGenre = (genre: string) => {
    setFormData((prev) => ({
      ...prev,
      genres: prev.genres.filter((g) => g !== genre),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    onSave({
      title: formData.title.trim(),
      coverUrl: formData.coverUrl || undefined,
      rating: formData.rating,
      genres: formData.genres,
      whyLiked: formData.whyLiked.trim() || undefined,
      platform: formData.platform.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {game ? "Modifier le jeu" : "Ajouter un jeu"}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Titre *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Nom du jeu"
            required
          />
        </div>

        {/* Cover Image */}
        <div className="space-y-2">
          <Label>Jaquette</Label>
          <div className="space-y-3">
            {formData.coverUrl && (
              <div className="relative w-32 h-44 mx-auto">
                <img
                  src={formData.coverUrl}
                  alt="Aperçu jaquette"
                  className="w-full h-full object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, coverUrl: "" }))
                  }
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Manuel
                </TabsTrigger>
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  SteamGridDB
                </TabsTrigger>
              </TabsList>

              {/* Manuel : URL / Upload */}
              <TabsContent value="manual" className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="URL de l'image"
                    value={formData.coverUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        coverUrl: e.target.value,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </TabsContent>

              {/* SteamGridDB */}
              <TabsContent value="search" className="space-y-3">
                <CoverPicker
                  initialQuery={formData.title}
                  onSelect={(url) =>
                    setFormData((prev) => ({ ...prev, coverUrl: url }))
                  }
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <Label>Note *</Label>
          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleRatingClick(i + 1)}
                className="transition-colors"
              >
                <Star
                  className={`w-8 h-8 ${
                    i < formData.rating
                      ? "fill-gaming-gold text-gaming-gold"
                      : "text-muted-foreground hover:text-gaming-gold"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Genres */}
        <div className="space-y-3">
          <Label>Genres</Label>

          {formData.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.genres.map((genre) => (
                <Badge
                  key={genre}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive/10"
                  onClick={() => removeGenre(genre)}
                >
                  {genre}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {DEFAULT_GENRES.filter((genre) => !formData.genres.includes(genre)).map((genre) => (
              <Badge
                key={genre}
                variant="outline"
                className="cursor-pointer hover:bg-secondary"
                onClick={() => toggleGenre(genre)}
              >
                {genre}
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Genre personnalisé"
              value={customGenre}
              onChange={(e) => setCustomGenre(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), addCustomGenre())
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={addCustomGenre}
              disabled={!customGenre.trim()}
            >
              Ajouter
            </Button>
          </div>
        </div>

        {/* Why I liked it */}
        <div className="space-y-2">
          <Label htmlFor="whyLiked">Pourquoi j'ai aimé</Label>
          <Textarea
            id="whyLiked"
            value={formData.whyLiked}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, whyLiked: e.target.value }))
            }
            placeholder="Ce qui m'a plu dans ce jeu..."
            rows={4}
          />
        </div>

        {/* Platform */}
        <div className="space-y-2">
          <Label htmlFor="platform">Plateforme</Label>
          <Input
            id="platform"
            value={formData.platform}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, platform: e.target.value }))
            }
            placeholder="PS5, PC, Switch..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1">
            {game ? "Mettre à jour" : "Ajouter le jeu"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
};
