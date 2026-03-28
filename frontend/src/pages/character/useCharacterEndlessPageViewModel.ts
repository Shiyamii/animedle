import { useAnimeStore, type AnimeItemDTO, type CharacterGuessResultDTO } from "@/stores/animeStore";
import {
    createFuse,
    fetchCharacterDailyHintConfig,
    fetchCharacterEndlessTarget,
    filterAnimeList,
    makeCharacterEndlessGuessRequest,
    makeGuessableListForCharacter,
    type CharacterDailyHintConfigDTO,
} from "@/viewmodels/guessingViewModel";
import Fuse from "fuse.js";
import { useEffect, useMemo, useState } from "react";

export function useCharacterEndlessPageViewModel() {
    const animeStore = useAnimeStore();
    const [inputValue, setInputValue] = useState("");
    const [fuse, setFuse] = useState<Fuse<AnimeItemDTO>>(createFuse(animeStore.animeList));
    const [filtredAnimeList, setFiltredAnimeList] = useState<AnimeItemDTO[]>([]);
    const [isFilteringLoading, setIsFilteringLoading] = useState(false);
    const [guessList, setGuessList] = useState<CharacterGuessResultDTO[]>([]);
    const [rulesConfig, setRulesConfig] = useState<Pick<
        CharacterDailyHintConfigDTO,
        "hintTiers" | "imageBlur"
    > | null>(null);

    useEffect(() => {
        animeStore.loadAnimeList();
        fetchCharacterDailyHintConfig().then((c) => {
            if (c) {
                setRulesConfig({ hintTiers: c.hintTiers, imageBlur: c.imageBlur });
            }
        });
        let target = useAnimeStore.getState().characterEndlessTarget;
        if (target && !target.mysteryImageUrl) {
            animeStore.setCharacterEndlessTarget(null);
            animeStore.clearCharacterEndlessGuessList();
            target = null;
        }
        if (!target) {
            fetchCharacterEndlessTarget().then((t) => {
                if (t) {
                    useAnimeStore.getState().setCharacterEndlessTarget(t);
                }
            });
            useAnimeStore.getState().clearCharacterEndlessGuessList();
            setGuessList([]);
        } else {
            setGuessList(useAnimeStore.getState().getCharacterEndlessGuessList());
        }
    }, []);

    const hintConfig = useMemo((): CharacterDailyHintConfigDTO | null => {
        const target = animeStore.characterEndlessTarget;
        if (!rulesConfig || !target?.mysteryImageUrl) {
            return null;
        }
        return {
            hintTiers: rulesConfig.hintTiers,
            imageBlur: rulesConfig.imageBlur,
            mysteryImageUrl: target.mysteryImageUrl,
            mysteryCharacterName: target.mysteryCharacterName,
        };
    }, [rulesConfig, animeStore.characterEndlessTarget]);

    useEffect(() => {
        setFuse(createFuse(makeGuessableListForCharacter(animeStore.animeList, guessList)));
    }, [animeStore.animeList, guessList]);

    useEffect(() => {
        setIsFilteringLoading(true);
        setFiltredAnimeList(filterAnimeList(fuse, inputValue));
        setIsFilteringLoading(false);
    }, [inputValue, fuse]);

    const hints = guessList[0]?.hints ?? {};

    const foundAnime = useMemo(() => {
        const win = guessList.find((g) => g.isCorrect);
        if (!win) {
            return null;
        }
        return animeStore.animeList.find((a: AnimeItemDTO) => a.id === win.guessedAnimeId) ?? null;
    }, [guessList, animeStore.animeList]);

    return {
        hintConfig,
        animeList: animeStore.animeList,
        filtredAnimeList,
        inputValue,
        setInputValue,
        isFilteringLoading,
        guessList,
        hints,
        foundAnime,
        onAnimeSelect: async (animeId: string) => {
            const refId = useAnimeStore.getState().characterEndlessTarget?.id;
            if (!refId) {
                return;
            }
            const guessResult = await makeCharacterEndlessGuessRequest(animeId, guessList.length + 1, refId);
            if (!guessResult) {
                return;
            }
            animeStore.addCharacterEndlessGuessToListAsFirst(guessResult);
            setGuessList(animeStore.getCharacterEndlessGuessList());
        },
        startNewGame: () => {
            animeStore.setCharacterEndlessTarget(null);
            animeStore.clearCharacterEndlessGuessList();
            setGuessList([]);
            fetchCharacterEndlessTarget().then((t) => {
                if (t) {
                    animeStore.setCharacterEndlessTarget(t);
                }
            });
        },
    };
}
