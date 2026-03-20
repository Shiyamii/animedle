import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockNavigate, mockSignIn, mockSignUp } = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockSignIn: vi.fn(),
    mockSignUp: vi.fn(),
}));

vi.mock('react-router', () => ({ useNavigate: () => mockNavigate }));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/lib/auth-client', () => ({
    authClient: {
        signIn: { email: mockSignIn },
        signUp: { email: mockSignUp },
    },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useAuthViewModel } from '../useAuthViewModel';

describe('useAuthViewModel', () => {
    beforeEach(() => vi.clearAllMocks());

    // ── état initial ──────────────────────────────────────────────────────────

    describe('état initial', () => {
        it('démarre en mode "login"', () => {
            const { result } = renderHook(() => useAuthViewModel());
            expect(result.current.mode).toBe('login');
        });

        it('tous les champs sont vides et error/loading à leur valeur par défaut', () => {
            const { result } = renderHook(() => useAuthViewModel());
            expect(result.current.email).toBe('');
            expect(result.current.password).toBe('');
            expect(result.current.name).toBe('');
            expect(result.current.error).toBeNull();
            expect(result.current.loading).toBe(false);
        });
    });

    // ── toggleMode ────────────────────────────────────────────────────────────

    describe('toggleMode', () => {
        it('passe de "login" à "register"', () => {
            const { result } = renderHook(() => useAuthViewModel());
            act(() => result.current.toggleMode());
            expect(result.current.mode).toBe('register');
        });

        it('passe de "register" à "login"', () => {
            const { result } = renderHook(() => useAuthViewModel());
            act(() => result.current.toggleMode());
            act(() => result.current.toggleMode());
            expect(result.current.mode).toBe('login');
        });

        it('efface l\'erreur au changement de mode', async () => {
            mockSignIn.mockResolvedValue({ error: { message: 'Identifiants incorrects' } });
            const { result } = renderHook(() => useAuthViewModel());

            await act(async () => {
                await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
            });
            expect(result.current.error).toBe('Identifiants incorrects');

            act(() => result.current.toggleMode());
            expect(result.current.error).toBeNull();
        });
    });

    // ── handleSubmit — login ──────────────────────────────────────────────────

    describe('handleSubmit — mode login', () => {
        it('appelle signIn.email avec email et password', async () => {
            mockSignIn.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAuthViewModel());

            await act(async () => {
                result.current.setEmail('user@example.com');
                result.current.setPassword('secret');
            });
            await act(async () => {
                await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
            });

            expect(mockSignIn).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret' });
        });

        it('navigue vers "/" en cas de succès', async () => {
            mockSignIn.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAuthViewModel());

            await act(async () => {
                await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
            });

            expect(mockNavigate).toHaveBeenCalledWith('/');
        });

        it('affiche le message d\'erreur de l\'API en cas d\'échec', async () => {
            mockSignIn.mockResolvedValue({ error: { message: 'Mot de passe incorrect' } });
            const { result } = renderHook(() => useAuthViewModel());

            await act(async () => {
                await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
            });

            expect(result.current.error).toBe('Mot de passe incorrect');
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('utilise la clé i18n de fallback si le message d\'erreur est absent', async () => {
            mockSignIn.mockResolvedValue({ error: {} });
            const { result } = renderHook(() => useAuthViewModel());

            await act(async () => {
                await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
            });

            expect(result.current.error).toBe('auth.errorLogin');
        });

        it('repasse loading à false après le submit', async () => {
            mockSignIn.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAuthViewModel());

            await act(async () => {
                await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
            });

            expect(result.current.loading).toBe(false);
        });
    });

    // ── handleSubmit — register ───────────────────────────────────────────────

    describe('handleSubmit — mode register', () => {
        it('appelle signUp.email avec email, password et name', async () => {
            mockSignUp.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAuthViewModel());

            await act(async () => {
                result.current.toggleMode();
                result.current.setEmail('new@example.com');
                result.current.setPassword('pass123');
                result.current.setName('Alice');
            });
            await act(async () => {
                await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
            });

            expect(mockSignUp).toHaveBeenCalledWith({
                email: 'new@example.com',
                password: 'pass123',
                name: 'Alice',
            });
        });

        it('navigue vers "/" en cas de succès', async () => {
            mockSignUp.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAuthViewModel());

            await act(async () => { result.current.toggleMode(); });
            await act(async () => {
                await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
            });

            expect(mockNavigate).toHaveBeenCalledWith('/');
        });

        it('affiche l\'erreur en cas d\'échec', async () => {
            mockSignUp.mockResolvedValue({ error: { message: 'Email déjà utilisé' } });
            const { result } = renderHook(() => useAuthViewModel());

            await act(async () => { result.current.toggleMode(); });
            await act(async () => {
                await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
            });

            expect(result.current.error).toBe('Email déjà utilisé');
        });
    });
});
