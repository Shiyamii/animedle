/** biome-ignore-all lint/suspicious/useAwait: Test FILE */
/** biome-ignore-all lint/nursery/noShadow: Test FILE */
/** biome-ignore-all lint/style/useNamingConvention: Test FILE */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimeItemDTO, GuessResultDTO } from '@/stores/animeStore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockLoadAnimeList,
  mockGetGuessList,
  mockAddGuessToListAsFirst,
  mockSetFoundAnime,
  mockSetCurrentAnimeDate,
  mockResetGame,
  mockAnimeStore,
} = vi.hoisted(() => {
  const mockLoadAnimeList = vi.fn();
  const mockInitGuessListIfNeeded = vi.fn();
  const mockGetGuessList = vi.fn().mockReturnValue([]);
  const mockAddGuessToListAsFirst = vi.fn();
  const mockSetFoundAnime = vi.fn();
  const mockSetCurrentAnimeDate = vi.fn();
  const mockResetGame = vi.fn();

  const mockAnimeStore = {
    animeList: [] as AnimeItemDTO[],
    guessList: [] as GuessResultDTO[],
    foundAnime: null as AnimeItemDTO | null,
    currentAnimeDate: null as string | null,
    loadAnimeList: mockLoadAnimeList,
    initGuessListIfNeeded: mockInitGuessListIfNeeded,
    getGuessList: mockGetGuessList,
    addGuessToListAsFirst: mockAddGuessToListAsFirst,
    setFoundAnime: mockSetFoundAnime,
    setCurrentAnimeDate: mockSetCurrentAnimeDate,
    resetGame: mockResetGame,
  };

  return {
    mockLoadAnimeList,
    mockInitGuessListIfNeeded,
    mockGetGuessList,
    mockAddGuessToListAsFirst,
    mockSetFoundAnime,
    mockSetCurrentAnimeDate,
    mockResetGame,
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

function mockFetch(opts: { date?: string | null; guessResult?: GuessResultDTO; stats?: Record<string, number> } = {}) {
  const { date = '2026-04-13', guessResult, stats = {} } = opts;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.includes('/current-date')) {
        if (date === null) {
          return Promise.resolve({ ok: false } as Response);
        }
        return Promise.resolve({ ok: true, json: async () => ({ date }) } as Response);
      }
      if (url.includes('/stats')) {
        return Promise.resolve({ ok: true, json: async () => [{ guesses: stats }] } as Response);
      }
      if (url.includes('/guess/')) {
        if (!guessResult) {
          return Promise.resolve({ ok: false, status: 404 } as Response);
        }
        return Promise.resolve({ ok: true, json: async () => guessResult } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    }),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useDailyGuessingPageViewModel } from '../useDailyGuessingPageViewModel';

describe('useDailyGuessingPageViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnimeStore.animeList = [];
    mockAnimeStore.guessList = [];
    mockAnimeStore.foundAnime = null;
    mockAnimeStore.currentAnimeDate = null;
    mockLoadAnimeList.mockResolvedValue(undefined);
    mockGetGuessList.mockReturnValue([]);
    mockFetch();
  });

  // ── état initial ──────────────────────────────────────────────────────────

  describe('état initial', () => {
    it('inputValue est vide', () => {
      const { result } = renderHook(() => useDailyGuessingPageViewModel());
      expect(result.current.inputValue).toBe('');
    });

    it('isGuessingStarted est false', () => {
      const { result } = renderHook(() => useDailyGuessingPageViewModel());
      expect(result.current.isGuessingStarted).toBe(false);
    });

    it('foundAnime est null', () => {
      const { result } = renderHook(() => useDailyGuessingPageViewModel());
      expect(result.current.foundAnime).toBeNull();
    });

    it('guessList est vide par défaut', () => {
      const { result } = renderHook(() => useDailyGuessingPageViewModel());
      expect(result.current.guessList).toEqual([]);
    });

    it('guessStats est vide par défaut', () => {
      const { result } = renderHook(() => useDailyGuessingPageViewModel());
      expect(result.current.guessStats).toEqual({});
    });

    it('filtredAnimeList est vide pour une requête vide', () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto')];
      const { result } = renderHook(() => useDailyGuessingPageViewModel());
      expect(result.current.filtredAnimeList).toEqual([]);
    });
  });

  // ── montage ───────────────────────────────────────────────────────────────

  describe('montage', () => {
    it('charge la liste si elle est vide', () => {
      mockAnimeStore.animeList = [];
      renderHook(() => useDailyGuessingPageViewModel());
      expect(mockLoadAnimeList).toHaveBeenCalled();
    });

    it('ne recharge pas si la liste est déjà remplie', () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto')];
      renderHook(() => useDailyGuessingPageViewModel());
      expect(mockLoadAnimeList).not.toHaveBeenCalled();
    });

    it("récupère la date courante de l'anime depuis l'API", async () => {
      renderHook(() => useDailyGuessingPageViewModel());
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/current-date'));
      });
    });

    it('charge guessList et foundAnime depuis le store quand la date est identique', async () => {
      const anime = makeAnime('1', 'Naruto');
      const existing = [makeGuessResult('1', false)];
      mockAnimeStore.guessList = existing;
      mockAnimeStore.foundAnime = anime;
      mockAnimeStore.currentAnimeDate = '2026-04-13';
      mockFetch({ date: '2026-04-13' });

      const { result } = renderHook(() => useDailyGuessingPageViewModel());

      await waitFor(() => {
        expect(result.current.guessList).toEqual(existing);
        expect(result.current.foundAnime).toEqual(anime);
      });
    });

    it("appelle resetGame si la date a changé et qu'un anime avait été trouvé", async () => {
      mockAnimeStore.foundAnime = makeAnime('1', 'Old Anime');
      mockAnimeStore.currentAnimeDate = '2026-04-12';
      mockFetch({ date: '2026-04-13' });

      renderHook(() => useDailyGuessingPageViewModel());

      await waitFor(() => {
        expect(mockResetGame).toHaveBeenCalled();
      });
    });

    it("ne remet pas à zéro si la date a changé mais aucun anime n'était trouvé", async () => {
      mockAnimeStore.foundAnime = null;
      mockAnimeStore.currentAnimeDate = '2026-04-12';
      mockFetch({ date: '2026-04-13' });

      renderHook(() => useDailyGuessingPageViewModel());

      await waitFor(() => expect(fetch).toHaveBeenCalled());
      expect(mockResetGame).not.toHaveBeenCalled();
    });

    it('ignore silencieusement si /current-date retourne une erreur', async () => {
      mockFetch({ date: null });
      const { result } = renderHook(() => useDailyGuessingPageViewModel());
      await waitFor(() => expect(fetch).toHaveBeenCalled());
      expect(result.current.foundAnime).toBeNull();
    });
  });

  // ── filtrage fuzzy ────────────────────────────────────────────────────────

  describe('filtrage fuzzy', () => {
    it('retourne des résultats pour une requête correspondante', async () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto'), makeAnime('2', 'Bleach')];
      const { result } = renderHook(() => useDailyGuessingPageViewModel());

      act(() => {
        result.current.setInputValue('Naruto');
      });

      await waitFor(() => {
        expect(result.current.filtredAnimeList.length).toBeGreaterThan(0);
        expect(result.current.filtredAnimeList[0].title).toBe('Naruto');
      });
    });

    it('exclut les animes déjà devinés', async () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto'), makeAnime('2', 'Bleach')];
      mockAnimeStore.guessList = [makeGuessResult('1', false)];

      const { result } = renderHook(() => useDailyGuessingPageViewModel());

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
    it('appelle /api/animes/guess/:id en POST', async () => {
      const guessResult = makeGuessResult('1', false);
      mockFetch({ guessResult });
      const { result } = renderHook(() => useDailyGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/animes/guess/1'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('passe guessNumber = longueur de la liste + 1', async () => {
      mockAnimeStore.guessList = [makeGuessResult('0', false)];
      const guessResult = makeGuessResult('1', false);
      mockFetch({ date: '2026-04-13', guessResult });

      const { result } = renderHook(() => useDailyGuessingPageViewModel());

      // Attendre que l'effet async (fetchCurrentAnimeDate) mette à jour guessList
      await waitFor(() => {
        expect(result.current.guessList).toHaveLength(1);
      });

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('guessNumber=2'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('ajoute le résultat au store via addGuessToListAsFirst', async () => {
      const guessResult = makeGuessResult('1', false);
      mockFetch({ guessResult });
      const { result } = renderHook(() => useDailyGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(mockAddGuessToListAsFirst).toHaveBeenCalledWith(guessResult);
    });

    it('définit foundAnime quand tous les résultats sont corrects', async () => {
      const guessResult = makeGuessResult('1', true);
      mockFetch({ guessResult });
      const { result } = renderHook(() => useDailyGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(result.current.foundAnime).toEqual(guessResult.anime);
      expect(mockSetFoundAnime).toHaveBeenCalled();
    });

    it('met à jour la date courante dans le store quand victoire', async () => {
      const guessResult = makeGuessResult('1', true);
      mockFetch({ date: '2026-04-13', guessResult });
      const { result } = renderHook(() => useDailyGuessingPageViewModel());

      // Flusher les microtasks pour que fetchCurrentAnimeDate() s'exécute et
      // que serverAnimeDate soit mis à jour avant d'appeler onAnimeSelect
      await act(async () => {});

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(mockSetCurrentAnimeDate).toHaveBeenCalledWith('2026-04-13');
    });

    it('ne définit pas foundAnime si au moins un résultat est incorrect', async () => {
      const guessResult = makeGuessResult('1', false);
      mockFetch({ guessResult });
      const { result } = renderHook(() => useDailyGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(result.current.foundAnime).toBeNull();
    });

    it('ignore silencieusement si fetch retourne une erreur HTTP', async () => {
      mockFetch({ guessResult: undefined });
      const { result } = renderHook(() => useDailyGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(mockAddGuessToListAsFirst).not.toHaveBeenCalled();
      expect(result.current.foundAnime).toBeNull();
    });

    it('ignore silencieusement si fetch lève une exception réseau', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const { result } = renderHook(() => useDailyGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(mockAddGuessToListAsFirst).not.toHaveBeenCalled();
    });
  });

  // ── guessStats ────────────────────────────────────────────────────────────

  describe('guessStats', () => {
    it('fetche les stats quand foundAnime est défini', async () => {
      const guessResult = makeGuessResult('42', true);
      const stats = { '1': 5, '2': 3 };
      mockFetch({ guessResult, stats });
      const { result } = renderHook(() => useDailyGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('42');
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/stats'));
        expect(result.current.guessStats).toEqual(stats);
      });
    });

    it('reste vide si /stats retourne une erreur', async () => {
      const guessResult = makeGuessResult('42', true);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.includes('/current-date')) {
            return Promise.resolve({ ok: true, json: async () => ({ date: '2026-04-13' }) } as Response);
          }
          if (url.includes('/guess/')) {
            return Promise.resolve({ ok: true, json: async () => guessResult } as Response);
          }
          if (url.includes('/stats')) {
            return Promise.resolve({ ok: false } as Response);
          }
          return Promise.resolve({ ok: false } as Response);
        }),
      );

      const { result } = renderHook(() => useDailyGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('42');
      });

      await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/stats')));
      expect(result.current.guessStats).toEqual({});
    });
  });
});
