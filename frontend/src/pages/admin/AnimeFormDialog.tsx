import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { useAdminViewModel } from './useAdminViewModel';

const FORMAT_OPTIONS = ['TV', 'Movie', 'OVA', 'ONA', 'Special', 'Music'];
const DEMOGRAPHIC_OPTIONS = ['Shounen', 'Shoujo', 'Seinen', 'Josei', 'Kids'];
const SOURCE_OPTIONS = ['Original', 'Manga', 'Light novel', 'Visual novel', 'Game', 'Novel', 'Other'];

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function AnimeFormDialog({ vm }: { vm: ReturnType<typeof useAdminViewModel> }) {
  const { t } = useTranslation();
  const {
    form,
    error,
    editingId,
    isLoading,
    updateFormField,
    updateTitle,
    addTitle,
    removeTitle,
    handleSubmit,
    closeForm,
  } = vm;

  return (
    <Dialog
      open={vm.showForm}
      onOpenChange={(open) => {
        if (!open) {
          closeForm();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? t('admin.form.titleEdit') : t('admin.form.titleCreate')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">{error}</p>}

          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-sm">{t('admin.form.imageUrl')}</label>
            <Input
              placeholder={t('admin.form.imageUrlPlaceholder')}
              value={form.imageUrl}
              onChange={(e) => updateFormField('imageUrl', e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{t('admin.form.imageUrlHint')}</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-sm">{t('admin.form.titles')}</label>
              <button
                type="button"
                onClick={addTitle}
                className="flex items-center gap-1 text-primary text-xs hover:underline"
              >
                <Plus className="h-3 w-3" /> {t('admin.form.addTitle')}
              </button>
            </div>
            {form.titles.map((title, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder={t('admin.form.titleTypePlaceholder')}
                  value={title.type}
                  onChange={(e) => updateTitle(idx, 'type', e.target.value)}
                  className="w-36 shrink-0"
                />
                <Input
                  placeholder={t('admin.form.titleValuePlaceholder')}
                  value={title.title}
                  onChange={(e) => updateTitle(idx, 'title', e.target.value)}
                />
                {form.titles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTitle(idx)}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-sm">{t('admin.form.format')}</label>
              <select
                value={form.anime_format}
                onChange={(e) => updateFormField('anime_format', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">—</option>
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-sm">{t('admin.form.demographic')}</label>
              <select
                value={form.demographic_type}
                onChange={(e) => updateFormField('demographic_type', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">—</option>
                {DEMOGRAPHIC_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-sm">{t('admin.form.episodes')}</label>
              <Input
                type="number"
                placeholder="12"
                value={form.episodes}
                onChange={(e) => updateFormField('episodes', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-sm">{t('admin.form.score')}</label>
              <Input
                type="number"
                step="0.01"
                placeholder="7.80"
                value={form.score}
                onChange={(e) => updateFormField('score', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-sm">{t('admin.form.seasonStart')}</label>
              <Input
                placeholder={t('admin.form.seasonStartPlaceholder')}
                value={form.season_start}
                onChange={(e) => updateFormField('season_start', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-sm">{t('admin.form.studio')}</label>
              <Input
                placeholder={t('admin.form.studioPlaceholder')}
                value={form.studio}
                onChange={(e) => updateFormField('studio', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-sm">{t('admin.form.source')}</label>
              <select
                value={form.source}
                onChange={(e) => updateFormField('source', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">—</option>
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-sm">{t('admin.form.genres')}</label>
            <Input
              placeholder={t('admin.form.genresPlaceholder')}
              value={form.genres}
              onChange={(e) => updateFormField('genres', e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{t('admin.form.genresHint')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeForm} disabled={isLoading}>
            {t('admin.form.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? t('admin.form.saving') : t('admin.form.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
