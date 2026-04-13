/** biome-ignore-all lint/suspicious/useAwait: Test FILE */
/** biome-ignore-all lint/correctness/noUnusedVariables: Test FILE */
/** biome-ignore-all lint/nursery/noShadow: Test FILE */
/** biome-ignore-all lint/style/useNamingConvention: Test FILE */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimeItemDTO, CharacterEndlessTargetDTO, CharacterGuessResultDTO } from '@/stores/animeStore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockLoadAnimeList,
  mockSetCharacterEndlessTarget,
  mockClearCharacterEndlessGuessList,
  mockAddCharacterEndlessGuessToListAsFirst,
  mockGetCharacterEndlessGuessList,
  mockAnimeStore,
  mockUseAnimeStore,
} = vi.hoisted(() => {
  const mockLoadAnimeList = vi.fn();
  const mockSetCharacterEndlessTarget = vi.fn();
  const mockClearCharacterEndlessGuessList = vi.fn();
  const mockAddCharacterEndlessGuessToListAsFirst = vi.fn();
  const mockGetCharacterEndlessGuessList = vi.fn().mockReturnValue([]);

  const mockAnimeStore = {
    animeList: [] as AnimeItemDTO[],
    characterEndlessTarget: null as CharacterEndlessTargetDTO | null,
    loadAnimeList: mockLoadAnimeList,
    setCharacterEndlessTarget: mockSetCharacterEndlessTarget,
    clearCharacterEndlessGuessList: mockClearCharacterEndlessGuessList,
    addCharacterEndlessGuessToListAsFirst: mockAddCharacterEndlessGuessToListAsFirst,
    getCharacterEndlessGuessList: mockGetCharacterEndlessGuessList,
  };

  // useAnimeStore doit aussi exposer getState (utilisé dans le ViewModel)
  const mockUseAnimeStore = Object.assign(
    vi.fn().mockImplementation(() => mockAnimeStore),
    {
      getState: vi.fn().mockReturnValue(mockAnimeStore),
    },
  );

  return {
    mockLoadAnimeList,
    mockSetCharacterEndlessTarget,
    mockClearCharacterEndlessGuessList,
    mockAddCharacterEndlessGuessToListAsFirst,
    mockGetCharacterEndlessGuessList,
    mockAnimeStore,
    mockUseAnimeStore,
  };
});

