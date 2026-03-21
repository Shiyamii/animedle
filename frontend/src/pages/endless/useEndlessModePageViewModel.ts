import { useAnimeStore, type AnimeItemDTO, type GuessResultDTO, type RandomAnimeDTO } from "@/stores/animeStore";
import { createFuse, filterAnimeList, makeGuessableList, makeGuessRequest } from "@/viewmodels/guessingViewModel";
import { useEffect, useState } from "react";
import Fuse from "fuse.js";

function fecthAnimeToGuess(): Promise<RandomAnimeDTO | null> {
    return fetch(import.meta.env.VITE_API_URL + "/api/animes/endless")
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch anime to guess");
            }
            return response.json();
        })
        .then((data: RandomAnimeDTO) => data)
        .catch(error => {
            console.error("Error fetching anime to guess:", error);
            return null;
        });
}

export function useEndlessModePageViewModel() {
    const animeStore = useAnimeStore();
    const [isGuessingStarted, setIsGuessingStarted] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [fuse, setFuse] = useState<Fuse<AnimeItemDTO>>(createFuse(animeStore.animeList));
    const [filtredAnimeList, setFiltredAnimeList] = useState<AnimeItemDTO[]>([]);
    const [isFilteringLoading, setIsFilteringLoading] = useState(false);
    const [guessList, setGuessList] = useState<GuessResultDTO[]>([]);
    const [foundAnime, setFoundAnime] = useState<AnimeItemDTO | null>(null);

    useEffect(() => {
        if(animeStore.animeList.length === 0)
            animeStore.loadAnimeList();
        setGuessList(animeStore.getEndlessGuessList())
        const animeToGuess = animeStore.animeToGuess;
        if(!animeToGuess) {
            fecthAnimeToGuess().then((anime) => {
                if(anime) {
                    animeStore.setAnimeToGuess(anime);
                }
            });
        }
    }, []);

    useEffect(() => {
        setFuse(createFuse(makeGuessableList(animeStore.animeList, guessList)));
    }, [animeStore.animeList, guessList]);
 
    useEffect(() => {
        setIsFilteringLoading(true);
        setFiltredAnimeList(filterAnimeList(fuse, inputValue));
        setIsFilteringLoading(false);
    }, [inputValue]);

    return {
        filtredAnimeList,
        isGuessingStarted,
        setIsGuessingStarted,
        inputValue,
        setInputValue,
        isFilteringLoading,
        guessList,
        onAnimeSelect: async (animeId: string) => {
            const guessResult = await makeGuessRequest({
                animeId,
                guessNumber: guessList.length + 1,
                endpoint: "/api/animes/endless/guess",
                queryParams: {
                    refAnimeId: animeStore.animeToGuess?.id || "",
                },
            });
            if(guessResult) {
                animeStore.addEndlessGuessToListAsFirst(guessResult);
                setGuessList(animeStore.getEndlessGuessList());
                const success = Object.entries(guessResult.results)
                    .every(([_, value]) => value.isCorrect);
                if(success) {
                    setFoundAnime(guessResult.anime);
                }
            }
        },
        foundAnime,
        startNewGame: () => {
            animeStore.setAnimeToGuess(null);
            animeStore.setFoundAnime(null);
            animeStore.setCurrentAnimeDate(null);
            animeStore.setGuessDate(null);
            animeStore.clearEndlessGuessList();
            setGuessList([]);
            setFoundAnime(null);
            fecthAnimeToGuess().then((anime) => {
                if(anime) {
                    animeStore.setAnimeToGuess(anime);
                }
            });
        }
    };
}