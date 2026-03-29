import { Check, Shuffle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { useAdminViewModel } from './useAdminViewModel';

export function AdminDailyTab({ vm }: { vm: ReturnType<typeof useAdminViewModel> }) {
  const { t } = useTranslation();
  const { currentAnime, animes, isLoading, selectedAnimeId, setSelectedAnimeId } = vm;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-3 font-medium text-muted-foreground text-sm">{t('admin.daily.current')}</h2>
        {currentAnime ? (
          <div className="flex items-center gap-4">
            <img src={currentAnime.imageUrl} alt={currentAnime.title} className="h-22 w-16 rounded object-cover" />
            <div>
              <p className="font-semibold">{currentAnime.title}</p>
              <p className="text-muted-foreground text-sm">
                {currentAnime.anime_format} · {currentAnime.studio}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t('admin.daily.noCurrent')}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
        <div>
          <p className="font-medium text-sm">{t('admin.daily.random')}</p>
          <p className="text-muted-foreground text-xs">{t('admin.daily.randomDesc')}</p>
        </div>
        <Button
          onClick={vm.handleSetRandom}
          disabled={isLoading}
          variant="outline"
          className="flex shrink-0 items-center gap-2"
        >
          <Shuffle className="h-4 w-4" />
          {t('admin.daily.randomBtn')}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div>
          <p className="font-medium text-sm">{t('admin.daily.manual')}</p>
          <p className="text-muted-foreground text-xs">{t('admin.daily.manualDesc')}</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedAnimeId}
            onChange={(e) => setSelectedAnimeId(e.target.value)}
            className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">{t('admin.daily.selectPlaceholder')}</option>
            {animes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <Button
            onClick={vm.handleSetSpecific}
            disabled={!selectedAnimeId || isLoading}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            {t('admin.daily.setBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
