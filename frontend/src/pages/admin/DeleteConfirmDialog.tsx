import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { useAdminViewModel } from './useAdminViewModel';

export function DeleteConfirmDialog({ vm }: { vm: ReturnType<typeof useAdminViewModel> }) {
  const { t } = useTranslation();
  const { deleteConfirmId, animes, handleDelete, cancelDelete, isLoading } = vm;
  const anime = animes.find((a) => a.id === deleteConfirmId);

  return (
    <Dialog
      open={!!deleteConfirmId}
      onOpenChange={(open) => {
        if (!open) {
          cancelDelete();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('admin.delete.title')}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">{t('admin.delete.confirm', { title: anime?.title ?? '' })}</p>
        <DialogFooter>
          <Button variant="outline" onClick={cancelDelete} disabled={isLoading}>
            {t('admin.delete.cancel')}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? t('admin.delete.deleting') : t('admin.delete.confirmBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
