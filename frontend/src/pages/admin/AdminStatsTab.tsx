import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type useAdminViewModel } from './useAdminViewModel';

function WinDistributionBar({ distribution }: { distribution: Record<string, number> }) {
    const { t } = useTranslation();
    const entries = Object.entries(distribution)
        .map(([k, v]) => ({ attempt: parseInt(k), count: v }))
        .sort((a, b) => a.attempt - b.attempt);

    if (entries.length === 0) return <p className="text-sm text-muted-foreground">{t('admin.stats.noData')}</p>;

    const max = Math.max(...entries.map(e => e.count));

    return (
        <div className="flex flex-col gap-1.5">
            {entries.map(({ attempt, count }) => (
                <div key={attempt} className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-muted-foreground shrink-0">
                        {t('admin.stats.attempt', { count: attempt })}
                    </span>
                    <div className="flex-1 bg-muted rounded-sm overflow-hidden h-5">
                        <div
                            className="h-full bg-primary rounded-sm transition-all"
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
        return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">{t('admin.stats.title')}</h2>
                <Button variant="outline" size="sm" onClick={loadStats} className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    {t('admin.stats.refresh')}
                </Button>
            </div>

            {/* Stats du jour */}
            <div className="border border-border rounded-lg p-4 flex flex-col gap-4">
                <h3 className="font-medium text-sm">{t('admin.stats.today.title')}</h3>

                {stats?.today.anime ? (
                    <div className="flex items-center gap-3">
                        <img
                            src={stats.today.anime.imageUrl}
                            alt={stats.today.anime.title}
                            className="w-12 h-16 object-cover rounded"
                        />
                        <div>
                            <p className="font-semibold text-sm">{stats.today.anime.title}</p>
                            <p className="text-xs text-muted-foreground">
                                {stats.today.date
                                    ? new Date(stats.today.date).toLocaleDateString('fr-FR', { dateStyle: 'long' })
                                    : '—'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">{t('admin.stats.today.noAnime')}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">{t('admin.stats.today.totalGuesses')}</p>
                        <p className="text-2xl font-bold">{stats?.today.totalGuesses ?? 0}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">{t('admin.stats.today.totalWins')}</p>
                        <p className="text-2xl font-bold">{stats?.today.totalWins ?? 0}</p>
                    </div>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('admin.stats.today.winDistribution')}</p>
                    <WinDistributionBar distribution={stats?.today.winDistribution ?? {}} />
                </div>
            </div>

            {/* Stats générales */}
            <div className="border border-border rounded-lg p-4 flex flex-col gap-4">
                <h3 className="font-medium text-sm">{t('admin.stats.global.title')}</h3>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">{t('admin.stats.global.totalDays')}</p>
                        <p className="text-2xl font-bold">{stats?.global.totalDays ?? 0}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">{t('admin.stats.global.totalGuesses')}</p>
                        <p className="text-2xl font-bold">{stats?.global.totalGuesses ?? 0}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">{t('admin.stats.global.totalWins')}</p>
                        <p className="text-2xl font-bold">{stats?.global.totalWins ?? 0}</p>
                    </div>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('admin.stats.global.winDistribution')}</p>
                    <WinDistributionBar distribution={stats?.global.winDistribution ?? {}} />
                </div>
            </div>
        </div>
    );
}
