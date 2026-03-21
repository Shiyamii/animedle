import Fuse from "fuse.js";
import type { AnimeItemDTO, GuessResultDTO } from "@/stores/animeStore";

export function filterAnimeList(fuse: Fuse<AnimeItemDTO>, query: string): AnimeItemDTO[] {
    if (!query) return [];
    const results = fuse.search(query, { limit: 20 });
    return results.map((result: any) => result.item);
}

export function createFuse(animeList: AnimeItemDTO[]): Fuse<AnimeItemDTO> {
    return new Fuse(
        animeList,
        {
            keys: [
                { name: "title", weight: 0.7 },
                { name: "alias", weight: 0.3 },
            ],
            threshold: 0.3,
            ignoreLocation: true,
        }
    );
}

export function makeGuessableList(animeList: AnimeItemDTO[], guessList: GuessResultDTO[]): AnimeItemDTO[] {
    const guessedAnimeIds = new Set(guessList.map(guess => guess.anime.id));
    return animeList.filter(anime => !guessedAnimeIds.has(anime.id));
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
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            console.error("Failed to make guess:", response.statusText);
            return;
        }

        const guessResult: GuessResultDTO = await response.json();
        return guessResult;
    } catch (error) {
        console.error("Error making guess:", error);
    }
}
