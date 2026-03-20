import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type AdminAnimeDTO, type useAdminViewModel } from './useAdminViewModel';

function AnimeRow({ anime, onEdit, onDelete }: { anime: AdminAnimeDTO; onEdit: () => void; onDelete: () => void }) {
    const { t } = useTranslation();

    return (
        <tr className="border-b border-border hover:bg-muted/40 transition-colors">
            <td className="px-4 py-2">
                <img
                    src={anime.imageUrl}
                    alt={anime.title}
                    className="w-10 h-14 object-cover rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
            </td>
            <td className="px-4 py-2 font-medium text-sm max-w-48 truncate">{anime.title}</td>
            <td className="px-4 py-2 text-sm text-muted-foreground">{anime.anime_format || '—'}</td>
            <td className="px-4 py-2 text-sm text-muted-foreground">{anime.studio || '—'}</td>
            <td className="px-4 py-2 text-sm text-muted-foreground">{anime.score || '—'}</td>
            <td className="px-4 py-2">
                <div className="flex items-center gap-2">
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

export function AdminAnimesTab({ vm }: { vm: ReturnType<typeof useAdminViewModel> }) {
    const { t } = useTranslation();
    const { animes, isLoading } = vm;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                    {t('admin.animes.count', { count: animes.length })}
                </p>
                <Button onClick={vm.openCreateForm} size="sm" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {t('admin.animes.add')}
                </Button>
            </div>

            {isLoading && animes.length === 0 ? (
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
                            {animes.map(anime => (
                                <AnimeRow
                                    key={anime.id}
                                    anime={anime}
                                    onEdit={() => vm.openEditForm(anime)}
                                    onDelete={() => vm.confirmDelete(anime.id)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
