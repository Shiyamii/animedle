import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { AdminAnimeDTO } from '../useAdminViewModel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAdminAnime(overrides: Partial<AdminAnimeDTO> = {}): AdminAnimeDTO {
    return {
        id: 'anime-1',
        title: 'Test Anime',
        imageUrl: 'https://cdn.myanimelist.net/images/anime/1/1.webp',
        titles: [{ type: 'Default', title: 'Test Anime' }],
        anime_format: 'TV',
        genres: ['Action', 'Adventure'],
        demographic_type: 'Shounen',
        episodes: 24,
        season_start: 'Spring 2023',
        studio: 'MAPPA',
        source: 'Manga',
        score: 8.5,
        enabled: true,
        ...overrides,
    };
}

function mockFetch(responses: Record<string, unknown>) {
    vi.mocked(fetch).mockImplementation((input) => {
        const url = input.toString();
        for (const [key, value] of Object.entries(responses)) {
            if (url.includes(key)) {
                return Promise.resolve({
                    ok: true,
                    json: async () => value,
                } as Response);
            }
        }
        return Promise.resolve({ ok: true, json: async () => null } as Response);
    });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useAdminViewModel } from '../useAdminViewModel';

describe('useAdminViewModel', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        mockFetch({ '/api/admin/animes': [], '/api/admin/animes/current': null });
    });

    // ── chargement initial ────────────────────────────────────────────────────

    describe('chargement initial', () => {
        it('charge les animes et l\'anime courant au montage', async () => {
            const animes = [makeAdminAnime()];
            const current = makeAdminAnime({ id: 'current-1' });
            mockFetch({ '/api/admin/animes/current': current, '/api/admin/animes': animes });

            const { result } = renderHook(() => useAdminViewModel());

            await waitFor(() => {
                expect(result.current.animes).toEqual(animes);
                expect(result.current.currentAnime).toEqual(current);
            });
        });

        it('onglet actif par défaut est "animes"', () => {
            const { result } = renderHook(() => useAdminViewModel());
            expect(result.current.activeTab).toBe('animes');
        });
    });

    // ── openCreateForm ────────────────────────────────────────────────────────

    describe('openCreateForm', () => {
        it('ouvre le formulaire vide', async () => {
            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.openCreateForm());

            expect(result.current.showForm).toBe(true);
            expect(result.current.editingId).toBeNull();
            expect(result.current.form.imageUrl).toBe('');
            expect(result.current.form.titles).toEqual([{ type: 'Default', title: '' }]);
            expect(result.current.error).toBeNull();
        });
    });

    // ── openEditForm ──────────────────────────────────────────────────────────

    describe('openEditForm', () => {
        it('remplit le formulaire avec les données de l\'anime', async () => {
            const anime = makeAdminAnime({ genres: ['Action', 'Drama'], episodes: 12, score: 7.5 });
            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.openEditForm(anime));

            expect(result.current.showForm).toBe(true);
            expect(result.current.editingId).toBe('anime-1');
            expect(result.current.form.genres).toBe('Action, Drama');
            expect(result.current.form.episodes).toBe('12');
            expect(result.current.form.score).toBe('7.5');
            expect(result.current.form.studio).toBe('MAPPA');
        });

        it('fait une copie des titres (pas de référence partagée)', async () => {
            const anime = makeAdminAnime();
            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.openEditForm(anime));

            expect(result.current.form.titles).not.toBe(anime.titles);
        });
    });

    // ── closeForm ─────────────────────────────────────────────────────────────

    describe('closeForm', () => {
        it('ferme et réinitialise le formulaire', async () => {
            const anime = makeAdminAnime();
            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.openEditForm(anime));
            act(() => result.current.closeForm());

            expect(result.current.showForm).toBe(false);
            expect(result.current.editingId).toBeNull();
            expect(result.current.form.studio).toBe('');
        });
    });

    // ── updateFormField ───────────────────────────────────────────────────────

    describe('updateFormField', () => {
        it('met à jour un champ du formulaire', async () => {
            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.openCreateForm());
            act(() => result.current.updateFormField('studio', 'Pierrot'));

            expect(result.current.form.studio).toBe('Pierrot');
        });
    });

    // ── updateTitle / addTitle / removeTitle ──────────────────────────────────

    describe('gestion des titres', () => {
        it('updateTitle modifie le titre à l\'index donné', async () => {
            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.openCreateForm());
            act(() => result.current.updateTitle(0, 'title', 'Naruto'));
            act(() => result.current.updateTitle(0, 'type', 'Default'));

            expect(result.current.form.titles[0]).toEqual({ type: 'Default', title: 'Naruto' });
        });

        it('addTitle ajoute une entrée vide', async () => {
            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.openCreateForm());
            act(() => result.current.addTitle());

            expect(result.current.form.titles).toHaveLength(2);
            expect(result.current.form.titles[1]).toEqual({ type: '', title: '' });
        });

        it('removeTitle supprime le titre à l\'index donné', async () => {
            const anime = makeAdminAnime({
                titles: [
                    { type: 'Default', title: 'Naruto' },
                    { type: 'Japanese', title: 'ナルト' },
                ],
            });
            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.openEditForm(anime));
            act(() => result.current.removeTitle(1));

            expect(result.current.form.titles).toHaveLength(1);
            expect(result.current.form.titles[0].title).toBe('Naruto');
        });
    });

    // ── handleSubmit — création ───────────────────────────────────────────────

    describe('handleSubmit — création', () => {
        it('envoie un POST avec les données parsées', async () => {
            const created = makeAdminAnime();
            vi.mocked(fetch)
                .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)    // loadAnimes
                .mockResolvedValueOnce({ ok: true, json: async () => null } as Response)  // loadCurrent
                .mockResolvedValueOnce({ ok: true, json: async () => created } as Response) // POST
                .mockResolvedValueOnce({ ok: true, json: async () => [created] } as Response); // reload

            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => {
                result.current.openCreateForm();
                result.current.updateFormField('imageUrl', 'https://cdn.myanimelist.net/images/anime/1/1.webp');
                result.current.updateFormField('genres', 'Action, Drama');
                result.current.updateFormField('episodes', '24');
                result.current.updateFormField('score', '8.5');
                result.current.updateTitle(0, 'type', 'Default');
                result.current.updateTitle(0, 'title', 'Naruto');
            });

            await act(async () => { await result.current.handleSubmit(); });

            const call = vi.mocked(fetch).mock.calls.find(c => {
                const [, init] = c;
                return (init as RequestInit)?.method === 'POST' && c[0].toString().includes('/api/admin/animes');
            });
            expect(call).toBeDefined();

            const body = JSON.parse((call![1] as RequestInit).body as string);
            expect(body.genres).toEqual(['Action', 'Drama']);
            expect(body.episodes).toBe(24);
            expect(body.score).toBe(8.5);
        });

        it('ferme le formulaire après un POST réussi', async () => {
            const created = makeAdminAnime();
            vi.mocked(fetch)
                .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => null } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => created } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => [created] } as Response);

            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.openCreateForm());
            await act(async () => { await result.current.handleSubmit(); });

            expect(result.current.showForm).toBe(false);
        });

        it('affiche l\'erreur si la réponse n\'est pas ok', async () => {
            vi.mocked(fetch)
                .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => null } as Response)
                .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'URL MAL invalide' }) } as Response);

            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.openCreateForm());
            await act(async () => { await result.current.handleSubmit(); });

            expect(result.current.error).toBe('URL MAL invalide');
            expect(result.current.showForm).toBe(true);
        });
    });

    // ── handleSubmit — modification ───────────────────────────────────────────

    describe('handleSubmit — modification', () => {
        it('envoie un PUT quand editingId est défini', async () => {
            const anime = makeAdminAnime();
            vi.mocked(fetch)
                .mockResolvedValueOnce({ ok: true, json: async () => [anime] } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => anime } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => anime } as Response) // PUT
                .mockResolvedValueOnce({ ok: true, json: async () => [anime] } as Response);

            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.openEditForm(anime));
            await act(async () => { await result.current.handleSubmit(); });

            const putCall = vi.mocked(fetch).mock.calls.find(c =>
                (c[1] as RequestInit)?.method === 'PUT'
            );
            expect(putCall).toBeDefined();
            expect(putCall![0].toString()).toContain('/api/admin/animes/anime-1');
        });
    });

    // ── confirmDelete / cancelDelete / handleDelete ───────────────────────────

    describe('confirmDelete / cancelDelete / handleDelete', () => {
        it('confirmDelete définit deleteConfirmId', async () => {
            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.confirmDelete('anime-1'));
            expect(result.current.deleteConfirmId).toBe('anime-1');
        });

        it('cancelDelete efface deleteConfirmId', async () => {
            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.confirmDelete('anime-1'));
            act(() => result.current.cancelDelete());
            expect(result.current.deleteConfirmId).toBeNull();
        });

        it('handleDelete envoie DELETE et recharge la liste', async () => {
            vi.mocked(fetch)
                .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => null } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);

            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.confirmDelete('anime-1'));
            await act(async () => { await result.current.handleDelete(); });

            const deleteCall = vi.mocked(fetch).mock.calls.find(c =>
                (c[1] as RequestInit)?.method === 'DELETE'
            );
            expect(deleteCall).toBeDefined();
            expect(result.current.deleteConfirmId).toBeNull();
        });
    });

    // ── handleSetRandom ───────────────────────────────────────────────────────

    describe('handleSetRandom', () => {
        it('envoie POST /current/random et met à jour currentAnime', async () => {
            const newCurrent = makeAdminAnime({ id: 'new-current' });
            vi.mocked(fetch)
                .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => null } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => newCurrent } as Response);

            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            await act(async () => { await result.current.handleSetRandom(); });

            expect(result.current.currentAnime).toEqual(newCurrent);

            const call = vi.mocked(fetch).mock.calls.find(c =>
                c[0].toString().includes('/current/random')
            );
            expect(call).toBeDefined();
            expect((call![1] as RequestInit).method).toBe('POST');
        });
    });

    // ── handleSetSpecific ─────────────────────────────────────────────────────

    describe('handleSetSpecific', () => {
        it('n\'envoie rien si selectedAnimeId est vide', async () => {
            vi.mocked(fetch)
                .mockResolvedValue({ ok: true, json: async () => null } as Response);

            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            const callsBefore = vi.mocked(fetch).mock.calls.length;
            await act(async () => { await result.current.handleSetSpecific(); });

            expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore);
        });

        it('envoie POST /current/:id et met à jour currentAnime et vide selectedAnimeId', async () => {
            const newCurrent = makeAdminAnime({ id: 'anime-42' });
            vi.mocked(fetch)
                .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => null } as Response)
                .mockResolvedValueOnce({ ok: true, json: async () => newCurrent } as Response);

            const { result } = renderHook(() => useAdminViewModel());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            act(() => result.current.setSelectedAnimeId('anime-42'));
            await act(async () => { await result.current.handleSetSpecific(); });

            expect(result.current.currentAnime).toEqual(newCurrent);
            expect(result.current.selectedAnimeId).toBe('');

            const call = vi.mocked(fetch).mock.calls.find(c =>
                c[0].toString().includes('/current/anime-42')
            );
            expect(call).toBeDefined();
        });
    });
});
