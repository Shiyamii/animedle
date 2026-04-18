import Fuse from 'fuse.js';
import type {
  AnimeItemDTO,
  CharacterEndlessTargetDTO,
  CharacterGuessResultDTO,
  GuessResultDTO,
} from '@/stores/animeStore.ts';

export function filterAnimeList(fuse: Fuse<AnimeItemDTO>, query: string): AnimeItemDTO[] {
  if (!query) {
    return [];
  }
  const results = fuse.search(query, { limit: 20 });
  return results.map((result: any) => result.item);
}

export function createFuse(animeList: AnimeItemDTO[]): Fuse<AnimeItemDTO> {
  return new Fuse(animeList, {
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'alias', weight: 0.3 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
  });
}

export function makeGuessableList(animeList: AnimeItemDTO[], guessList: GuessResultDTO[]): AnimeItemDTO[] {
  const guessedAnimeIds = new Set(guessList.map((guess) => guess.anime.id));
  return animeList.filter((anime) => !guessedAnimeIds.has(anime.id));
}

export function makeGuessableListForCharacter(
  animeList: AnimeItemDTO[],
  guessList: CharacterGuessResultDTO[],
): AnimeItemDTO[] {
  const guessedAnimeIds = new Set(guessList.map((guess) => guess.guessedAnimeId));
  return animeList.filter((anime) => !guessedAnimeIds.has(anime.id));
}

type MakeGuessRequestParams = {
  animeId: string;
  guessNumber: number;
  endpoint: string;
  queryParams?: Record<string, string>;
};

export async function makeGuessRequest({
  animeId,
  guessNumber,
  endpoint,
  queryParams,
}: MakeGuessRequestParams): Promise<GuessResultDTO | undefined> {
  try {
    const params = new URLSearchParams({
      guessNumber: String(guessNumber),
      ...(queryParams ?? {}),
    });

    const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}/${animeId}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return;
    }

    const guessResult: GuessResultDTO = await response.json();
    return guessResult;
  } catch (_error) {}
}

export interface CharacterDailyHintConfigDTO {
  hintTiers: { afterGuessCount: number; revealAttributes: string[] }[];
  imageBlur: { totalGuessesUntilClear: number };
  mysteryImageUrl: string;
  mysteryCharacterName: string;
}

export async function fetchCharacterDailyHintConfig(): Promise<CharacterDailyHintConfigDTO | null> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/animes/characters/daily/hint-config`);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as CharacterDailyHintConfigDTO;
  } catch (_error) {
    return null;
  }
}

export async function fetchCharacterEndlessTarget(): Promise<CharacterEndlessTargetDTO | null> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/animes/characters/endless`);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as CharacterEndlessTargetDTO;
  } catch (_error) {
    return null;
  }
}

export async function makeCharacterEndlessGuessRequest(
  animeId: string,
  guessNumber: number,
  refAnimeId: string,
): Promise<CharacterGuessResultDTO | undefined> {
  try {
    const params = new URLSearchParams({
      guessNumber: String(guessNumber),
      refAnimeId,
    });
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/animes/characters/endless/guess/${animeId}?${params.toString()}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    );
    if (!response.ok) {
      return;
    }
    return (await response.json()) as CharacterGuessResultDTO;
  } catch (_error) {}
}

export async function makeCharacterGuessRequest(
  animeId: string,
  guessNumber: number,
): Promise<CharacterGuessResultDTO | undefined> {
  try {
    const params = new URLSearchParams({ guessNumber: String(guessNumber) });
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/animes/characters/daily/guess/${animeId}?${params.toString()}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    );
    if (!response.ok) {
      return;
    }
    return (await response.json()) as CharacterGuessResultDTO;
  } catch (_error) {}
}
