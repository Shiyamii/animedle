import { useTranslation } from 'react-i18next';
import { Shuffle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type useAdminViewModel } from './useAdminViewModel';

export function AdminDailyTab({ vm }: { vm: ReturnType<typeof useAdminViewModel> }) {
    const { t } = useTranslation();
    const { currentAnime, animes, isLoading, selectedAnimeId, setSelectedAnimeId } = vm;

    return (
        <div className="flex flex-col gap-6">
            <div className="border border-border rounded-lg p-4">
                <h2 className="text-sm font-medium text-muted-foreground mb-3">{t('admin.daily.current')}</h2>
                {currentAnime ? (
                    <div className="flex items-center gap-4">
                        <img
                            src={currentAnime.imageUrl}
                            alt={currentAnime.title}
                            className="w-16 h-22 object-cover rounded"
                        />
                        <div>
                            <p className="font-semibold">{currentAnime.title}</p>
                            <p className="text-sm text-muted-foreground">
                                {currentAnime.anime_format} · {currentAnime.studio}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">{t('admin.daily.noCurrent')}</p>
                )}
            </div>

            <div className="border border-border rounded-lg p-4 flex items-center justify-between gap-4">
                <div>
                    <p className="font-medium text-sm">{t('admin.daily.random')}</p>
                    <p className="text-xs text-muted-foreground">{t('admin.daily.randomDesc')}</p>
                </div>
                <Button
                    onClick={vm.handleSetRandom}
                    disabled={isLoading}
                    variant="outline"
                    className="flex items-center gap-2 shrink-0"
                >
                    <Shuffle className="w-4 h-4" />
                    {t('admin.daily.randomBtn')}
                </Button>
            </div>

            <div className="border border-border rounded-lg p-4 flex flex-col gap-3">
                <div>
                    <p className="font-medium text-sm">{t('admin.daily.manual')}</p>
                    <p className="text-xs text-muted-foreground">{t('admin.daily.manualDesc')}</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedAnimeId}
                        onChange={e => setSelectedAnimeId(e.target.value)}
                        className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="">{t('admin.daily.selectPlaceholder')}</option>
                        {animes.map(a => (
                            <option key={a.id} value={a.id}>{a.title}</option>
                        ))}
                    </select>
                    <Button
                        onClick={vm.handleSetSpecific}
                        disabled={!selectedAnimeId || isLoading}
                        className="flex items-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        {t('admin.daily.setBtn')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
