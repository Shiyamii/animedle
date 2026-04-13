import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { AdminCharacterDTO, useAdminViewModel } from './useAdminViewModel';

function CharacterRow({
  character,
  onEdit,
  onDelete,
}: {
  character: AdminCharacterDTO;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <tr className="border-border border-b transition-colors hover:bg-muted/40">
      <td className="px-4 py-2">
        <img
          src={character.imageUrl}
          alt={character.name}
          className="h-14 w-10 rounded object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </td>
      <td className="max-w-48 truncate px-4 py-2 font-medium text-sm">{character.name}</td>
      <td className="max-w-48 truncate px-4 py-2 text-muted-foreground text-sm">{character.animeTitle || '—'}</td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('admin.characters.table.actions')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title={t('admin.deleteCharacter.title')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function AdminCharactersTab({ vm }: { vm: ReturnType<typeof useAdminViewModel> }) {
  const { t } = useTranslation();
  const { filteredCharacters, isLoading } = vm;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {t('admin.characters.count', { count: filteredCharacters.length })}
        </p>
        <Button onClick={vm.openCreateCharacterForm} size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('admin.characters.add')}
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={vm.characterSearchQuery}
            onChange={(e) => vm.setCharacterSearchQuery(e.target.value)}
            placeholder={t('admin.characters.searchPlaceholder')}
            className="w-full rounded-md border border-border bg-background py-1.5 pr-3 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {isLoading && filteredCharacters.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">{t('admin.characters.loading')}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t('admin.characters.table.image')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t('admin.characters.table.name')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t('admin.characters.table.anime')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t('admin.characters.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCharacters.map((character) => (
                <CharacterRow
                  key={character.id}
                  character={character}
                  onEdit={() => vm.openEditCharacterForm(character)}
                  onDelete={() => vm.confirmDeleteCharacter(character.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
