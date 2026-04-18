import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { useAdminViewModel } from './useAdminViewModel';

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function CharacterFormDialog({ vm }: { vm: ReturnType<typeof useAdminViewModel> }) {
  const { t } = useTranslation();
  const {
    characterForm,
    characterError,
    editingCharacterId,
    isLoading,
    animes,
    updateCharacterFormField,
    handleCharacterSubmit,
    closeCharacterForm,
  } = vm;

  return (
    <Dialog
      open={vm.showCharacterForm}
      onOpenChange={(open) => {
        if (!open) {
          closeCharacterForm();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingCharacterId ? t('admin.characterForm.titleEdit') : t('admin.characterForm.titleCreate')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {characterError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">{characterError}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-sm">{t('admin.characterForm.name')}</label>
            <Input
              placeholder={t('admin.characterForm.namePlaceholder')}
              value={characterForm.name}
              onChange={(e) => updateCharacterFormField('name', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-sm">{t('admin.characterForm.imageUrl')}</label>
            <Input
              placeholder={t('admin.characterForm.imageUrlPlaceholder')}
              value={characterForm.imageUrl}
              onChange={(e) => updateCharacterFormField('imageUrl', e.target.value)}
            />
            {characterForm.imageUrl && (
              <img
                src={characterForm.imageUrl}
                alt="preview"
                className="h-20 w-14 rounded object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-sm">{t('admin.characterForm.anime')}</label>
            <select
              value={characterForm.animeId}
              onChange={(e) => updateCharacterFormField('animeId', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">{t('admin.characterForm.animePlaceholder')}</option>
              {animes.map((anime) => (
                <option key={anime.id} value={anime.id}>
                  {anime.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeCharacterForm} disabled={isLoading}>
            {t('admin.characterForm.cancel')}
          </Button>
          <Button onClick={handleCharacterSubmit} disabled={isLoading}>
            {isLoading ? t('admin.characterForm.saving') : t('admin.characterForm.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
