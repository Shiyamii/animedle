import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuthViewModel } from './useAuthViewModel.ts';

export function AuthPage() {
  const { t } = useTranslation();
  const { mode, email, setEmail, password, setPassword, name, setName, error, loading, handleSubmit, toggleMode } =
    useAuthViewModel();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-card-foreground shadow-md">
        <h1 className="mb-6 text-center font-bold font-sans text-2xl text-foreground">
          {mode === 'login' ? t('auth.login') : t('auth.register')}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-sm">{t('auth.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-sm">{t('common.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-sm">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? t('common.loading') : mode === 'login' ? t('auth.loginButton') : t('auth.registerButton')}
          </Button>
        </form>

        <p className="mt-6 text-center text-muted-foreground text-sm">
          {mode === 'login' ? t('auth.noAccount') : t('auth.alreadyAccount')}{' '}
          <button type="button" onClick={toggleMode} className="font-medium text-primary hover:underline">
            {mode === 'login' ? t('auth.registerButton') : t('auth.loginButton')}
          </button>
        </p>
      </div>
    </div>
  );
}
