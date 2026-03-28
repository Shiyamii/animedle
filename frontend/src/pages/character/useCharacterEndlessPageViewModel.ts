import { useAnimeStore, type AnimeItemDTO, type AnimeStore, type CharacterGuessResultDTO } from "@/stores/animeStore";
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
    const animeList = useAnimeStore((s: AnimeStore) => s.animeList);
    const characterEndlessTarget = useAnimeStore((s: AnimeStore) => s.characterEndlessTarget);

    const [inputValue, setInputValue] = useState("");
    const [fuse, setFuse] = useState<Fuse<AnimeItemDTO>>(createFuse(animeList));
    const [filtredAnimeList, setFiltredAnimeList] = useState<AnimeItemDTO[]>([]);
    const [isFilteringLoading, setIsFilteringLoading] = useState(false);
    const [guessList, setGuessList] = useState<CharacterGuessResultDTO[]>([]);
    const [rulesConfig, setRulesConfig] = useState<Pick<
        CharacterDailyHintConfigDTO,
        "hintTiers" | "imageBlur"
    > | null>(null);

    useEffect(() => {
        fetchCharacterDailyHintConfig().then((c) => {
            if (c) {
                setRulesConfig({ hintTiers: c.hintTiers, imageBlur: c.imageBlur });
            }
        });
    }, []);

    useEffect(() => {
        animeStore.loadAnimeList();
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
    }, [animeStore]);

    const hintConfig = useMemo((): CharacterDailyHintConfigDTO | null => {
        const target = characterEndlessTarget;
        if (!rulesConfig || !target?.mysteryImageUrl) {
            return null;
        }
        return {
            hintTiers: rulesConfig.hintTiers,
            imageBlur: rulesConfig.imageBlur,
            mysteryImageUrl: target.mysteryImageUrl,
            mysteryCharacterName: target.mysteryCharacterName,
        };
    }, [rulesConfig, characterEndlessTarget]);

    useEffect(() => {
        setFuse(createFuse(makeGuessableListForCharacter(animeList, guessList)));
    }, [animeList, guessList]);

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
        return animeList.find((a: AnimeItemDTO) => a.id === win.guessedAnimeId) ?? null;
    }, [guessList, animeList]);

    return {
        hintConfig,
        animeList,
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
