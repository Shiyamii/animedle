import {
  Clock, // Suspense
  Coffee, // Slice of Life
  Dumbbell, // Sports
  Ghost, // Supernatural
  Heart, // Romance
  HeartPulse, // Ecchi (un peu piquant/cœur qui bat)
  Map as MapIcon, // Adventure
  Rocket, // Sci-Fi
  Search, // Mystery
  Shapes, // Avant Garde
  Skull, // Horror
  Smile, // Comedy
  Swords, // Action
  Tag, // Fallback par défaut
  Theater, // Drama
  Trophy, // Award Winning
  Utensils, // Gourmet
  Wand2, // Fantasy
} from 'lucide-react';
import type React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Dictionnaire de mapping entre le nom du genre et le composant Icone
const genreIconMap: Record<string, React.ElementType> = {
  Action: Swords,
  Adventure: MapIcon,
  'Avant Garde': Shapes,
  'Award Winning': Trophy,
  Comedy: Smile,
  Drama: Theater,
  Ecchi: HeartPulse,
  Fantasy: Wand2,
  Gourmet: Utensils,
  Horror: Skull,
  Mystery: Search,
  Romance: Heart,
  'Sci-Fi': Rocket,
  'Slice of Life': Coffee,
  Sports: Dumbbell,
  Supernatural: Ghost,
  Suspense: Clock,
};

interface GenreIconsProps {
  genres: string[];
}

export function GenreIcons({ genres }: GenreIconsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {genres.map((genre) => {
        // Si le genre n'est pas dans notre dictionnaire, on affiche l'icône Tag par défaut
        const Icon = genreIconMap[genre] || Tag;

        return (
          <Tooltip key={genre}>
            <TooltipTrigger asChild>
              <div className="rounded-full bg-black/10 p-1 transition-colors hover:bg-black/20 dark:bg-white/10">
                <Icon className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-sm">{genre}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
