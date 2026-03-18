import { useAnimeStore, type AnimeItemDTO } from "@/stores/animeStore";
import { useEffect, useState } from "react";

function filterAnimeList(animeList: AnimeItemDTO[], query: string) {
    if (!query) return [];
    const lowerCaseQuery = query.toLowerCase();
    return animeList.filter((anime: AnimeItemDTO) => {
        const titleMatch = anime.title.toLowerCase().includes(lowerCaseQuery);
        const alternativeTitleMatch = anime.alias.some((altTitle: string) => altTitle.toLowerCase().includes(lowerCaseQuery));
        return titleMatch || alternativeTitleMatch;
    });
}

export function useHomePageViewModel() {
    const animeStore = useAnimeStore();
    const [isGuessingStarted, setIsGuessingStarted] = useState(false);
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        if(animeStore.animeList.length === 0)
            animeStore.loadAnimeList();
    }, []);


    
    useEffect(() => {
    }, [inputValue]);

    return {
        filtredAnimeList: filterAnimeList(animeStore.animeList, inputValue),
        isGuessingStarted,
        setIsGuessingStarted,
        inputValue,
        setInputValue
    };
}