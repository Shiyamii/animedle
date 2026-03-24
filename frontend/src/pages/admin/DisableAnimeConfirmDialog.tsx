import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type useAdminViewModel } from './useAdminViewModel';

export function DisableAnimeConfirmDialog({ vm }: { vm: ReturnType<typeof useAdminViewModel> }) {
    const { t } = useTranslation();
    const { disableConfirmAnimeId, animes, confirmDisable, cancelDisable, isLoading } = vm;
    const anime = animes.find(a => a.id === disableConfirmAnimeId);

    return (
        <Dialog open={!!disableConfirmAnimeId} onOpenChange={(open) => { if (!open) cancelDisable(); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{t('admin.disable.title')}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    {t('admin.disable.warningCurrentAnime', { title: anime?.title ?? '' })}
                </p>
                <DialogFooter>
                    <Button variant="outline" onClick={cancelDisable} disabled={isLoading}>
                        {t('admin.disable.cancel')}
                    </Button>
                    <Button variant="destructive" onClick={confirmDisable} disabled={isLoading}>
                        {isLoading ? t('admin.disable.disabling') : t('admin.disable.confirmBtn')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
