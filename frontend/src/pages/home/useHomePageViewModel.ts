import { useAnimeStore, type AnimeItemDTO, type GuessResultDTO } from "@/stores/animeStore";
import { useEffect, useState } from "react";

async function fetchAnimeStats(animeId: string): Promise<Record<string, number>> {
    try {
        const response = await fetch(import.meta.env.VITE_API_URL + "/api/animes/stats?ids=" + animeId);
        if (!response.ok) return {};
        const data = await response.json();
        return data[0]?.guesses ?? {};
    } catch {
        return {};
    }
}
import Fuse from "fuse.js";

function filterAnimeList(fuse: Fuse<AnimeItemDTO>, query: string): AnimeItemDTO[] {
    if (!query) return [];
    const results = fuse.search(query, { limit: 20 });
    return results.map((result: any) => result.item);
}

function createFuse(animeList: AnimeItemDTO[]): Fuse<AnimeItemDTO> {
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

async function makeGuessRequest(animeId: string, guessNumber: number) {
    try{
        const response = await fetch(import.meta.env.VITE_API_URL + "/api/animes/guess/" + animeId + "?guessNumber=" + guessNumber, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
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

function makeGuessableList(animeList: AnimeItemDTO[], guessList: GuessResultDTO[]): AnimeItemDTO[] {
    const guessedAnimeIds = new Set(guessList.map(guess => guess.anime.id));
    return animeList.filter(anime => !guessedAnimeIds.has(anime.id));
}

export function useHomePageViewModel() {
    const animeStore = useAnimeStore();
    const [isGuessingStarted, setIsGuessingStarted] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [fuse, setFuse] = useState<Fuse<AnimeItemDTO>>(createFuse(animeStore.animeList));
    const [filtredAnimeList, setFiltredAnimeList] = useState<AnimeItemDTO[]>([]);
    const [isFilteringLoading, setIsFilteringLoading] = useState(false);
    const [guessList, setGuessList] = useState<GuessResultDTO[]>([]);
    const [foundAnime, setFoundAnime] = useState<AnimeItemDTO | null>(null);
    const [guessStats, setGuessStats] = useState<Record<string, number>>({});

    useEffect(() => {
        if(animeStore.animeList.length === 0)
            animeStore.loadAnimeList();
        setGuessList(animeStore.getGuessList())
    }, []);

    useEffect(() => {
        setFuse(createFuse(makeGuessableList(animeStore.animeList, guessList)));
    }, [animeStore.animeList, guessList]);
 
    useEffect(() => {
        setIsFilteringLoading(true);
        setFiltredAnimeList(filterAnimeList(fuse, inputValue));
        setIsFilteringLoading(false);
    }, [inputValue]);

    if (foundAnime) {
        fetchAnimeStats(foundAnime.id).then(stats => setGuessStats(stats));
    }

    return {
        filtredAnimeList,
        isGuessingStarted,
        setIsGuessingStarted,
        inputValue,
        setInputValue,
        isFilteringLoading,
        guessList,
        onAnimeSelect: async (animeId: string) => {
            const guessResult = await makeGuessRequest(animeId, guessList.length + 1);
            if(guessResult) {
                animeStore.addGuessToListAsFirst(guessResult);
                setGuessList(animeStore.getGuessList());
                const success = Object.entries(guessResult.results)
                    .every(([_, value]) => value.isCorrect);
                if(success) {
                    setFoundAnime(guessResult.anime);
                }
            }
        },
        foundAnime,
        guessStats,
    };
}