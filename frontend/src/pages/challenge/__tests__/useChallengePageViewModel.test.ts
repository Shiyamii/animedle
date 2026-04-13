/** biome-ignore-all lint/suspicious/useAwait: Test FILE */
/** biome-ignore-all lint/nursery/noShadow: Test FILE */
/** biome-ignore-all lint/style/useNamingConvention: Test FILE */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimeItemDTO, GuessResultDTO } from '@/stores/animeStore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockLoadAnimeList, mockAnimeStore } = vi.hoisted(() => {
  const mockLoadAnimeList = vi.fn();
  const mockAnimeStore = {
    animeList: [] as AnimeItemDTO[],
    loadAnimeList: mockLoadAnimeList,
  };
  return { mockLoadAnimeList, mockAnimeStore };
});

vi.mock('@/stores/animeStore', () => ({
  useAnimeStore: vi.fn().mockImplementation(() => mockAnimeStore),
}));

const { mockChallengeStore } = vi.hoisted(() => {
  const mockChallengeStore = {
    hostRoomId: null as string | null,
    setHostRoomId: vi.fn(),
    clearHostRoomId: vi.fn(),
  };
  return { mockChallengeStore };
});

vi.mock('@/stores/challengeStore', () => ({
  useChallengeStore: vi
    .fn()
    .mockImplementation((selector: (s: typeof mockChallengeStore) => unknown) => selector(mockChallengeStore)),
}));

const { mockUserStore } = vi.hoisted(() => {
  const mockUserStore = {
    user: null as { id: string; name: string } | null,
  };
  return { mockUserStore };
});

vi.mock('@/stores/userStore', () => ({
  useUserStore: vi.fn().mockImplementation((selector: (s: typeof mockUserStore) => unknown) => selector(mockUserStore)),
}));

// Mock WebSocket globally
class MockWebSocket {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
}

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
      title: 'Test',
      alias: [],
      imageUrl: '',
      demographic_type: '',
      episodes: 12,
      season_start: '',
      studio: '',
      source: '',
      score: 0,
      genres: [],
      anime_format: '',
    },
  };
}

