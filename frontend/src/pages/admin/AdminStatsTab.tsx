import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { useAdminViewModel } from './useAdminViewModel';

function WinDistributionBar({ distribution }: { distribution: Record<string, number> }) {
  const { t } = useTranslation();
  const entries = Object.entries(distribution)
    .map(([k, v]) => ({ attempt: parseInt(k, 10), count: v }))
    .sort((a, b) => a.attempt - b.attempt);

  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('admin.stats.noData')}</p>;
  }

  const max = Math.max(...entries.map((e) => e.count));

  return (
    <div className="flex flex-col gap-1.5">
      {entries.map(({ attempt, count }) => (
        <div key={attempt} className="flex items-center gap-2 text-sm">
          <span className="w-16 shrink-0 text-muted-foreground">{t('admin.stats.attempt', { count: attempt })}</span>
          <div className="h-5 flex-1 overflow-hidden rounded-sm bg-muted">
            <div
              className="h-full rounded-sm bg-primary transition-all"
              style={{ width: max > 0 ? `${(count / max) * 100}%` : '0%' }}
            />
          </div>
          <span className="w-6 text-right font-medium">{count}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminStatsTab({ vm }: { vm: ReturnType<typeof useAdminViewModel> }) {
  const { t } = useTranslation();
  const { stats, isLoadingStats, loadStats } = vm;

  if (isLoadingStats) {
    return <p className="text-muted-foreground text-sm">{t('common.loading')}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-muted-foreground text-sm">{t('admin.stats.title')}</h2>
        <Button variant="outline" size="sm" onClick={loadStats} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('admin.stats.refresh')}
        </Button>
      </div>

      {/* Stats du jour */}
      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h3 className="font-medium text-sm">{t('admin.stats.today.title')}</h3>

        {stats?.today.anime ? (
          <div className="flex items-center gap-3">
            <img
              src={stats.today.anime.imageUrl}
              alt={stats.today.anime.title}
              className="h-16 w-12 rounded object-cover"
            />
            <div>
              <p className="font-semibold text-sm">{stats.today.anime.title}</p>
              <p className="text-muted-foreground text-xs">
                {stats.today.date ? new Date(stats.today.date).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : '—'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t('admin.stats.today.noAnime')}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-primary/20 bg-primary/8 p-3">
            <p className="text-primary/70 text-xs">{t('admin.stats.today.totalGuesses')}</p>
            <p className="font-bold text-2xl text-primary">{stats?.today.totalGuesses ?? 0}</p>
          </div>
          <div className="rounded-lg border border-green-500/20 bg-green-500/8 p-3">
            <p className="text-green-600 text-xs dark:text-green-400">{t('admin.stats.today.totalWins')}</p>
            <p className="font-bold text-2xl text-green-600 dark:text-green-400">{stats?.today.totalWins ?? 0}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-muted-foreground text-xs">{t('admin.stats.today.winDistribution')}</p>
          <WinDistributionBar distribution={stats?.today.winDistribution ?? {}} />
        </div>
      </div>

      {/* Stats générales */}
      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h3 className="font-medium text-sm">{t('admin.stats.global.title')}</h3>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-secondary/25 bg-secondary/15 p-3">
            <p className="text-secondary-foreground/60 text-xs dark:text-white">{t('admin.stats.global.totalDays')}</p>
            <p className="font-bold text-2xl text-secondary-foreground/80 dark:text-white">
              {stats?.global.totalDays ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/8 p-3">
            <p className="text-primary/70 text-xs">{t('admin.stats.global.totalGuesses')}</p>
            <p className="font-bold text-2xl text-primary">{stats?.global.totalGuesses ?? 0}</p>
          </div>
          <div className="rounded-lg border border-green-500/20 bg-green-500/8 p-3">
            <p className="text-green-600 text-xs dark:text-green-400">{t('admin.stats.global.totalWins')}</p>
            <p className="font-bold text-2xl text-green-600 dark:text-green-400">{stats?.global.totalWins ?? 0}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-muted-foreground text-xs">{t('admin.stats.global.winDistribution')}</p>
          <WinDistributionBar distribution={stats?.global.winDistribution ?? {}} />
        </div>
      </div>
    </div>
  );
}
