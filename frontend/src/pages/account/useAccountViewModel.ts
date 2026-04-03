import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { authClient } from '@/lib/auth-client';
import { generateSeed, getAvatarUrl } from '@/lib/avatar';
import { useUserStore } from '@/stores/userStore';

export { getAvatarUrl };

export function useAccountViewModel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const setStoreUser = useUserStore((s) => s.setUser);
  const clearStoreUser = useUserStore((s) => s.clearUser);

  const [name, setName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setAvatarSeed((user as any).avatarSeed ?? generateSeed());
    }
  }, [user?.id, user]);

  async function updateProfile() {
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(false);

    const { error } = await authClient.updateUser({ name, avatarSeed } as any);

    if (error) {
      setProfileError(error.message ?? t('account.profile.errorUpdate'));
    } else {
      setProfileSuccess(true);
      if (user) {
        setStoreUser({ id: user.id, name, email: user.email, avatarSeed });
      }
    }
    setProfileLoading(false);
  }

  async function updatePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordError(t('account.password.errorMismatch'));
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    const { error } = await (authClient as any).changePassword({ currentPassword, newPassword });

    if (error) {
      setPasswordError(error.message ?? t('account.password.errorChange'));
    } else {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  }

  async function signOut() {
    await authClient.signOut();
    clearStoreUser();
    navigate('/login');
  }

  function randomizeAvatar() {
    setAvatarSeed(generateSeed());
    setProfileSuccess(false);
  }

  return {
    isPending,
    user,
    name,
    setName,
    avatarSeed,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    profileLoading,
    profileError,
    profileSuccess,
    passwordLoading,
    passwordError,
    passwordSuccess,
    updateProfile,
    updatePassword,
    signOut,
    randomizeAvatar,
  };
}
