import { create } from "zustand";
import { persist } from "zustand/middleware";

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

interface AnimeStore {
    animeList: AnimeItemDTO[];
    guessList: GuessResultDTO[];
    guessDate: string | null;
    foundAnime: AnimeItemDTO | null;
    currentAnimeDate: string | null;
    getGuessList: () => GuessResultDTO[];
    setAnimeList: (animes: AnimeItemDTO[]) => void;
    addGuessToListAsFirst: (guess: GuessResultDTO) => void;
    setGuessDate: (date: string | null) => void;
    setFoundAnime: (anime: AnimeItemDTO | null) => void;
    setCurrentAnimeDate: (date: string | null) => void;
    resetGame: () => void;
    loadAnimeList: () => Promise<void>;
}

export const useAnimeStore: any = create<AnimeStore>()(
    persist(
        (set) => ({
            animeList: [],
            guessList: [],
            guessDate: null,
            foundAnime: null,
            currentAnimeDate: null,
            getGuessList: () => {
                const today = new Date().toDateString();
                if(useAnimeStore.getState().guessDate !== today) {
                    set({ guessList: [], guessDate: today, foundAnime: null, currentAnimeDate: null });
                    return [];
                } else {return useAnimeStore.getState().guessList; }
            },
            setAnimeList: (animes) => set({ animeList: animes }),
            addGuessToListAsFirst: (guess) => set((state) => ({ guessList: [guess, ...state.guessList] })),
            setGuessDate: (date) => set({ guessDate: date }),
            setFoundAnime: (anime) => set({ foundAnime: anime }),
            setCurrentAnimeDate: (date) => set({ currentAnimeDate: date }),
            resetGame: () => set({ guessList: [], guessDate: null, foundAnime: null, currentAnimeDate: null }),
            loadAnimeList: async () => {
                try {
                    const response = await fetch(import.meta.env.VITE_API_URL + "/api/animes");
                    if (!response.ok) {
                        throw new Error("Failed to fetch anime list");
                    }
                    const data: AnimeItemDTO[] = await response.json();
                    set({ animeList: data });
                } catch (error) {
                    console.error("Error loading anime list:", error);
                }
            }
        }),
        {
            name: "anime-store",
            partialize: (state) => ({
                guessList: state.guessList,
                guessDate: state.guessDate,
                foundAnime: state.foundAnime,
                currentAnimeDate: state.currentAnimeDate,
            })
        }
    )
);