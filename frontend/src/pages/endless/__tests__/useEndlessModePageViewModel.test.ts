/** biome-ignore-all lint/suspicious/useAwait: Test FILE */
/** biome-ignore-all lint/nursery/noShadow: Test FILE */
/** biome-ignore-all lint/style/useNamingConvention: Test FILE */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimeItemDTO, GuessResultDTO, RandomAnimeDTO } from '@/stores/animeStore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockLoadAnimeList,
  mockGetEndlessGuessList,
  mockAddEndlessGuessToListAsFirst,
  mockSetAnimeToGuess,
  mockClearEndlessGuessList,
  mockSetFoundAnime,
  mockSetCurrentAnimeDate,
  mockSetGuessDate,
  mockAnimeStore,
} = vi.hoisted(() => {
  const mockLoadAnimeList = vi.fn();
  const mockGetEndlessGuessList = vi.fn().mockReturnValue([]);
  const mockAddEndlessGuessToListAsFirst = vi.fn();
  const mockSetAnimeToGuess = vi.fn();
  const mockClearEndlessGuessList = vi.fn();
  const mockSetFoundAnime = vi.fn();
  const mockSetCurrentAnimeDate = vi.fn();
  const mockSetGuessDate = vi.fn();

  const mockAnimeStore = {
    animeList: [] as AnimeItemDTO[],
    animeToGuess: null as RandomAnimeDTO | null,
    loadAnimeList: mockLoadAnimeList,
    getEndlessGuessList: mockGetEndlessGuessList,
    addEndlessGuessToListAsFirst: mockAddEndlessGuessToListAsFirst,
    setAnimeToGuess: mockSetAnimeToGuess,
    clearEndlessGuessList: mockClearEndlessGuessList,
    setFoundAnime: mockSetFoundAnime,
    setCurrentAnimeDate: mockSetCurrentAnimeDate,
    setGuessDate: mockSetGuessDate,
  };

  return {
    mockLoadAnimeList,
    mockGetEndlessGuessList,
    mockAddEndlessGuessToListAsFirst,
    mockSetAnimeToGuess,
    mockClearEndlessGuessList,
    mockSetFoundAnime,
    mockSetCurrentAnimeDate,
    mockSetGuessDate,
    mockAnimeStore,
  };
});

