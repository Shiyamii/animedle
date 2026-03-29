import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { UserWidget } from '@/components/UserWidget';
import { authClient } from '@/lib/auth-client';
import { useUserStore } from '@/stores/userStore';

export default function RootLayout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const setUser = useUserStore((s) => s.setUser);
  const clearUser = useUserStore((s) => s.clearUser);

  useEffect(() => {
    const user = session?.user as any;
    if (user) {
      setUser({
        id: user.id,
        name: user.name ?? '',
        email: user.email ?? '',
        avatarSeed: user.avatarSeed ?? null,
      });
    } else {
      clearUser();
    }
  }, [session?.user, clearUser, setUser]);

  return (
    <>
      <UserWidget />
      <button
        type="button"
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-50 cursor-pointer font-bold text-3xl text-foreground"
      >
        Anime<span className="text-primary">Dle</span>
      </button>
      <Outlet />
    </>
  );
}
