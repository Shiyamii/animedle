import { useAnimeStore, type AnimeItemDTO } from "@/stores/animeStore";
import { useEffect, useState } from "react";
import Fuse from "fuse.js";

function filterAnimeList(fuse: Fuse<AnimeItemDTO>, query: string): AnimeItemDTO[] {
    if (!query) return [];
    const results = fuse.search(query);
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

export function useHomePageViewModel() {
    const animeStore = useAnimeStore();
    const [isGuessingStarted, setIsGuessingStarted] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [fuse, setFuse] = useState<Fuse<AnimeItemDTO>>(createFuse(animeStore.animeList));

    useEffect(() => {
        if(animeStore.animeList.length === 0)
            animeStore.loadAnimeList();
    }, []);

    useEffect(() => {
        setFuse(createFuse(animeStore.animeList));
    }, [animeStore.animeList]);
 

    return {
        filtredAnimeList: filterAnimeList(fuse, inputValue),
        isGuessingStarted,
        setIsGuessingStarted,
        inputValue,
        setInputValue
    };
}