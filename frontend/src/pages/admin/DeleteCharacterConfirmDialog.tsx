import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { useAdminViewModel } from './useAdminViewModel';

export function DeleteCharacterConfirmDialog({ vm }: { vm: ReturnType<typeof useAdminViewModel> }) {
  const { t } = useTranslation();
  const { deleteCharacterConfirmId, characters, handleDeleteCharacter, cancelDeleteCharacter, isLoading } = vm;
  const character = characters.find((c) => c.id === deleteCharacterConfirmId);

  return (
    <Dialog
      open={!!deleteCharacterConfirmId}
      onOpenChange={(open) => {
        if (!open) {
          cancelDeleteCharacter();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('admin.deleteCharacter.title')}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {t('admin.deleteCharacter.confirm', { name: character?.name ?? '' })}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={cancelDeleteCharacter} disabled={isLoading}>
            {t('admin.deleteCharacter.cancel')}
          </Button>
          <Button variant="destructive" onClick={handleDeleteCharacter} disabled={isLoading}>
            {isLoading ? t('admin.deleteCharacter.deleting') : t('admin.deleteCharacter.confirmBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