function mockLocation(search = '', pathname = '/challenge', origin = 'http://localhost') {
  vi.stubGlobal('location', { search, pathname, origin, href: `${origin}${pathname}${search}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useChallengePageViewModel } from '../useChallengePageViewModel';

describe('useChallengePageViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnimeStore.animeList = [];
    mockUserStore.user = null;
    mockChallengeStore.hostRoomId = null;
    mockChallengeStore.setHostRoomId = vi.fn();
    mockChallengeStore.clearHostRoomId = vi.fn();
    mockLoadAnimeList.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    vi.stubGlobal('WebSocket', MockWebSocket);
    mockLocation();
  });

  // ── état initial ──────────────────────────────────────────────────────────

  describe('état initial', () => {
    it('user est null par défaut', () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.user).toBeNull();
    });

    it("joinedRoom est null quand pas de gameid dans l'URL", () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.joinedRoom).toBeNull();
    });

    it("joinedRoom est initialisé depuis l'URL si gameid est présent", () => {
      mockLocation('?gameid=abc123');
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.joinedRoom).toBe('abc123');
    });

    it('gameStarted est false', () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.gameStarted).toBe(false);
    });

    it('gameOutcome est null', () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.gameOutcome).toBeNull();
    });

    it('players est vide', () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.players).toEqual([]);
    });

    it('remaining est null', () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.remaining).toBeNull();
    });

    it('inputValue est vide', () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.inputValue).toBe('');
    });

    it('animeLimit vaut 5 par défaut', () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.animeLimit).toBe(5);
    });

    it('guessesByRound est vide par défaut', () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.guessesByRound).toEqual({});
    });

    it('currentRoundIndex est 0 par défaut', () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.currentRoundIndex).toBe(0);
    });

    it("charge la liste d'animes si elle est vide au montage", () => {
      mockAnimeStore.animeList = [];
      renderHook(() => useChallengePageViewModel());
      expect(mockLoadAnimeList).toHaveBeenCalled();
    });

    it('ne recharge pas la liste si elle est déjà remplie', () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto')];
      renderHook(() => useChallengePageViewModel());
      expect(mockLoadAnimeList).not.toHaveBeenCalled();
    });
  });

  // ── isHost ────────────────────────────────────────────────────────────────

  describe('isHost', () => {
    it('est true quand hostRoomId correspond à joinedRoom', () => {
      mockLocation('?gameid=myroom');
      mockChallengeStore.hostRoomId = 'myroom';
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.isHost).toBe(true);
    });

    it('est false quand hostRoomId ne correspond pas à joinedRoom', () => {
      mockLocation('?gameid=otherroom');
      mockChallengeStore.hostRoomId = 'myroom';
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.isHost).toBe(false);
    });

    it('est false quand hostRoomId est null mais joinedRoom est défini', () => {
      mockLocation('?gameid=someroom');
      mockChallengeStore.hostRoomId = null;
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.isHost).toBe(false);
    });
  });

  // ── filtrage fuzzy ────────────────────────────────────────────────────────

  describe('filteredAnimeList', () => {
    it('retourne une liste vide pour une requête vide', () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto'), makeAnime('2', 'Bleach')];
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.filteredAnimeList).toEqual([]);
    });

    it('retourne des résultats pour une requête correspondante', async () => {
      mockAnimeStore.animeList = [makeAnime('1', 'Naruto'), makeAnime('2', 'Bleach')];
      const { result } = renderHook(() => useChallengePageViewModel());

      act(() => {
        result.current.setInputValue('Naruto');
      });

      await waitFor(() => {
        expect(result.current.filteredAnimeList.length).toBeGreaterThan(0);
        expect(result.current.filteredAnimeList[0].title).toBe('Naruto');
      });
    });

    it('isFilteringLoading est false', () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.isFilteringLoading).toBe(false);
    });
  });

  // ── correctGuessesHistory ─────────────────────────────────────────────────

  describe('correctGuessesHistory', () => {
    it("est vide quand aucun guess n'a été fait", () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.correctGuessesHistory).toEqual([]);
    });
  });

  // ── opponent live data ────────────────────────────────────────────────────

  describe('opponent live data', () => {
    it('currentRoundOpponentAttempts est vide par défaut', () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.currentRoundOpponentAttempts).toEqual([]);
    });

    it('currentRoundOpponentFound est vide par défaut', () => {
      const { result } = renderHook(() => useChallengePageViewModel());
      expect(result.current.currentRoundOpponentFound).toEqual([]);
    });
  });

  // ── handleCreate ──────────────────────────────────────────────────────────

  describe('handleCreate', () => {
    it('appelle setHostRoomId avec un id généré', () => {
      const { result } = renderHook(() => useChallengePageViewModel());

      act(() => {
        result.current.handleCreate();
      });

      expect(mockChallengeStore.setHostRoomId).toHaveBeenCalledWith(expect.any(String));
    });

    it('génère un roomId aléatoire de 6 caractères', () => {
      const { result } = renderHook(() => useChallengePageViewModel());

      act(() => {
        result.current.handleCreate();
      });

      const calledWith = vi.mocked(mockChallengeStore.setHostRoomId).mock.calls[0][0] as string;
      expect(calledWith).toHaveLength(6);
    });

    it('met à jour joinedRoom avec le nouvel id', async () => {
      const { result } = renderHook(() => useChallengePageViewModel());

      act(() => {
        result.current.handleCreate();
      });

      const calledWith = vi.mocked(mockChallengeStore.setHostRoomId).mock.calls[0][0] as string;
      await waitFor(() => {
        expect(result.current.joinedRoom).toBe(calledWith);
      });
    });
  });

  // ── handleJoin ────────────────────────────────────────────────────────────

  describe('handleJoin', () => {
    it('ne fait rien si roomId est vide', () => {
      const { result } = renderHook(() => useChallengePageViewModel());

      act(() => {
        result.current.handleJoin();
      });

      expect(mockChallengeStore.clearHostRoomId).not.toHaveBeenCalled();
    });

    it('appelle clearHostRoomId quand un roomId valide est saisi', async () => {
      const { result } = renderHook(() => useChallengePageViewModel());

      act(() => {
        result.current.setRoomId('testroom');
      });

      act(() => {
        result.current.handleJoin();
      });

      expect(mockChallengeStore.clearHostRoomId).toHaveBeenCalled();
    });

    it('met à jour joinedRoom avec le roomId saisi', async () => {
      const { result } = renderHook(() => useChallengePageViewModel());

      act(() => {
        result.current.setRoomId('testroom');
      });

      act(() => {
        result.current.handleJoin();
      });

      await waitFor(() => {
        expect(result.current.joinedRoom).toBe('testroom');
      });
    });

    it('ignore les espaces en début et fin de roomId', async () => {
      const { result } = renderHook(() => useChallengePageViewModel());

      act(() => {
        result.current.setRoomId('  myroom  ');
      });

      act(() => {
        result.current.handleJoin();
      });

      await waitFor(() => {
        expect(result.current.joinedRoom).toBe('myroom');
      });
    });
  });

  // ── handleCopyInvite ──────────────────────────────────────────────────────

  describe('handleCopyInvite', () => {
    it("ne fait rien si aucune room n'est jointe", () => {
      const writeTextMock = vi.fn();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      const { result } = renderHook(() => useChallengePageViewModel());

      act(() => {
        result.current.handleCopyInvite();
      });

      expect(writeTextMock).not.toHaveBeenCalled();
    });

    it("copie l'URL avec le gameid dans le presse-papier", async () => {
      const writeTextMock = vi.fn();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      mockLocation('?gameid=room42');

      const { result } = renderHook(() => useChallengePageViewModel());

      await act(async () => {
        result.current.handleCopyInvite();
      });

      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('room42'));
    });
  });

  // ── handleGuess ───────────────────────────────────────────────────────────

  describe('handleGuess', () => {
    it("ne fait pas de requête /guess si la room n'est pas jointe", async () => {
      mockUserStore.user = { id: 'u1', name: 'Alice' };
      // Pas de gameid dans l'URL → joinedRoom = null
      const { result } = renderHook(() => useChallengePageViewModel());

      await act(async () => {
        await result.current.handleGuess('anime-1');
      });

      const guessCalls = vi.mocked(fetch).mock.calls.filter((c) => String(c[0]).includes('/guess'));
      expect(guessCalls).toHaveLength(0);
    });

    it("ne fait pas de requête /guess si l'utilisateur est absent", async () => {
      mockUserStore.user = null;
      mockLocation('?gameid=room1');

      const { result } = renderHook(() => useChallengePageViewModel());

      await act(async () => {
        await result.current.handleGuess('anime-1');
      });

      const guessCalls = vi.mocked(fetch).mock.calls.filter((c) => String(c[0]).includes('/guess'));
      expect(guessCalls).toHaveLength(0);
    });

    it('envoie la requête POST à /api/room/:roomId/guess', async () => {
      mockUserStore.user = { id: 'u1', name: 'Alice' };
      mockLocation('?gameid=room1');

      const guessResult = makeGuessResult('anime-1', false);
      vi.mocked(fetch).mockImplementation((url) => {
        if (String(url).includes('/guess')) {
          return Promise.resolve({ ok: true, json: async () => guessResult } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ guessesByRound: {}, currentRoundIndex: 0, remaining: 5, animes: [], started: false }),
        } as Response);
      });

      const { result } = renderHook(() => useChallengePageViewModel());

      await act(async () => {
        await result.current.handleGuess('anime-1');
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/room/room1/guess'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('vide inputValue après un guess réussi', async () => {
      mockUserStore.user = { id: 'u1', name: 'Alice' };
      mockLocation('?gameid=room1');

      const guessResult = makeGuessResult('anime-1', false);
      vi.mocked(fetch).mockImplementation((url) => {
        if (String(url).includes('/guess')) {
          return Promise.resolve({ ok: true, json: async () => guessResult } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ guessesByRound: {}, currentRoundIndex: 0, remaining: 5, animes: [], started: false }),
        } as Response);
      });

      const { result } = renderHook(() => useChallengePageViewModel());

      act(() => {
        result.current.setInputValue('Naruto');
      });

      await act(async () => {
        await result.current.handleGuess('anime-1');
      });

      expect(result.current.inputValue).toBe('');
    });

    it('ignore silencieusement si fetch retourne une erreur HTTP', async () => {
      mockUserStore.user = { id: 'u1', name: 'Alice' };
      mockLocation('?gameid=room1');

      vi.mocked(fetch).mockImplementation((url) => {
        if (String(url).includes('/guess')) {
          return Promise.resolve({ ok: false, status: 500 } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ animes: [], started: false }),
        } as Response);
      });

      const { result } = renderHook(() => useChallengePageViewModel());

      await act(async () => {
        await result.current.handleGuess('anime-1');
      });

      expect(result.current.gameOutcome).toBeNull();
    });

    it('ignore silencieusement si fetch lève une exception réseau', async () => {
      mockUserStore.user = { id: 'u1', name: 'Alice' };
      mockLocation('?gameid=room1');

      vi.mocked(fetch).mockImplementation((url) => {
        if (String(url).includes('/guess')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ animes: [], started: false }),
        } as Response);
      });

      const { result } = renderHook(() => useChallengePageViewModel());

      await act(async () => {
        await result.current.handleGuess('anime-1');
      });

      expect(result.current.gameOutcome).toBeNull();
    });
  });

  // ── handleStartGame ───────────────────────────────────────────────────────

  describe('handleStartGame', () => {
    it('ne fait rien si hasJoinedRoom est false', () => {
      const { result } = renderHook(() => useChallengePageViewModel());

      act(() => {
        result.current.handleStartGame();
      });

      expect(result.current.gameStarted).toBe(false);
    });
  });
});