vi.mock('@/stores/animeStore', () => ({
  useAnimeStore: vi.fn().mockImplementation(() => mockAnimeStore),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAnime(id: string, title: string): AnimeItemDTO {
  return { id, title, alias: [], imageUrl: 'https://example.com/img.webp' };
}

function makeGuessResult(animeId: string, isCorrect: boolean): GuessResultDTO {
  return {
    isCorrect,
    guessNumber: 1,
    results: {
      demographicType: { isCorrect },
      episodes: { isCorrect, isHigher: null },
      seasonStart: { isCorrect, isEarlier: null },
      studio: { isCorrect },
      source: { isCorrect },
      score: { isCorrect, isHigher: null },
      genres: { isCorrect, isPartiallyCorrect: false },
      animeFormat: { isCorrect },
    },
    anime: {
      id: animeId,
      title: 'Test Anime',
      alias: [],
      imageUrl: 'https://example.com/img.webp',
      demographic_type: 'Shonen',
      episodes: 12,
      season_start: '2020',
      studio: 'Studio A',
      source: 'Manga',
      score: 8,
      genres: ['Action'],
      anime_format: 'TV',
    },
  };
}

function mockFetch(opts: { endlessTarget?: RandomAnimeDTO | null; guessResult?: GuessResultDTO } = {}) {
  const { endlessTarget = null, guessResult } = opts;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.includes('/endless/guess/')) {
        if (!guessResult) return Promise.resolve({ ok: false, status: 404 } as Response);
        return Promise.resolve({ ok: true, json: async () => guessResult } as Response);
      }
      if (url.includes('/endless')) {
        if (endlessTarget === null) return Promise.resolve({ ok: false, status: 404 } as Response);
        return Promise.resolve({ ok: true, json: async () => endlessTarget } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    }),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useEndlessModePageViewModel } from '../useEndlessModePageViewModel';

describe('useEndlessModePageViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnimeStore.animeList = [];
    mockAnimeStore.animeToGuess = null;
    mockLoadAnimeList.mockResolvedValue(undefined);
    mockGetEndlessGuessList.mockReturnValue([]);
    mockFetch();
  });

  // ── état initial ──────────────────────────────────────────────────────────

  describe('état initial', () => {
    it('inputValue est vide', () => {
      const { result } = renderHook(() => useEndlessModePageViewModel());
      expect(result.current.inputValue).toBe('');
    });

    it('isGuessingStarted est false', () => {
      const { result } = renderHook(() => useEndlessModePageViewModel());
      expect(result.current.isGuessingStarted).toBe(false);
    });

    it("foundAnime est null quand aucun anime n'a été deviné", () => {
      const { result } = renderHook(() => useEndlessModePageViewModel());
      expect(result.current.foundAnime).toBeNull();
    });

    it('guessList est vide par défaut', () => {
      const { result } = renderHook(() => useEndlessModePageViewModel());
      expect(result.current.guessList).toEqual([]);
    });

    it('filtredAnimeList est vide pour une requête vide', () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto')];
      const { result } = renderHook(() => useEndlessModePageViewModel());
      expect(result.current.filtredAnimeList).toEqual([]);
    });
  });

  // ── montage ───────────────────────────────────────────────────────────────

  describe('montage', () => {
    it("charge la liste d'animes si elle est vide", () => {
      mockAnimeStore.animeList = [];
      renderHook(() => useEndlessModePageViewModel());
      expect(mockLoadAnimeList).toHaveBeenCalled();
    });

    it('ne recharge pas la liste si elle est déjà remplie', () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto')];
      renderHook(() => useEndlessModePageViewModel());
      expect(mockLoadAnimeList).not.toHaveBeenCalled();
    });

    it("fetche un anime cible si aucun n'est en store", async () => {
      mockAnimeStore.animeToGuess = null;
      const target: RandomAnimeDTO = { id: 'target-1' };
      mockFetch({ endlessTarget: target });

      renderHook(() => useEndlessModePageViewModel());

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/animes/endless'));
      });
    });

    it('stocke la cible dans le store après fetch', async () => {
      mockAnimeStore.animeToGuess = null;
      const target: RandomAnimeDTO = { id: 'target-1' };
      mockFetch({ endlessTarget: target });

      renderHook(() => useEndlessModePageViewModel());

      await waitFor(() => {
        expect(mockSetAnimeToGuess).toHaveBeenCalledWith(target);
      });
    });

    it("appelle clearEndlessGuessList si aucune cible n'est en store", () => {
      mockAnimeStore.animeToGuess = null;
      renderHook(() => useEndlessModePageViewModel());
      expect(mockClearEndlessGuessList).toHaveBeenCalled();
    });

    it('charge les guesses existants si une cible est déjà en store', () => {
      const target: RandomAnimeDTO = { id: 'target-1' };
      mockAnimeStore.animeToGuess = target;
      const existing = [makeGuessResult('2', false)];
      mockGetEndlessGuessList.mockReturnValue(existing);

      const { result } = renderHook(() => useEndlessModePageViewModel());
      expect(result.current.guessList).toEqual(existing);
    });

    it("définit foundAnime si l'anime cible est déjà dans les guesses", () => {
      const target: RandomAnimeDTO = { id: 'target-1' };
      mockAnimeStore.animeToGuess = target;
      const correctGuess = makeGuessResult('target-1', true);
      mockGetEndlessGuessList.mockReturnValue([correctGuess]);

      const { result } = renderHook(() => useEndlessModePageViewModel());
      expect(result.current.foundAnime).toEqual(correctGuess.anime);
    });

    it("foundAnime est null si l'anime cible n'est pas encore dans les guesses", () => {
      const target: RandomAnimeDTO = { id: 'target-1' };
      mockAnimeStore.animeToGuess = target;
      const wrongGuess = makeGuessResult('other-anime', false);
      mockGetEndlessGuessList.mockReturnValue([wrongGuess]);

      const { result } = renderHook(() => useEndlessModePageViewModel());
      expect(result.current.foundAnime).toBeNull();
    });
  });

  // ── filtrage fuzzy ────────────────────────────────────────────────────────

  describe('filtrage fuzzy', () => {
    it('retourne des résultats pour une requête correspondante', async () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto'), makeAnime('2', 'Bleach')];
      const { result } = renderHook(() => useEndlessModePageViewModel());

      act(() => {
        result.current.setInputValue('Naruto');
      });

      await waitFor(() => {
        expect(result.current.filtredAnimeList.length).toBeGreaterThan(0);
        expect(result.current.filtredAnimeList[0].title).toBe('Naruto');
      });
    });

    it('exclut les animes déjà devinés de la liste filtrée', async () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto'), makeAnime('2', 'Bleach')];
      const target: RandomAnimeDTO = { id: 'target-1' };
      mockAnimeStore.animeToGuess = target;
      mockGetEndlessGuessList.mockReturnValue([makeGuessResult('1', false)]);

      const { result } = renderHook(() => useEndlessModePageViewModel());

      act(() => {
        result.current.setInputValue('Naruto');
      });

      await waitFor(() => {
        const ids = result.current.filtredAnimeList.map((a) => a.id);
        expect(ids).not.toContain('1');
      });
    });
  });

  // ── onAnimeSelect ─────────────────────────────────────────────────────────

  describe('onAnimeSelect', () => {
    it('appelle /api/animes/endless/guess/:id en POST', async () => {
      const target: RandomAnimeDTO = { id: 'ref-1' };
      mockAnimeStore.animeToGuess = target;
      const guessResult = makeGuessResult('1', false);
      mockFetch({ guessResult });

      const { result } = renderHook(() => useEndlessModePageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/animes/endless/guess/1'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('passe refAnimeId dans les query params', async () => {
      const target: RandomAnimeDTO = { id: 'ref-42' };
      mockAnimeStore.animeToGuess = target;
      const guessResult = makeGuessResult('1', false);
      mockFetch({ guessResult });

      const { result } = renderHook(() => useEndlessModePageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('refAnimeId=ref-42'), expect.anything());
    });

    it('ajoute le résultat au store via addEndlessGuessToListAsFirst', async () => {
      const target: RandomAnimeDTO = { id: 'ref-1' };
      mockAnimeStore.animeToGuess = target;
      const guessResult = makeGuessResult('1', false);
      mockFetch({ guessResult });

      const { result } = renderHook(() => useEndlessModePageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(mockAddEndlessGuessToListAsFirst).toHaveBeenCalledWith(guessResult);
    });

    it('définit foundAnime quand tous les résultats sont corrects', async () => {
      const target: RandomAnimeDTO = { id: 'ref-1' };
      mockAnimeStore.animeToGuess = target;
      const guessResult = makeGuessResult('1', true);
      mockFetch({ guessResult });

      const { result } = renderHook(() => useEndlessModePageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(result.current.foundAnime).toEqual(guessResult.anime);
    });

    it('ne définit pas foundAnime si un résultat est incorrect', async () => {
      const target: RandomAnimeDTO = { id: 'ref-1' };
      mockAnimeStore.animeToGuess = target;
      const guessResult = makeGuessResult('1', false);
      mockFetch({ guessResult });

      const { result } = renderHook(() => useEndlessModePageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(result.current.foundAnime).toBeNull();
    });

    it('ignore silencieusement si fetch retourne une erreur HTTP', async () => {
      const target: RandomAnimeDTO = { id: 'ref-1' };
      mockAnimeStore.animeToGuess = target;
      mockFetch({ guessResult: undefined });

      const { result } = renderHook(() => useEndlessModePageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(mockAddEndlessGuessToListAsFirst).not.toHaveBeenCalled();
      expect(result.current.foundAnime).toBeNull();
    });

    it('ignore silencieusement si fetch lève une exception réseau', async () => {
      const target: RandomAnimeDTO = { id: 'ref-1' };
      mockAnimeStore.animeToGuess = target;
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const { result } = renderHook(() => useEndlessModePageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(mockAddEndlessGuessToListAsFirst).not.toHaveBeenCalled();
    });
  });

  // ── startNewGame ──────────────────────────────────────────────────────────

  describe('startNewGame', () => {
    it('appelle setAnimeToGuess(null)', () => {
      const { result } = renderHook(() => useEndlessModePageViewModel());

      act(() => {
        result.current.startNewGame();
      });

      expect(mockSetAnimeToGuess).toHaveBeenCalledWith(null);
    });

    it('appelle clearEndlessGuessList', () => {
      const { result } = renderHook(() => useEndlessModePageViewModel());
      vi.clearAllMocks();

      act(() => {
        result.current.startNewGame();
      });

      expect(mockClearEndlessGuessList).toHaveBeenCalled();
    });

    it('appelle setFoundAnime(null) et setCurrentAnimeDate(null)', () => {
      const { result } = renderHook(() => useEndlessModePageViewModel());

      act(() => {
        result.current.startNewGame();
      });

      expect(mockSetFoundAnime).toHaveBeenCalledWith(null);
      expect(mockSetCurrentAnimeDate).toHaveBeenCalledWith(null);
    });

    it('appelle setGuessDate(null)', () => {
      const { result } = renderHook(() => useEndlessModePageViewModel());

      act(() => {
        result.current.startNewGame();
      });

      expect(mockSetGuessDate).toHaveBeenCalledWith(null);
    });

    it('remet guessList à []', async () => {
      const target: RandomAnimeDTO = { id: 'ref-1' };
      mockAnimeStore.animeToGuess = target;
      mockGetEndlessGuessList.mockReturnValue([makeGuessResult('1', false)]);

      const { result } = renderHook(() => useEndlessModePageViewModel());

      await act(async () => {
        result.current.startNewGame();
      });

      expect(result.current.guessList).toEqual([]);
    });

    it("remet foundAnime à null dans l'état local", async () => {
      const target: RandomAnimeDTO = { id: 'ref-1' };
      mockAnimeStore.animeToGuess = target;
      const guessResult = makeGuessResult('1', true);
      mockFetch({ guessResult });
      mockGetEndlessGuessList.mockReturnValue([guessResult]);

      const { result } = renderHook(() => useEndlessModePageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      await act(async () => {
        result.current.startNewGame();
      });

      expect(result.current.foundAnime).toBeNull();
    });

    it('fetche un nouvel anime cible après réinitialisation', async () => {
      const newTarget: RandomAnimeDTO = { id: 'new-target' };
      mockFetch({ endlessTarget: newTarget });

      const { result } = renderHook(() => useEndlessModePageViewModel());

      await act(async () => {
        result.current.startNewGame();
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/animes/endless'));
      });
    });
  });
});
