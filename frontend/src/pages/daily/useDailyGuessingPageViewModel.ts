import { useAnimeStore, type AnimeItemDTO, type GuessResultDTO } from "@/stores/animeStore";
import { createFuse, filterAnimeList, makeGuessableList, makeGuessRequest } from "@/viewmodels/guessingViewModel";
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

async function fetchCurrentAnimeDate(): Promise<string | null> {
    try {
        const response = await fetch(import.meta.env.VITE_API_URL + "/api/animes/current-date");
        if (!response.ok) return null;
        const data = await response.json();
        return data.date ?? null;
    } catch {
        return null;
    }
}

export function useDailyGuessingPageViewModel() {
    const animeStore = useAnimeStore();
    const [isGuessingStarted, setIsGuessingStarted] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [fuse, setFuse] = useState<Fuse<AnimeItemDTO>>(createFuse(animeStore.animeList));
    const [filtredAnimeList, setFiltredAnimeList] = useState<AnimeItemDTO[]>([]);
    const [isFilteringLoading, setIsFilteringLoading] = useState(false);
    const [guessList, setGuessList] = useState<GuessResultDTO[]>([]);
    const [foundAnime, setFoundAnime] = useState<AnimeItemDTO | null>(null);
    const [guessStats, setGuessStats] = useState<Record<string, number>>({});
    const [serverAnimeDate, setServerAnimeDate] = useState<string | null>(null);

    useEffect(() => {
        if(animeStore.animeList.length === 0)
            animeStore.loadAnimeList();

        fetchCurrentAnimeDate().then((date) => {
            setServerAnimeDate(date);
            const dateChanged = date && animeStore.currentAnimeDate !== date;
            const isInProgress = animeStore.guessList.length > 0 && !animeStore.foundAnime;
            
            if (dateChanged && isInProgress) {
                animeStore.resetGame();
            } else {
                const list = animeStore.guessList;
                setGuessList(list);
                if (animeStore.foundAnime) {
                    setFoundAnime(animeStore.foundAnime);
                }
            }
        });
    }, []);

    useEffect(() => {
        setFuse(createFuse(makeGuessableList(animeStore.animeList, guessList)));
    }, [animeStore.animeList, guessList]);

    useEffect(() => {
        setIsFilteringLoading(true);
        setFiltredAnimeList(filterAnimeList(fuse, inputValue));
        setIsFilteringLoading(false);
    }, [inputValue, fuse]);

    useEffect(() => {
        if (foundAnime) {
            fetchAnimeStats(foundAnime.id).then(stats => setGuessStats(stats));
        }
    }, [foundAnime?.id]);

    return {
        filtredAnimeList,
        isGuessingStarted,
        setIsGuessingStarted,
        inputValue,
        setInputValue,
        isFilteringLoading,
        guessList,
        onAnimeSelect: async (animeId: string) => {    
            animeStore.initGuessListIfNeeded();        
            const guessResult = await makeGuessRequest({
                animeId,
                guessNumber: guessList.length + 1,
                endpoint: "/api/animes/guess",
            });
            if(guessResult) {
                animeStore.addGuessToListAsFirst(guessResult);
                setGuessList(animeStore.getGuessList());

                const success = Object.entries(guessResult.results)
                    .every(([_, value]) => value.isCorrect);
                if(success) {
                    const winAnime: AnimeItemDTO = {
                        id: guessResult.anime.id,
                        title: guessResult.anime.title,
                        alias: guessResult.anime.alias,
                        imageUrl: guessResult.anime.imageUrl,
                    };
                    animeStore.setFoundAnime(winAnime);
                    animeStore.setCurrentAnimeDate(serverAnimeDate);
                    setFoundAnime(guessResult.anime);
                }
            }
        },
        foundAnime,
        guessStats,
    };
}
