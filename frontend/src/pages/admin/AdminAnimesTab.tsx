import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { AdminAnimeDTO, EnabledFilter, useAdminViewModel } from './useAdminViewModel';

function AnimeRow({
  anime,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  anime: AdminAnimeDTO;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
}) {
  const { t } = useTranslation();

  return (
    <tr className={`border-border border-b transition-colors hover:bg-muted/40 ${anime.enabled ? '' : 'opacity-50'}`}>
      <td className="px-4 py-2">
        <img
          src={anime.imageUrl}
          alt={anime.title}
          className="h-14 w-10 rounded object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </td>
      <td className="max-w-48 truncate px-4 py-2 font-medium text-sm">
        <div className="flex items-center gap-2">
          {anime.title}
          {!anime.enabled && (
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-normal text-muted-foreground text-xs">
              {t('admin.animes.disabled')}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2 text-muted-foreground text-sm">{anime.anime_format || '—'}</td>
      <td className="px-4 py-2 text-muted-foreground text-sm">{anime.studio || '—'}</td>
      <td className="px-4 py-2 text-muted-foreground text-sm">{anime.score || '—'}</td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleEnabled}
            className={`rounded-md p-1.5 transition-colors ${anime.enabled ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            title={anime.enabled ? t('admin.animes.disable') : t('admin.animes.enable')}
          >
            {anime.enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('admin.animes.table.actions')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title={t('admin.delete.title')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

const FILTER_OPTIONS: EnabledFilter[] = ['all', 'enabled', 'disabled'];
const FILTER_KEYS: Record<EnabledFilter, string> = {
  all: 'admin.animes.filterAll',
  enabled: 'admin.animes.filterEnabled',
  disabled: 'admin.animes.filterDisabled',
};

export function AdminAnimesTab({ vm }: { vm: ReturnType<typeof useAdminViewModel> }) {
  const { t } = useTranslation();
  const { filteredAnimes, isLoading } = vm;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{t('admin.animes.count', { count: filteredAnimes.length })}</p>
        <Button onClick={vm.openCreateForm} size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('admin.animes.add')}
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={vm.searchQuery}
            onChange={(e) => vm.setSearchQuery(e.target.value)}
            placeholder={t('admin.animes.searchPlaceholder')}
            className="w-full rounded-md border border-border bg-background py-1.5 pr-3 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1">
          {FILTER_OPTIONS.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => vm.setEnabledFilter(option)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${vm.enabledFilter === option ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {t(FILTER_KEYS[option])}
            </button>
          ))}
        </div>
      </div>

      {isLoading && filteredAnimes.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">{t('admin.animes.loading')}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t('admin.animes.table.image')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t('admin.animes.table.title')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t('admin.animes.table.format')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t('admin.animes.table.studio')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t('admin.animes.table.score')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t('admin.animes.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAnimes.map((anime) => (
                <AnimeRow
                  key={anime.id}
                  anime={anime}
                  onEdit={() => vm.openEditForm(anime)}
                  onDelete={() => vm.confirmDelete(anime.id)}
                  onToggleEnabled={() => vm.handleToggleEnabled(anime.id, !anime.enabled)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
