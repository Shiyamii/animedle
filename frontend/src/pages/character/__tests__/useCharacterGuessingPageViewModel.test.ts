/** biome-ignore-all lint/suspicious/useAwait: Test FILE */
/** biome-ignore-all lint/nursery/noShadow: Test FILE */
/** biome-ignore-all lint/style/useNamingConvention: Test FILE */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimeItemDTO, CharacterGuessResultDTO } from '@/stores/animeStore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockLoadAnimeList,
  mockInitCharacterGuessListIfNeeded,
  mockGetCharacterGuessList,
  mockAddCharacterGuessToListAsFirst,
  mockSetCharacterFoundAnime,
  mockAnimeStore,
} = vi.hoisted(() => {
  const mockLoadAnimeList = vi.fn();
  const mockInitCharacterGuessListIfNeeded = vi.fn();
  const mockGetCharacterGuessList = vi.fn().mockReturnValue([]);
  const mockAddCharacterGuessToListAsFirst = vi.fn();
  const mockSetCharacterFoundAnime = vi.fn();

  const mockAnimeStore = {
    animeList: [] as AnimeItemDTO[],
    characterFoundAnime: null as AnimeItemDTO | null,
    loadAnimeList: mockLoadAnimeList,
    initCharacterGuessListIfNeeded: mockInitCharacterGuessListIfNeeded,
    getCharacterGuessList: mockGetCharacterGuessList,
    addCharacterGuessToListAsFirst: mockAddCharacterGuessToListAsFirst,
    setCharacterFoundAnime: mockSetCharacterFoundAnime,
  };

  return {
    mockLoadAnimeList,
    mockInitCharacterGuessListIfNeeded,
    mockGetCharacterGuessList,
    mockAddCharacterGuessToListAsFirst,
    mockSetCharacterFoundAnime,
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

function makeCharacterGuessResult(animeId: string, isCorrect: boolean): CharacterGuessResultDTO {
  return {
    isCorrect,
    guessedAnimeId: animeId,
    guessNumber: 1,
    hints: { imageUrl: 'https://example.com/char.webp' },
  };
}

const HINT_CONFIG = {
  hintTiers: [{ afterGuessCount: 3, revealAttributes: ['demographicType'] }],
  imageBlur: { totalGuessesUntilClear: 5 },
  mysteryImageUrl: 'https://example.com/mystery.webp',
  mysteryCharacterName: 'Mystery',
};

function mockFetch(guessResult?: CharacterGuessResultDTO) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.includes('/hint-config')) {
        return Promise.resolve({ ok: true, json: async () => HINT_CONFIG } as Response);
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

import { useCharacterGuessingPageViewModel } from '../useCharacterGuessingPageViewModel';

describe('useCharacterGuessingPageViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnimeStore.animeList = [];
    mockAnimeStore.characterFoundAnime = null;
    mockLoadAnimeList.mockResolvedValue(undefined);
    mockGetCharacterGuessList.mockReturnValue([]);
    mockFetch();
  });

  // ── état initial ──────────────────────────────────────────────────────────

  describe('état initial', () => {
    it('inputValue est vide', () => {
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());
      expect(result.current.inputValue).toBe('');
    });

    it('guessList est vide par défaut', () => {
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());
      expect(result.current.guessList).toEqual([]);
    });

    it('foundAnime est null par défaut', () => {
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());
      expect(result.current.foundAnime).toBeNull();
    });

    it('hints est vide quand guessList est vide', () => {
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());
      expect(result.current.hints).toEqual({});
    });

    it('filtredAnimeList est vide pour une requête vide', () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto')];
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());
      expect(result.current.filtredAnimeList).toEqual([]);
    });

    it('foundAnime est initialisé depuis characterFoundAnime du store', () => {
      const anime = makeAnime('1', 'Naruto');
      mockAnimeStore.characterFoundAnime = anime;
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());
      expect(result.current.foundAnime).toEqual(anime);
    });

    it('guessList est initialisée depuis getCharacterGuessList du store', () => {
      const existing = [makeCharacterGuessResult('1', false)];
      mockGetCharacterGuessList.mockReturnValue(existing);
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());
      expect(result.current.guessList).toEqual(existing);
    });
  });

  // ── montage ───────────────────────────────────────────────────────────────

  describe('montage', () => {
    it('appelle loadAnimeList au montage', () => {
      renderHook(() => useCharacterGuessingPageViewModel());
      expect(mockLoadAnimeList).toHaveBeenCalled();
    });

    it('appelle initCharacterGuessListIfNeeded au montage', () => {
      renderHook(() => useCharacterGuessingPageViewModel());
      expect(mockInitCharacterGuessListIfNeeded).toHaveBeenCalled();
    });

    it("récupère hintConfig depuis l'API au montage", async () => {
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());
      await waitFor(() => {
        expect(result.current.hintConfig).toEqual(HINT_CONFIG);
      });
    });

    it("hintConfig reste null si l'API retourne une erreur", async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false } as Response));
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());
      await waitFor(() => {
        expect(result.current.hintConfig).toBeNull();
      });
    });
  });

  // ── hints depuis guessList ────────────────────────────────────────────────

  describe('hints', () => {
    it('retourne les hints du premier élément de guessList', async () => {
      const guess = makeCharacterGuessResult('1', false);
      guess.hints = { demographicType: 'Shonen', animeGenres: ['Action'] };
      mockGetCharacterGuessList.mockReturnValue([guess]);
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());
      await waitFor(() => {
        expect(result.current.hints).toEqual(guess.hints);
      });
    });
  });

  // ── filtrage fuzzy ────────────────────────────────────────────────────────

  describe('filtrage fuzzy', () => {
    it('retourne des résultats pour une requête correspondante', async () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto'), makeAnime('2', 'Bleach')];
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());

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
      mockGetCharacterGuessList.mockReturnValue([makeCharacterGuessResult('1', false)]);

      const { result } = renderHook(() => useCharacterGuessingPageViewModel());

      act(() => {
        result.current.setInputValue('Naruto');
      });

      await waitFor(() => {
        const ids = result.current.filtredAnimeList.map((a) => a.id);
        expect(ids).not.toContain('1');
      });
    });

    it('retourne une liste vide quand inputValue est vide', async () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto')];
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());

      act(() => {
        result.current.setInputValue('Nar');
      });

      act(() => {
        result.current.setInputValue('');
      });

      await waitFor(() => {
        expect(result.current.filtredAnimeList).toEqual([]);
      });
    });
  });

  // ── onAnimeSelect ─────────────────────────────────────────────────────────

  describe('onAnimeSelect', () => {
    it('appelle /api/animes/characters/daily/guess/:id en POST', async () => {
      const guessResult = makeCharacterGuessResult('1', false);
      mockFetch(guessResult);
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/animes/characters/daily/guess/1'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('passe guessNumber correspondant à la position dans la liste', async () => {
      const existing = [makeCharacterGuessResult('0', false)];
      mockGetCharacterGuessList.mockReturnValue(existing);
      const guessResult = makeCharacterGuessResult('1', false);
      mockFetch(guessResult);

      const { result } = renderHook(() => useCharacterGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('guessNumber=2'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('ajoute le résultat au store via addCharacterGuessToListAsFirst', async () => {
      const guessResult = makeCharacterGuessResult('1', false);
      mockFetch(guessResult);
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(mockAddCharacterGuessToListAsFirst).toHaveBeenCalledWith(guessResult);
    });

    it('définit foundAnime si isCorrect et anime trouvé dans la liste', async () => {
      const anime = makeAnime('1', 'Naruto');
      mockAnimeStore.animeList = [anime];
      const guessResult = makeCharacterGuessResult('1', true);
      mockFetch(guessResult);
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(result.current.foundAnime).toEqual(anime);
      expect(mockSetCharacterFoundAnime).toHaveBeenCalledWith(anime);
    });

    it('ne définit pas foundAnime si isCorrect mais anime introuvable dans la liste', async () => {
      mockAnimeStore.animeList = [];
      const guessResult = makeCharacterGuessResult('99', true);
      mockFetch(guessResult);
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('99');
      });

      expect(result.current.foundAnime).toBeNull();
    });

    it('ne définit pas foundAnime si isCorrect est false', async () => {
      const guessResult = makeCharacterGuessResult('1', false);
      mockFetch(guessResult);
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(result.current.foundAnime).toBeNull();
    });

    it('ignore silencieusement si fetch retourne une erreur HTTP', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response));
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(mockAddCharacterGuessToListAsFirst).not.toHaveBeenCalled();
      expect(result.current.foundAnime).toBeNull();
    });

    it('ignore silencieusement si fetch lève une exception réseau', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const { result } = renderHook(() => useCharacterGuessingPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(mockAddCharacterGuessToListAsFirst).not.toHaveBeenCalled();
    });
  });
});
