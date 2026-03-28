import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Plus, Eye, EyeOff, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type AdminAnimeDTO, type EnabledFilter, type useAdminViewModel } from './useAdminViewModel';

function AnimeRow({ anime, onEdit, onDelete, onToggleEnabled }: { anime: AdminAnimeDTO; onEdit: () => void; onDelete: () => void; onToggleEnabled: () => void }) {
    const { t } = useTranslation();

    return (
        <tr className={`border-b border-border hover:bg-muted/40 transition-colors ${!anime.enabled ? 'opacity-50' : ''}`}>
            <td className="px-4 py-2">
                <img
                    src={anime.imageUrl}
                    alt={anime.title}
                    className="w-10 h-14 object-cover rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
            </td>
            <td className="px-4 py-2 font-medium text-sm max-w-48 truncate">
                <div className="flex items-center gap-2">
                    {anime.title}
                    {!anime.enabled && (
                        <span className="text-xs font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                            {t('admin.animes.disabled')}
                        </span>
                    )}
                </div>
            </td>
            <td className="px-4 py-2 text-sm text-muted-foreground">{anime.anime_format || '—'}</td>
            <td className="px-4 py-2 text-sm text-muted-foreground">{anime.studio || '—'}</td>
            <td className="px-4 py-2 text-sm text-muted-foreground">{anime.score || '—'}</td>
            <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleEnabled}
                        className={`p-1.5 rounded-md transition-colors ${anime.enabled ? 'hover:bg-muted text-muted-foreground hover:text-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                        title={anime.enabled ? t('admin.animes.disable') : t('admin.animes.enable')}
                    >
                        {anime.enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onEdit}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title={t('admin.animes.table.actions')}
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title={t('admin.delete.title')}
                    >
                        <Trash2 className="w-4 h-4" />
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
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                    {t('admin.animes.count', { count: filteredAnimes.length })}
                </p>
                <Button onClick={vm.openCreateForm} size="sm" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {t('admin.animes.add')}
                </Button>
            </div>

            <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={vm.searchQuery}
                        onChange={e => vm.setSearchQuery(e.target.value)}
                        placeholder={t('admin.animes.searchPlaceholder')}
                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
                <div className="flex items-center gap-1">
                    {FILTER_OPTIONS.map(option => (
                        <button
                            key={option}
                            onClick={() => vm.setEnabledFilter(option)}
                            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${vm.enabledFilter === option ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                        >
                            {t(FILTER_KEYS[option])}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && filteredAnimes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('admin.animes.loading')}</p>
            ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('admin.animes.table.image')}</th>
                                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('admin.animes.table.title')}</th>
                                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('admin.animes.table.format')}</th>
                                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('admin.animes.table.studio')}</th>
                                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('admin.animes.table.score')}</th>
                                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('admin.animes.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAnimes.map(anime => (
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
