import { useAnimeStore } from "@/stores/animeStore";
import { useEffect, useState } from "react";

export function useHomePageViewModel() {
    const animeStore = useAnimeStore();
    const [isGuessingStarted, setIsGuessingStarted] = useState(false);

    useEffect(() => {
        animeStore.loadAnimeList();
    }, []);

    const getAnimeList = () => {
        return animeStore.animeList;
    } 


    return {
        getAnimeList,
        isGuessingStarted,
        setIsGuessingStarted
    };
}