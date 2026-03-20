import React from "react";
import { motion } from "framer-motion";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GuessResultDTO } from "@/stores/animeStore";
import { GenreIcons } from "./GenreIcons";
import { useTranslation } from "react-i18next";

// --- Sous-composant pour la case animée ---
interface AnimatedCellProps {
  delay: number;
  status: "correct" | "partial" | "incorrect";
  children: React.ReactNode;
  hintDirection?: "up" | "down" | null; // Pour les flèches + ou -
  shouldAnimate?: boolean;
}

const AnimatedCell = ({ delay, status, children, hintDirection, shouldAnimate = true }: AnimatedCellProps) => {
  // Choix de la couleur selon le statut
  let bgClass = "bg-red-500 text-white"; // Faux par défaut
  if (status === "correct") bgClass = "bg-green-500 text-white";
  if (status === "partial") bgClass = "bg-orange-500 text-white";

  return (
    <TableCell className="!p-1 text-center align-middle w-20 h-20">
      <motion.div
        initial={shouldAnimate ? { rotateX: 90, opacity: 0 } : false}
        animate={shouldAnimate ? { rotateX: 0, opacity: 1 } : { rotateX: 0, opacity: 1 }}
        transition={{ delay, duration: 0.4, ease: "easeOut" }}
        className={`w-full h-full flex flex-col items-center justify-center p-1 rounded-md shadow-sm border border-black/10 font-medium text-center ${bgClass}`}
        style={{ transformOrigin: "center" }}
      >
        {hintDirection && (<ArrowHint direction={hintDirection} />)}
        <span className="text-[1rem] leading-tight break-words text-balance min-w-0">{children}</span>
      </motion.div>
    </TableCell>
  );
};

const ArrowHint = ({ direction }: { direction: "up" | "down" }) => {
    return <div className="w-full h-0 flex items-center justify-center">
      <div className="translate-y-2 opacity-30">
        {direction === "up" ?
            <ArrowBigUp fill={"white"} className="w-16 h-32"/> :
            <ArrowBigDown fill={"white"} className="w-16 h-32" />}
      </div>
    </div>
}

// --- Composant Principal ---
export default function GuessTable({ guesses }: { guesses: GuessResultDTO[] }) {
  const { t } = useTranslation();
  return (
    <div className="w-full overflow-x-auto rounded-md border">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">{t("guessTable.anime")}</TableHead>
            <TableHead className="text-center">{t("guessTable.format")}</TableHead>
            <TableHead className="text-center">{t("guessTable.demographic")}</TableHead>
            <TableHead className="text-center">{t("guessTable.studio")}</TableHead>
            <TableHead className="text-center">{t("guessTable.source")}</TableHead>
            <TableHead className="text-center">{t("guessTable.genres")}</TableHead>
            <TableHead className="text-center">{t("guessTable.episodes")}</TableHead>
            <TableHead className="text-center">{t("guessTable.season")}</TableHead>
            <TableHead className="text-center">{t("guessTable.score")}</TableHead>
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
              <TableRow key={`${a.id}-${rowIndex}`} className="hover:bg-transparent border-b-0 mx-auto">
                {/** L'animation est active uniquement sur la première ligne. */}
                {/* 1. Anime - Delay 0 */}
                <AnimatedCell
                  delay={0}
                  status={guess.isCorrect ? "correct" : "incorrect"}
                  shouldAnimate={rowIndex === 0}
                >
                  <div className="flex flex-col items-center w-12">
                    <Tooltip key={a.title}>
                        <TooltipTrigger>
                        {a.imageUrl && (
                          <img src={a.imageUrl} alt={a.title} className="w-15 h-18 object-cover rounded-sm" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>{a.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </AnimatedCell>

                {/* 2. Format - Delay 0.15s */}
                <AnimatedCell delay={0.15} status={r.animeFormat.isCorrect ? "correct" : "incorrect"} shouldAnimate={rowIndex === 0}>
                  {a.anime_format}
                </AnimatedCell>

                {/* 3. Demographic - Delay 0.3s */}
                <AnimatedCell delay={0.3} status={r.demographicType.isCorrect ? "correct" : "incorrect"} shouldAnimate={rowIndex === 0}>
                  {a.demographic_type || "N/A"}
                </AnimatedCell>

                {/* 4. Studio - Delay 0.45s */}
                <AnimatedCell delay={0.45} status={r.studio.isCorrect ? "correct" : "incorrect"} shouldAnimate={rowIndex === 0}>
                  {a.studio}
                </AnimatedCell>

                {/* 5. Source - Delay 0.6s */}
                <AnimatedCell delay={0.6} status={r.source.isCorrect ? "correct" : "incorrect"} shouldAnimate={rowIndex === 0}>
                  {a.source}
                </AnimatedCell>

                {/* 6. Genres - Delay 0.75s (Gère l'état "partiel" en orange) */}
                <AnimatedCell delay={0.75} status={genresStatus} shouldAnimate={rowIndex === 0}>
                  <GenreIcons genres={a.genres} />
                </AnimatedCell>

                {/* 7. Episodes - Delay 0.9s (Avec flèches d'indice) */}
                <AnimatedCell
                  delay={0.9}
                  status={r.episodes.isCorrect ? "correct" : "incorrect"}
                  hintDirection={!r.episodes.isCorrect && r.episodes.isHigher !== null ? (r.episodes.isHigher ? "up" : "down") : null}
                  shouldAnimate={rowIndex === 0}
                >
                  {a.episodes || "?"}
                </AnimatedCell>

                {/* 8. Season Start - Delay 1.05s (Avec flèches d'indice) */}
                <AnimatedCell
                  delay={1.05}
                  status={r.seasonStart.isCorrect ? "correct" : "incorrect"}
                  hintDirection={!r.seasonStart.isCorrect && r.seasonStart.isEarlier !== null ? (r.seasonStart.isEarlier ? "down" : "up") : null}
                  shouldAnimate={rowIndex === 0}
                >
                  {a.season_start}
                </AnimatedCell>

                {/* 9. Score - Delay 1.2s (Avec flèches d'indice) */}
                <AnimatedCell
                  delay={1.2}
                  status={r.score.isCorrect ? "correct" : "incorrect"}
                  hintDirection={!r.score.isCorrect && r.score.isHigher !== null ? (r.score.isHigher ? "up" : "down") : null}
                  shouldAnimate={rowIndex === 0}
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