vi.mock('@/stores/animeStore', () => ({
  useAnimeStore: mockUseAnimeStore,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAnime(id: string, title: string): AnimeItemDTO {
  return { id, title, alias: [], imageUrl: 'https://example.com/img.webp' };
}

function makeTarget(id = 'target-1'): CharacterEndlessTargetDTO {
  return {
    id,
    mysteryImageUrl: 'https://example.com/mystery.webp',
    mysteryCharacterName: 'Mystery Character',
  };
}

function makeCharacterGuessResult(animeId: string, isCorrect: boolean): CharacterGuessResultDTO {
  return {
    isCorrect,
    guessedAnimeId: animeId,
    guessNumber: 1,
    hints: { imageUrl: 'https://example.com/char.webp' },
  };
}

const RULES_CONFIG = {
  hintTiers: [{ afterGuessCount: 3, revealAttributes: ['demographicType'] }],
  imageBlur: { totalGuessesUntilClear: 5 },
  mysteryImageUrl: 'https://example.com/mystery.webp',
  mysteryCharacterName: 'Mystery Character',
};

function mockFetch(
  opts: {
    hintConfigOk?: boolean;
    endlessTarget?: CharacterEndlessTargetDTO | null;
    guessResult?: CharacterGuessResultDTO;
  } = {},
) {
  const { hintConfigOk = true, endlessTarget = null, guessResult } = opts;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.includes('/hint-config')) {
        if (!hintConfigOk) {
          return Promise.resolve({ ok: false } as Response);
        }
        return Promise.resolve({ ok: true, json: async () => RULES_CONFIG } as Response);
      }
      if (url.includes('/characters/endless/guess/')) {
        if (!guessResult) {
          return Promise.resolve({ ok: false } as Response);
        }
        return Promise.resolve({ ok: true, json: async () => guessResult } as Response);
      }
      if (url.includes('/characters/endless')) {
        if (endlessTarget === null) {
          return Promise.resolve({ ok: false } as Response);
        }
        return Promise.resolve({ ok: true, json: async () => endlessTarget } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    }),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useCharacterEndlessPageViewModel } from '../useCharacterEndlessPageViewModel';

describe('useCharacterEndlessPageViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnimeStore.animeList = [];
    mockAnimeStore.characterEndlessTarget = null;
    mockLoadAnimeList.mockResolvedValue(undefined);
    mockGetCharacterEndlessGuessList.mockReturnValue([]);
    // Synchroniser getState avec l'objet mockAnimeStore
    mockUseAnimeStore.getState.mockReturnValue(mockAnimeStore);
    mockFetch();
  });

  // ── état initial ──────────────────────────────────────────────────────────

  describe('état initial', () => {
    it('inputValue est vide', () => {
      const { result } = renderHook(() => useCharacterEndlessPageViewModel());
      expect(result.current.inputValue).toBe('');
    });

    it('guessList est vide par défaut', () => {
      const { result } = renderHook(() => useCharacterEndlessPageViewModel());
      expect(result.current.guessList).toEqual([]);
    });

    it('foundAnime est null quand aucun guess correct', () => {
      const { result } = renderHook(() => useCharacterEndlessPageViewModel());
      expect(result.current.foundAnime).toBeNull();
    });

    it('hintConfig est null sans target ni rulesConfig', () => {
      const { result } = renderHook(() => useCharacterEndlessPageViewModel());
      expect(result.current.hintConfig).toBeNull();
    });

    it('filtredAnimeList est vide pour une requête vide', () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto')];
      const { result } = renderHook(() => useCharacterEndlessPageViewModel());
      expect(result.current.filtredAnimeList).toEqual([]);
    });

    it('hints est vide quand guessList est vide', () => {
      const { result } = renderHook(() => useCharacterEndlessPageViewModel());
      expect(result.current.hints).toEqual({});
    });
  });

  // ── montage ───────────────────────────────────────────────────────────────

  describe('montage', () => {
    it('appelle loadAnimeList au montage', () => {
      renderHook(() => useCharacterEndlessPageViewModel());
      expect(mockLoadAnimeList).toHaveBeenCalled();
    });

    it("appelle clearCharacterEndlessGuessList quand aucune cible n'est en store", () => {
      mockAnimeStore.characterEndlessTarget = null;
      renderHook(() => useCharacterEndlessPageViewModel());
      expect(mockClearCharacterEndlessGuessList).toHaveBeenCalled();
    });

    it('charge les guesses existants si une cible valide est déjà en store', () => {
      const target = makeTarget();
      mockAnimeStore.characterEndlessTarget = target;
      const existing = [makeCharacterGuessResult('1', false)];
      mockGetCharacterEndlessGuessList.mockReturnValue(existing);

      const { result } = renderHook(() => useCharacterEndlessPageViewModel());
      expect(result.current.guessList).toEqual(existing);
    });

    it('efface la cible et les guesses si mysteryImageUrl est absente', () => {
      // Cible sans mysteryImageUrl → doit être réinitialisée
      mockAnimeStore.characterEndlessTarget = { id: 'bad', mysteryImageUrl: '', mysteryCharacterName: 'X' };
      renderHook(() => useCharacterEndlessPageViewModel());
      expect(mockSetCharacterEndlessTarget).toHaveBeenCalledWith(null);
      expect(mockClearCharacterEndlessGuessList).toHaveBeenCalled();
    });

    it("récupère les règles de hint depuis l'API au montage", async () => {
      renderHook(() => useCharacterEndlessPageViewModel());
      // hintConfig reste null tant qu'il n'y a pas de target
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/hint-config'));
      });
    });
  });

  // ── hintConfig ────────────────────────────────────────────────────────────

  describe('hintConfig', () => {
    it('est null si rulesConfig est disponible mais pas de target', async () => {
      mockAnimeStore.characterEndlessTarget = null;
      const { result } = renderHook(() => useCharacterEndlessPageViewModel());
      // Même après récupération des rules, sans target → null
      await waitFor(() => expect(fetch).toHaveBeenCalled());
      expect(result.current.hintConfig).toBeNull();
    });

    it('est rempli quand rulesConfig et target sont disponibles', async () => {
      const target = makeTarget();
      mockAnimeStore.characterEndlessTarget = target;

      const { result } = renderHook(() => useCharacterEndlessPageViewModel());

      await waitFor(() => {
        expect(result.current.hintConfig).not.toBeNull();
        expect(result.current.hintConfig?.mysteryImageUrl).toBe(target.mysteryImageUrl);
        expect(result.current.hintConfig?.mysteryCharacterName).toBe(target.mysteryCharacterName);
      });
    });
  });

  // ── foundAnime (computed depuis guessList) ────────────────────────────────

  describe('foundAnime', () => {
    it('est null si aucun guess correct dans guessList', () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto')];
      const guesses = [makeCharacterGuessResult('1', false)];
      mockGetCharacterEndlessGuessList.mockReturnValue(guesses);
      const target = makeTarget();
      mockAnimeStore.characterEndlessTarget = target;

      const { result } = renderHook(() => useCharacterEndlessPageViewModel());
      expect(result.current.foundAnime).toBeNull();
    });

    it("retourne l'anime correspondant après un guess correct", async () => {
      const anime = makeAnime('1', 'Naruto');
      mockAnimeStore.animeList = [anime];
      const target = makeTarget();
      mockAnimeStore.characterEndlessTarget = target;
      const guessResult = makeCharacterGuessResult('1', true);
      mockFetch({ guessResult, hintConfigOk: true });
      // Le mock de addCharacterEndlessGuessToListAsFirst ne modifie pas le store,
      // on configure getCharacterEndlessGuessList pour renvoyer le résultat après l'appel
      mockGetCharacterEndlessGuessList.mockReturnValue([guessResult]);

      const { result } = renderHook(() => useCharacterEndlessPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(result.current.foundAnime).toEqual(anime);
    });
  });

  // ── filtrage fuzzy ────────────────────────────────────────────────────────

  describe('filtrage fuzzy', () => {
    it('retourne des résultats pour une requête correspondante', async () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto'), makeAnime('2', 'Bleach')];
      const { result } = renderHook(() => useCharacterEndlessPageViewModel());

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
      const target = makeTarget();
      mockAnimeStore.characterEndlessTarget = target;
      const existing = [makeCharacterGuessResult('1', false)];
      mockGetCharacterEndlessGuessList.mockReturnValue(existing);

      const { result } = renderHook(() => useCharacterEndlessPageViewModel());

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
    it("ne fait rien si aucune cible n'est définie", async () => {
      mockAnimeStore.characterEndlessTarget = null;
      const { result } = renderHook(() => useCharacterEndlessPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      const guessCalls = vi.mocked(fetch).mock.calls.filter((c) => String(c[0]).includes('/guess/'));
      expect(guessCalls).toHaveLength(0);
    });

    it('appelle /api/animes/characters/endless/guess/:id en POST', async () => {
      const target = makeTarget('ref-1');
      mockAnimeStore.characterEndlessTarget = target;
      const guessResult = makeCharacterGuessResult('1', false);
      mockFetch({ guessResult });

      const { result } = renderHook(() => useCharacterEndlessPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/animes/characters/endless/guess/1'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('passe refAnimeId dans les query params', async () => {
      const target = makeTarget('ref-42');
      mockAnimeStore.characterEndlessTarget = target;
      const guessResult = makeCharacterGuessResult('1', false);
      mockFetch({ guessResult });

      const { result } = renderHook(() => useCharacterEndlessPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('refAnimeId=ref-42'), expect.anything());
    });

    it('ajoute le résultat au store via addCharacterEndlessGuessToListAsFirst', async () => {
      const target = makeTarget();
      mockAnimeStore.characterEndlessTarget = target;
      const guessResult = makeCharacterGuessResult('1', false);
      mockFetch({ guessResult });

      const { result } = renderHook(() => useCharacterEndlessPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(mockAddCharacterEndlessGuessToListAsFirst).toHaveBeenCalledWith(guessResult);
    });

    it('ignore silencieusement si fetch retourne une erreur HTTP', async () => {
      const target = makeTarget();
      mockAnimeStore.characterEndlessTarget = target;
      mockFetch({ guessResult: undefined });

      const { result } = renderHook(() => useCharacterEndlessPageViewModel());

      await act(async () => {
        await result.current.onAnimeSelect('1');
      });

      expect(mockAddCharacterEndlessGuessToListAsFirst).not.toHaveBeenCalled();
    });
  });

  // ── startNewGame ──────────────────────────────────────────────────────────

  describe('startNewGame', () => {
    it('appelle setCharacterEndlessTarget(null)', () => {
      const { result } = renderHook(() => useCharacterEndlessPageViewModel());

      act(() => {
        result.current.startNewGame();
      });

      expect(mockSetCharacterEndlessTarget).toHaveBeenCalledWith(null);
    });

    it('appelle clearCharacterEndlessGuessList', () => {
      const { result } = renderHook(() => useCharacterEndlessPageViewModel());
      // clearAllMocks ne réinitialise pas les comptes entre les appels intermédiaires
      vi.clearAllMocks();

      act(() => {
        result.current.startNewGame();
      });

      expect(mockClearCharacterEndlessGuessList).toHaveBeenCalled();
    });

    it('remet guessList à []', async () => {
      const target = makeTarget();
      mockAnimeStore.characterEndlessTarget = target;
      const existing = [makeCharacterGuessResult('1', false)];
      mockGetCharacterEndlessGuessList.mockReturnValue(existing);

      const { result } = renderHook(() => useCharacterEndlessPageViewModel());

      await act(async () => {
        result.current.startNewGame();
      });

      expect(result.current.guessList).toEqual([]);
    });

    it('fetche une nouvelle cible après réinitialisation', async () => {
      const newTarget = makeTarget('new-target');
      mockFetch({ endlessTarget: newTarget });

      const { result } = renderHook(() => useCharacterEndlessPageViewModel());

      await act(async () => {
        result.current.startNewGame();
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/characters/endless'));
      });
    });
  });
});
