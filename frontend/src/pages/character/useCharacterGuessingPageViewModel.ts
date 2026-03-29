import type Fuse from 'fuse.js';
import { useEffect, useState } from 'react';
import { type AnimeItemDTO, type CharacterGuessResultDTO, useAnimeStore } from '@/stores/animeStore';
import {
  type CharacterDailyHintConfigDTO,
  createFuse,
  fetchCharacterDailyHintConfig,
  filterAnimeList,
  makeCharacterGuessRequest,
  makeGuessableListForCharacter,
} from '@/viewmodels/guessingViewModel';

export function useCharacterGuessingPageViewModel() {
  const animeStore = useAnimeStore();
  const [inputValue, setInputValue] = useState('');
  const [fuse, setFuse] = useState<Fuse<AnimeItemDTO>>(createFuse(animeStore.animeList));
  const [filtredAnimeList, setFiltredAnimeList] = useState<AnimeItemDTO[]>([]);
  const [isFilteringLoading, setIsFilteringLoading] = useState(false);
  const [guessList, setGuessList] = useState<CharacterGuessResultDTO[]>([]);
  const [foundAnime, setFoundAnime] = useState<AnimeItemDTO | null>(null);
  const [hintConfig, setHintConfig] = useState<CharacterDailyHintConfigDTO | null>(null);

  useEffect(() => {
    animeStore.loadAnimeList().catch(() => {});
    fetchCharacterDailyHintConfig()
      .then(setHintConfig)
      .catch(() => {});
    animeStore.initCharacterGuessListIfNeeded();
    setGuessList(animeStore.getCharacterGuessList());
    if (animeStore.characterFoundAnime) {
      setFoundAnime(animeStore.characterFoundAnime);
    }
  }, [
    animeStore.characterFoundAnime,
    animeStore.getCharacterGuessList,
    animeStore.initCharacterGuessListIfNeeded,
    animeStore.loadAnimeList,
  ]);

  useEffect(() => {
    setFuse(createFuse(makeGuessableListForCharacter(animeStore.animeList, guessList)));
  }, [animeStore.animeList, guessList]);

  useEffect(() => {
    setIsFilteringLoading(true);
    setFiltredAnimeList(filterAnimeList(fuse, inputValue));
    setIsFilteringLoading(false);
  }, [inputValue, fuse]);

  const hints = guessList[0]?.hints ?? {};

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
      animeStore.initCharacterGuessListIfNeeded();
      const guessResult = await makeCharacterGuessRequest(animeId, guessList.length + 1);
      if (!guessResult) {
        return;
      }
      animeStore.addCharacterGuessToListAsFirst(guessResult);
      setGuessList(animeStore.getCharacterGuessList());

      if (guessResult.isCorrect) {
        const winAnime = animeStore.animeList.find((anime: AnimeItemDTO) => anime.id === guessResult.guessedAnimeId);
        if (!winAnime) {
          return;
        }
        animeStore.setCharacterFoundAnime(winAnime);
        setFoundAnime(winAnime);
      }
    },
  };
}
