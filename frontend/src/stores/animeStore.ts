/** biome-ignore-all lint/style/useNamingConvention: TKT C FINE */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AnimeItemDTO {
  id: string;
  title: string;
  alias: string[];
  imageUrl: string;
}

export interface AnimeDetailsDTO {
  id: string;
  alias: string[];
  title: string;
  demographic_type: string;
  episodes: number;
  season_start: string;
  studio: string;
  source: string;
  score: number;
  genres: string[];
  anime_format: string;
  imageUrl: string;
}

export interface GuessResultDTO {
  isCorrect: boolean;
  results: {
    demographicType: { isCorrect: boolean };
    episodes: { isCorrect: boolean; isHigher: boolean | null };
    seasonStart: { isCorrect: boolean; isEarlier: boolean | null };
    studio: { isCorrect: boolean };
    source: { isCorrect: boolean };
    score: { isCorrect: boolean; isHigher: boolean | null };
    genres: { isCorrect: boolean; isPartiallyCorrect: boolean };
    animeFormat: { isCorrect: boolean };
  };
  anime: AnimeDetailsDTO;
  guessNumber: number;
}

export interface CharacterGuessResultDTO {
  isCorrect: boolean;
  guessedAnimeId: string;
  guessNumber: number;
  hints: {
    imageUrl?: string;
    demographicType?: string | null;
    animeGenres?: string[];
  };
}

export interface RandomAnimeDTO {
  id: string;
}

/** Cible `GET /api/animes/characters/endless` (règles d’indices = daily hint-config). */
export interface CharacterEndlessTargetDTO {
  id: string;
  mysteryImageUrl: string;
  mysteryCharacterName: string;
}

export interface AnimeStore {
  animeList: AnimeItemDTO[];
  guessList: GuessResultDTO[];
  endlessGuessList: GuessResultDTO[];
  guessDate: string | null;
  foundAnime: AnimeItemDTO | null;
  currentAnimeDate: string | null;
  animeToGuess: RandomAnimeDTO | null;
  characterGuessList: CharacterGuessResultDTO[];
  characterGuessDate: string | null;
  characterFoundAnime: AnimeItemDTO | null;
  characterEndlessGuessList: CharacterGuessResultDTO[];
  characterEndlessTarget: RandomAnimeDTO | null;
  getGuessList: () => GuessResultDTO[];
  initGuessListIfNeeded: () => void;
  getEndlessGuessList: () => GuessResultDTO[];
  getCharacterGuessList: () => CharacterGuessResultDTO[];
  getCharacterEndlessGuessList: () => CharacterGuessResultDTO[];
  initCharacterGuessListIfNeeded: () => void;
  setAnimeList: (animes: AnimeItemDTO[]) => void;
  addGuessToListAsFirst: (guess: GuessResultDTO) => void;
  addEndlessGuessToListAsFirst: (guess: GuessResultDTO) => void;
  addCharacterGuessToListAsFirst: (guess: CharacterGuessResultDTO) => void;
  addCharacterEndlessGuessToListAsFirst: (guess: CharacterGuessResultDTO) => void;
  clearCharacterEndlessGuessList: () => void;
  setCharacterEndlessTarget: (target: CharacterEndlessTargetDTO | null) => void;
  setGuessDate: (date: string | null) => void;
  setFoundAnime: (anime: AnimeItemDTO | null) => void;
  setCurrentAnimeDate: (date: string | null) => void;
  setCharacterFoundAnime: (anime: AnimeItemDTO | null) => void;
  resetGame: () => void;
  resetCharacterGame: () => void;
  loadAnimeList: () => Promise<void>;
  setAnimeToGuess: (anime: RandomAnimeDTO) => void;
  clearEndlessGuessList: () => void;
}

export const useAnimeStore: any = create<AnimeStore>()(
  persist(
    (set) => ({
      animeList: [],
      guessList: [],
      endlessGuessList: [],
      guessDate: null,
      foundAnime: null,
      currentAnimeDate: null,
      animeToGuess: null,
      characterGuessList: [],
      characterGuessDate: null,
      characterFoundAnime: null,
      characterEndlessGuessList: [],
      characterEndlessTarget: null,
      getGuessList: () => useAnimeStore.getState().guessList,
      initGuessListIfNeeded: () => {
        const today = new Date().toDateString();
        if (!useAnimeStore.getState().guessDate || useAnimeStore.getState().guessDate !== today) {
          set({ guessList: [], guessDate: today, foundAnime: null, currentAnimeDate: null });
        }
      },
      getEndlessGuessList: () => {
        return useAnimeStore.getState().endlessGuessList;
      },
      getCharacterGuessList: () => useAnimeStore.getState().characterGuessList,
      getCharacterEndlessGuessList: () => useAnimeStore.getState().characterEndlessGuessList,
      initCharacterGuessListIfNeeded: () => {
        const today = new Date().toDateString();
        if (!useAnimeStore.getState().characterGuessDate || useAnimeStore.getState().characterGuessDate !== today) {
          set({
            characterGuessList: [],
            characterGuessDate: today,
            characterFoundAnime: null,
          });
        }
      },
      setAnimeList: (animes) => set({ animeList: animes }),
      addGuessToListAsFirst: (guess) => set((state) => ({ guessList: [guess, ...state.guessList] })),
      addEndlessGuessToListAsFirst: (guess) =>
        set((state) => ({ endlessGuessList: [guess, ...state.endlessGuessList] })),
      addCharacterGuessToListAsFirst: (guess) =>
        set((state) => ({ characterGuessList: [guess, ...state.characterGuessList] })),
      addCharacterEndlessGuessToListAsFirst: (guess) =>
        set((state) => ({
          characterEndlessGuessList: [guess, ...state.characterEndlessGuessList],
        })),
      clearCharacterEndlessGuessList: () => set({ characterEndlessGuessList: [] }),
      setCharacterEndlessTarget: (target) => set({ characterEndlessTarget: target }),
      setGuessDate: (date) => set({ guessDate: date }),
      setFoundAnime: (anime) => set({ foundAnime: anime }),
      setCurrentAnimeDate: (date) => set({ currentAnimeDate: date }),
      resetGame: () => set({ guessList: [], guessDate: null, foundAnime: null, currentAnimeDate: null }),
      setCharacterFoundAnime: (anime) => set({ characterFoundAnime: anime }),
      resetCharacterGame: () => set({ characterGuessList: [], characterGuessDate: null, characterFoundAnime: null }),
      loadAnimeList: async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/animes`);
          if (!response.ok) {
            throw new Error('Failed to fetch anime list');
          }
          const data: AnimeItemDTO[] = await response.json();
          set({ animeList: data });
        } catch (_error) {}
      },
      setAnimeToGuess: (anime) => set({ animeToGuess: anime }),
      clearEndlessGuessList: () => set({ endlessGuessList: [] }),
    }),
    {
      name: 'anime-store',
      partialize: (state) => ({
        guessList: state.guessList,
        guessDate: state.guessDate,
        foundAnime: state.foundAnime,
        currentAnimeDate: state.currentAnimeDate,
        endlessGuessList: state.endlessGuessList,
        animeToGuess: state.animeToGuess,
        characterGuessList: state.characterGuessList,
        characterGuessDate: state.characterGuessDate,
        characterFoundAnime: state.characterFoundAnime,
        characterEndlessGuessList: state.characterEndlessGuessList,
        characterEndlessTarget: state.characterEndlessTarget,
      }),
    },
  ),
);
