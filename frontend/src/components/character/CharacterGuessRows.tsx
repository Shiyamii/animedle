import type { CharacterGuessResultDTO } from '@/stores/animeStore';
import { resolveGuessDisplay } from './characterGuessingUtils';

type CharacterGuessRowsProps = {
  guessList: CharacterGuessResultDTO[];
  animeList: { id: string; title: string; imageUrl: string }[];
};

export function CharacterGuessRows({ guessList, animeList }: CharacterGuessRowsProps) {
  if (guessList.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3 border-border border-t pt-6">
      <ul className="flex flex-col gap-3">
        {guessList.map((guess) => {
          const { title, imageUrl } = resolveGuessDisplay(guess, animeList);
          return (
            <li
              key={`${guess.guessedAnimeId}-${guess.guessNumber}`}
              className={`flex flex-row items-center gap-3 rounded-lg border border-border px-3 py-2 ${
                guess.isCorrect ? 'bg-green-600/20 text-foreground' : 'bg-red-600/20 text-foreground'
              }`}
            >
              <img src={imageUrl} alt="" className="h-14 w-12 shrink-0 rounded-md object-cover" />
              <span className="font-medium text-lg">{title}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
