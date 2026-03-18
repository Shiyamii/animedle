import { useAnimeStore, type AnimeItemDTO } from "@/stores/animeStore";
import { useEffect, useState } from "react";
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

export function useHomePageViewModel() {
    const animeStore = useAnimeStore();
    const [isGuessingStarted, setIsGuessingStarted] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [fuse, setFuse] = useState<Fuse<AnimeItemDTO>>(createFuse(animeStore.animeList));
    const [filtredAnimeList, setFiltredAnimeList] = useState<AnimeItemDTO[]>([]);
    const [isFilteringLoading, setIsFilteringLoading] = useState(false);

    useEffect(() => {
        if(animeStore.animeList.length === 0)
            animeStore.loadAnimeList();
    }, []);

    useEffect(() => {
        setFuse(createFuse(animeStore.animeList));
    }, [animeStore.animeList]);
 
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
        isFilteringLoading
    };
}