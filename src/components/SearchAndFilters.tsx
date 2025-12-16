import { useState } from "react";
import { Search, Filter, X, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DEFAULT_GENRES } from "@/types/game";

export interface Filters {
  search: string;
  genres: string[];
  minRating: number;
  platform: string;
  sortBy: 'title' | 'rating' | 'createdAt' | 'finishedAt';
  sortOrder: 'asc' | 'desc';
}

interface SearchAndFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  availablePlatforms: string[];
}

export const SearchAndFilters = ({ 
  filters, 
  onFiltersChange, 
  availablePlatforms 
}: SearchAndFiltersProps) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const updateFilters = (updates: Partial<Filters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleGenre = (genre: string) => {
    const newGenres = filters.genres.includes(genre)
      ? filters.genres.filter(g => g !== genre)
      : [...filters.genres, genre];
    updateFilters({ genres: newGenres });
  };

  const removeGenre = (genre: string) => {
    updateFilters({ genres: filters.genres.filter(g => g !== genre) });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      genres: [],
      minRating: 1,
      platform: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = filters.search || filters.genres.length > 0 || 
    filters.minRating > 1 || filters.platform || 
    filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc';

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Rechercher un jeu..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="pl-10"
        />
      </div>

      {/* Filters toggle */}
      <div className="flex items-center justify-between">
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtres
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  !
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4">
            <div className="space-y-4 p-4 border rounded-lg bg-card">
              {/* Active filters display */}
              {hasActiveFilters && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Filtres actifs:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Tout effacer
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {filters.genres.map((genre) => (
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
                    
                    {filters.minRating > 1 && (
                      <Badge variant="secondary">
                        Min {filters.minRating} ⭐
                      </Badge>
                    )}
                    
                    {filters.platform && (
                      <Badge variant="secondary">
                        {filters.platform}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Genre filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Genres</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_GENRES.map((genre) => (
                    <Badge
                      key={genre}
                      variant={filters.genres.includes(genre) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => toggleGenre(genre)}
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Rating filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Note minimale</label>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => updateFilters({ minRating: i + 1 })}
                      className="transition-colors"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          i < filters.minRating 
                            ? "fill-gaming-gold text-gaming-gold" 
                            : "text-muted-foreground hover:text-gaming-gold"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform filter */}
              {availablePlatforms.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plateforme</label>
                  <Select
                    value={filters.platform}
                    onValueChange={(value) => updateFilters({ platform: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les plateformes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les plateformes</SelectItem>
                      {availablePlatforms.map((platform) => (
                        <SelectItem key={platform} value={platform}>
                          {platform}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sort options */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trier par</label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value: any) => updateFilters({ sortBy: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">Titre</SelectItem>
                      <SelectItem value="rating">Note</SelectItem>
                      <SelectItem value="createdAt">Date d'ajout</SelectItem>
                      <SelectItem value="finishedAt">Date de fin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Ordre</label>
                  <Select
                    value={filters.sortOrder}
                    onValueChange={(value: any) => updateFilters({ sortOrder: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Croissant</SelectItem>
                      <SelectItem value="desc">Décroissant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};