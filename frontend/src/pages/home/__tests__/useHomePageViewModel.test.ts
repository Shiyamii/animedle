import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { AnimeItemDTO, GuessResultDTO } from '@/stores/animeStore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockLoadAnimeList, mockAddGuessToListAsFirst, mockGetGuessList, mockAnimeStore } = vi.hoisted(() => {
    const mockLoadAnimeList = vi.fn();
    const mockAddGuessToListAsFirst = vi.fn();
    const mockGetGuessList = vi.fn().mockReturnValue([]);

    const mockAnimeStore = {
        animeList: [] as AnimeItemDTO[],
        guessList: [] as GuessResultDTO[],
        foundAnime: null as AnimeItemDTO | null,
        currentAnimeDate: null as string | null,
        loadAnimeList: mockLoadAnimeList,
        getGuessList: mockGetGuessList,
        addGuessToListAsFirst: mockAddGuessToListAsFirst,
        resetGame: vi.fn(),
        initGuessListIfNeeded: vi.fn(),
        setFoundAnime: vi.fn(),
        setCurrentAnimeDate: vi.fn(),
    };

    return { mockLoadAnimeList, mockAddGuessToListAsFirst, mockGetGuessList, mockAnimeStore };
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
            id: animeId, title: 'Test', alias: [], imageUrl: '',
            demographic_type: '', episodes: 12, season_start: '', studio: '',
            source: '', score: 0, genres: [], anime_format: '',
        },
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useHomePageViewModel } from '../useHomePageViewModel';

describe('useHomePageViewModel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAnimeStore.animeList = [];
        mockAnimeStore.guessList = [];
        mockAnimeStore.foundAnime = null;
        mockAnimeStore.currentAnimeDate = null;
        mockGetGuessList.mockReturnValue([]);
        mockLoadAnimeList.mockResolvedValue(undefined);
        vi.stubGlobal('fetch', vi.fn());
    });

    // ── état initial ──────────────────────────────────────────────────────────

    describe('état initial', () => {
        it('isGuessingStarted est false', () => {
            const { result } = renderHook(() => useHomePageViewModel());
            expect(result.current.isGuessingStarted).toBe(false);
        });

        it('inputValue est vide', () => {
            const { result } = renderHook(() => useHomePageViewModel());
            expect(result.current.inputValue).toBe('');
        });

        it('foundAnime est null', () => {
            const { result } = renderHook(() => useHomePageViewModel());
            expect(result.current.foundAnime).toBeNull();
        });

        it('charge la liste si elle est vide au montage', () => {
            mockAnimeStore.animeList = [];
            renderHook(() => useHomePageViewModel());
            expect(mockLoadAnimeList).toHaveBeenCalled();
        });

        it('ne recharge pas si la liste est déjà remplie', () => {
            mockAnimeStore.animeList = [makeAnime('1', 'Naruto')];
            renderHook(() => useHomePageViewModel());
            expect(mockLoadAnimeList).not.toHaveBeenCalled();
        });

        it('récupère la guessList depuis le store au montage', async () => {
            const existing = [makeGuessResult('1', false)];
            mockAnimeStore.guessList = existing;
            const { result } = renderHook(() => useHomePageViewModel());
            await waitFor(() => expect(result.current.guessList).toEqual(existing));
        });
    });

    // ── filtrage fuzzy ────────────────────────────────────────────────────────

    describe('filtrage fuzzy', () => {
        it('retourne une liste vide pour une requête vide', () => {
            mockAnimeStore.animeList = [makeAnime('1', 'Naruto'), makeAnime('2', 'Bleach')];
            const { result } = renderHook(() => useHomePageViewModel());
            expect(result.current.filtredAnimeList).toEqual([]);
        });

        it('retourne des résultats pour une requête correspondante', async () => {
            mockAnimeStore.animeList = [makeAnime('1', 'Naruto'), makeAnime('2', 'Bleach')];
            const { result } = renderHook(() => useHomePageViewModel());

            act(() => { result.current.setInputValue('Naruto'); });

            await waitFor(() => {
                expect(result.current.filtredAnimeList.length).toBeGreaterThan(0);
                expect(result.current.filtredAnimeList[0].title).toBe('Naruto');
            });
        });

        it('exclut les animes déjà devinés de la liste filtrée', async () => {
            mockAnimeStore.animeList = [makeAnime('1', 'Naruto'), makeAnime('2', 'Bleach')];
            mockAnimeStore.guessList = [makeGuessResult('1', false)];

            const { result } = renderHook(() => useHomePageViewModel());
            act(() => { result.current.setInputValue('Naruto'); });

            await waitFor(() => {
                const ids = result.current.filtredAnimeList.map(a => a.id);
                expect(ids).not.toContain('1');
            });
        });
    });

    // ── onAnimeSelect ─────────────────────────────────────────────────────────

    describe('onAnimeSelect', () => {
        it('appelle /api/animes/guess/:id en POST', async () => {
            const guessResult = makeGuessResult('1', false);
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => guessResult,
            } as Response);

            const { result } = renderHook(() => useHomePageViewModel());

            await act(async () => { await result.current.onAnimeSelect('1'); });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/animes/guess/1?guessNumber=1',
                expect.objectContaining({ method: 'POST' })
            );
        });

        it('ajoute le résultat au store et met à jour guessList', async () => {
            const guessResult = makeGuessResult('1', false);
            vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => guessResult } as Response);
            mockGetGuessList.mockReturnValueOnce([]).mockReturnValue([guessResult]);

            const { result } = renderHook(() => useHomePageViewModel());

            await act(async () => { await result.current.onAnimeSelect('1'); });

            expect(mockAddGuessToListAsFirst).toHaveBeenCalledWith(guessResult);
        });

        it('définit foundAnime quand tous les résultats sont corrects', async () => {
            const guessResult = makeGuessResult('1', true);
            vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => guessResult } as Response);

            const { result } = renderHook(() => useHomePageViewModel());

            await act(async () => { await result.current.onAnimeSelect('1'); });

            expect(result.current.foundAnime).toEqual(guessResult.anime);
        });

        it('ne définit pas foundAnime si au moins un résultat est incorrect', async () => {
            const guessResult = makeGuessResult('1', false);
            vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => guessResult } as Response);

            const { result } = renderHook(() => useHomePageViewModel());

            await act(async () => { await result.current.onAnimeSelect('1'); });

            expect(result.current.foundAnime).toBeNull();
        });

        it('ignore silencieusement si fetch retourne une erreur HTTP', async () => {
            vi.mocked(fetch).mockResolvedValue({ ok: false, statusText: 'Not Found' } as Response);

            const { result } = renderHook(() => useHomePageViewModel());

            await act(async () => { await result.current.onAnimeSelect('999'); });

            expect(mockAddGuessToListAsFirst).not.toHaveBeenCalled();
            expect(result.current.foundAnime).toBeNull();
        });

        it('ignore silencieusement si fetch lève une exception réseau', async () => {
            vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useHomePageViewModel());

            await act(async () => { await result.current.onAnimeSelect('1'); });

            expect(result.current.foundAnime).toBeNull();
        });
    });
});
