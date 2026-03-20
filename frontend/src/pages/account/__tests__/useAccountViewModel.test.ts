import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
    mockNavigate,
    mockSetUser,
    mockClearUser,
    mockUpdateUser,
    mockChangePassword,
    mockSignOut,
    mockUseSession,
} = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockSetUser: vi.fn(),
    mockClearUser: vi.fn(),
    mockUpdateUser: vi.fn(),
    mockChangePassword: vi.fn(),
    mockSignOut: vi.fn(),
    mockUseSession: vi.fn(),
}));

vi.mock('react-router', () => ({ useNavigate: () => mockNavigate }));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/stores/userStore', () => ({
    useUserStore: vi.fn().mockImplementation((selector: (s: object) => unknown) =>
        selector({ setUser: mockSetUser, clearUser: mockClearUser, user: null })
    ),
}));

vi.mock('@/lib/avatar', () => ({
    generateSeed: vi.fn().mockReturnValue('random-seed'),
    getAvatarUrl: vi.fn().mockReturnValue('https://example.com/avatar.png'),
}));

vi.mock('@/lib/auth-client', () => ({
    authClient: {
        useSession: mockUseSession,
        updateUser: mockUpdateUser,
        changePassword: mockChangePassword,
        signOut: mockSignOut,
    },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useAccountViewModel } from '../useAccountViewModel';

const mockUser = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    avatarSeed: 'seed-abc',
};

describe('useAccountViewModel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseSession.mockReturnValue({ data: { user: mockUser }, isPending: false });
    });

    // ── état initial ──────────────────────────────────────────────────────────

    describe('état initial', () => {
        it('est en attente quand isPending=true', () => {
            mockUseSession.mockReturnValue({ data: null, isPending: true });
            const { result } = renderHook(() => useAccountViewModel());
            expect(result.current.isPending).toBe(true);
        });

        it('expose l\'utilisateur depuis la session', () => {
            const { result } = renderHook(() => useAccountViewModel());
            expect(result.current.user).toEqual(mockUser);
        });

        it('initialise name et avatarSeed depuis la session', () => {
            const { result } = renderHook(() => useAccountViewModel());
            expect(result.current.name).toBe('Alice');
            expect(result.current.avatarSeed).toBe('seed-abc');
        });
    });

    // ── updateProfile ─────────────────────────────────────────────────────────

    describe('updateProfile', () => {
        it('appelle authClient.updateUser avec name et avatarSeed', async () => {
            mockUpdateUser.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => { result.current.setName('Bob'); });
            await act(async () => { await result.current.updateProfile(); });

            expect(mockUpdateUser).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Bob' })
            );
        });

        it('passe profileSuccess à true en cas de succès', async () => {
            mockUpdateUser.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => { await result.current.updateProfile(); });

            expect(result.current.profileSuccess).toBe(true);
            expect(result.current.profileError).toBeNull();
        });

        it('met à jour le store utilisateur en cas de succès', async () => {
            mockUpdateUser.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => { await result.current.updateProfile(); });

            expect(mockSetUser).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'user-1', email: 'alice@example.com' })
            );
        });

        it('affiche l\'erreur de l\'API en cas d\'échec', async () => {
            mockUpdateUser.mockResolvedValue({ error: { message: 'Nom invalide' } });
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => { await result.current.updateProfile(); });

            expect(result.current.profileError).toBe('Nom invalide');
            expect(result.current.profileSuccess).toBe(false);
        });

        it('utilise la clé i18n de fallback si le message est absent', async () => {
            mockUpdateUser.mockResolvedValue({ error: {} });
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => { await result.current.updateProfile(); });

            expect(result.current.profileError).toBe('account.profile.errorUpdate');
        });

        it('repasse profileLoading à false après le submit', async () => {
            mockUpdateUser.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => { await result.current.updateProfile(); });

            expect(result.current.profileLoading).toBe(false);
        });
    });

    // ── updatePassword ────────────────────────────────────────────────────────

    describe('updatePassword', () => {
        it('affiche une erreur immédiatement si les mots de passe ne correspondent pas', async () => {
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => {
                result.current.setNewPassword('abc123');
                result.current.setConfirmPassword('different');
            });
            await act(async () => { await result.current.updatePassword(); });

            expect(result.current.passwordError).toBe('account.password.errorMismatch');
            expect(mockChangePassword).not.toHaveBeenCalled();
        });

        it('appelle changePassword avec les bons paramètres', async () => {
            mockChangePassword.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => {
                result.current.setCurrentPassword('old-pass');
                result.current.setNewPassword('new-pass');
                result.current.setConfirmPassword('new-pass');
            });
            await act(async () => { await result.current.updatePassword(); });

            expect(mockChangePassword).toHaveBeenCalledWith({
                currentPassword: 'old-pass',
                newPassword: 'new-pass',
            });
        });

        it('passe passwordSuccess à true et efface les champs en cas de succès', async () => {
            mockChangePassword.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => {
                result.current.setCurrentPassword('old');
                result.current.setNewPassword('new');
                result.current.setConfirmPassword('new');
                await result.current.updatePassword();
            });

            expect(result.current.passwordSuccess).toBe(true);
            expect(result.current.currentPassword).toBe('');
            expect(result.current.newPassword).toBe('');
            expect(result.current.confirmPassword).toBe('');
        });

        it('affiche l\'erreur API en cas d\'échec', async () => {
            mockChangePassword.mockResolvedValue({ error: { message: 'Mot de passe actuel incorrect' } });
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => {
                result.current.setNewPassword('new');
                result.current.setConfirmPassword('new');
                await result.current.updatePassword();
            });

            expect(result.current.passwordError).toBe('Mot de passe actuel incorrect');
        });

        it('repasse passwordLoading à false après le submit', async () => {
            mockChangePassword.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => {
                result.current.setNewPassword('x');
                result.current.setConfirmPassword('x');
                await result.current.updatePassword();
            });

            expect(result.current.passwordLoading).toBe(false);
        });
    });

    // ── signOut ───────────────────────────────────────────────────────────────

    describe('signOut', () => {
        it('appelle authClient.signOut, vide le store et navigue vers /login', async () => {
            mockSignOut.mockResolvedValue(undefined);
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => { await result.current.signOut(); });

            expect(mockSignOut).toHaveBeenCalled();
            expect(mockClearUser).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    // ── randomizeAvatar ───────────────────────────────────────────────────────

    describe('randomizeAvatar', () => {
        it('génère un nouveau seed aléatoire', () => {
            const { result } = renderHook(() => useAccountViewModel());
            act(() => { result.current.randomizeAvatar(); });
            expect(result.current.avatarSeed).toBe('random-seed');
        });

        it('efface profileSuccess', async () => {
            mockUpdateUser.mockResolvedValue({ error: null });
            const { result } = renderHook(() => useAccountViewModel());

            await act(async () => { await result.current.updateProfile(); });
            expect(result.current.profileSuccess).toBe(true);

            act(() => { result.current.randomizeAvatar(); });
            expect(result.current.profileSuccess).toBe(false);
        });
    });
});
