import React from "react";
import { motion } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GuessResultDTO } from "@/stores/animeStore";



// --- Sous-composant pour la case animée ---
interface AnimatedCellProps {
  delay: number;
  status: "correct" | "partial" | "incorrect";
  children: React.ReactNode;
  hintDirection?: "up" | "down" | null; // Pour les flèches + ou -
}

const AnimatedCell = ({ delay, status, children, hintDirection }: AnimatedCellProps) => {
  // Choix de la couleur selon le statut
  let bgClass = "bg-red-500 text-white"; // Faux par défaut
  if (status === "correct") bgClass = "bg-green-500 text-white";
  if (status === "partial") bgClass = "bg-orange-500 text-white";

  return (
    <TableCell className="p-1 sm:p-2 text-center align-middle w-20 h-20">
      <motion.div
        initial={{ rotateX: 90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ delay, duration: 0.4, ease: "easeOut" }}
        className={`w-20 h-20 flex flex-row items-center justify-center p-1 rounded-md shadow-sm border border-black/10 font-medium text-center ${bgClass}`}
        style={{ transformOrigin: "center" }}
      >
        <span className="text-sm line-clamp-2 break-words flex-1 min-w-0 leading-tight">{children}</span>
        {hintDirection === "up" && <ArrowUp className="w-4 h-8 mr-1" />}
        {hintDirection === "down" && <ArrowDown className="w-4 h-8 mr-1" />}
      </motion.div>
    </TableCell> 
  );
};

// --- Composant Principal ---
export default function GuessTable({ guesses }: { guesses: GuessResultDTO[] }) {
  return (
    <div className="w-full overflow-x-auto rounded-md border">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">Anime</TableHead>
            <TableHead className="text-center">Format</TableHead>
            <TableHead className="text-center">Demographic</TableHead>
            <TableHead className="text-center">Studio</TableHead>
            <TableHead className="text-center">Source</TableHead>
            <TableHead className="text-center">Genres</TableHead>
            <TableHead className="text-center">Episodes</TableHead>
            <TableHead className="text-center">Season</TableHead>
            <TableHead className="text-center">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guesses.map((guess, rowIndex) => {
            const r = guess.results;
            const a = guess.anime;
            
            // On calcule l'état des genres
            let genresStatus: "correct" | "partial" | "incorrect" = "incorrect";
            if (r.genres.isCorrect) genresStatus = "correct";
            else if (r.genres.isPartiallyCorrect) genresStatus = "partial";

            return (
              <TableRow key={`${a.id}-${rowIndex}`} className="hover:bg-transparent border-b-0">
                {/* 1. Anime - Delay 0 */}
                <AnimatedCell 
                  delay={0} 
                  status={guess.isCorrect ? "correct" : "incorrect"}
                >
                  <div className="flex flex-col items-center w-12">
                    {a.imageUrl && (
                      <img src={a.imageUrl} alt={a.title} className="w-15 h-18 object-cover rounded-sm mb-1" />
                    )}
                  </div>
                </AnimatedCell>

                {/* 2. Format - Delay 0.15s */}
                <AnimatedCell delay={0.15} status={r.animeFormat.isCorrect ? "correct" : "incorrect"}>
                  {a.anime_format}
                </AnimatedCell>

                {/* 3. Demographic - Delay 0.3s */}
                <AnimatedCell delay={0.3} status={r.demographicType.isCorrect ? "correct" : "incorrect"}>
                  {a.demographic_type || "N/A"}
                </AnimatedCell>

                {/* 4. Studio - Delay 0.45s */}
                <AnimatedCell delay={0.45} status={r.studio.isCorrect ? "correct" : "incorrect"}>
                  {a.studio}
                </AnimatedCell>

                {/* 5. Source - Delay 0.6s */}
                <AnimatedCell delay={0.6} status={r.source.isCorrect ? "correct" : "incorrect"}>
                  {a.source}
                </AnimatedCell>

                {/* 6. Genres - Delay 0.75s (Gère l'état "partiel" en orange) */}
                <AnimatedCell delay={0.75} status={genresStatus}>
                  {a.genres.join(", ")}
                </AnimatedCell>

                {/* 7. Episodes - Delay 0.9s (Avec flèches d'indice) */}
                <AnimatedCell 
                  delay={0.9} 
                  status={r.episodes.isCorrect ? "correct" : "incorrect"}
                  hintDirection={!r.episodes.isCorrect && r.episodes.isHigher !== null ? (r.episodes.isHigher ? "up" : "down") : null}
                >
                  {a.episodes || "?"}
                </AnimatedCell>

                {/* 8. Season Start - Delay 1.05s (Avec flèches d'indice) */}
                <AnimatedCell 
                  delay={1.05} 
                  status={r.seasonStart.isCorrect ? "correct" : "incorrect"}
                  hintDirection={!r.seasonStart.isCorrect && r.seasonStart.isEarlier !== null ? (r.seasonStart.isEarlier ? "down" : "up") : null}
                >
                  {a.season_start}
                </AnimatedCell>

                {/* 9. Score - Delay 1.2s (Avec flèches d'indice) */}
                <AnimatedCell 
                  delay={1.2} 
                  status={r.score.isCorrect ? "correct" : "incorrect"}
                  hintDirection={!r.score.isCorrect && r.score.isHigher !== null ? (r.score.isHigher ? "up" : "down") : null}
                >
                  {a.score}
                </AnimatedCell>

              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}