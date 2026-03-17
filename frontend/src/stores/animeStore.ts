import { create } from "zustand";

export interface AnimeItemDTO {
    id: number;
    title: string;
    alias: string[];
    imageUrl: string;
}

interface AnimeStore {
    animeList: AnimeItemDTO[];
    setAnimeList: (animes: AnimeItemDTO[]) => void;
    loadAnimeList: () => Promise<void>;
}

export const useAnimeStore = create<AnimeStore>()((set) => ({
    animeList: [],
    setAnimeList: (animes) => set({ animeList: animes }),
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
}));