import React from "react";
import {
  Swords, // Action
  Map, // Adventure
  Shapes, // Avant Garde
  Trophy, // Award Winning
  Smile, // Comedy
  Theater, // Drama
  HeartPulse, // Ecchi (un peu piquant/cœur qui bat)
  Wand2, // Fantasy
  Utensils, // Gourmet
  Skull, // Horror
  Search, // Mystery
  Heart, // Romance
  Rocket, // Sci-Fi
  Coffee, // Slice of Life
  Dumbbell, // Sports
  Ghost, // Supernatural
  Clock, // Suspense
  Tag // Fallback par défaut
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Dictionnaire de mapping entre le nom du genre et le composant Icone
const genreIconMap: Record<string, React.ElementType> = {
  "Action": Swords,
  "Adventure": Map,
  "Avant Garde": Shapes,
  "Award Winning": Trophy,
  "Comedy": Smile,
  "Drama": Theater,
  "Ecchi": HeartPulse,
  "Fantasy": Wand2,
  "Gourmet": Utensils,
  "Horror": Skull,
  "Mystery": Search,
  "Romance": Heart,
  "Sci-Fi": Rocket,
  "Slice of Life": Coffee,
  "Sports": Dumbbell,
  "Supernatural": Ghost,
  "Suspense": Clock,
};

interface GenreIconsProps {
  genres: string[];
}

export function GenreIcons({ genres }: GenreIconsProps) {
  return (
      <div className="flex flex-wrap gap-1.5 justify-center items-center">
        {genres.map((genre) => {
          // Si le genre n'est pas dans notre dictionnaire, on affiche l'icône Tag par défaut
          const Icon = genreIconMap[genre] || Tag;

          return (
            <Tooltip key={genre}>
              <TooltipTrigger asChild>
                <div className="p-1 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 transition-colors">
                  <Icon className="w-4 h-4" />
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