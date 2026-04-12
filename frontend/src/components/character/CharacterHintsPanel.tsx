import { BookOpen, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useCharacterDifficultyStore } from '@/stores/characterDifficultyStore';
import type { CharacterDailyHintConfigDTO } from '@/viewmodels/guessingViewModel';
import { afterGuessCountForAttribute, guessesRemainingUntilUnlock, hintAttributeLabel } from './characterGuessingUtils';
import { HintSpoilerBlock } from './HintSpoilerBlock';

export type CharacterHintsPanelProps = {
  hintConfig: CharacterDailyHintConfigDTO | null;
  hints: {
    imageUrl?: string;
    demographicType?: string | null;
    animeGenres?: string[];
  };
  spoilerModeForHints: boolean;
  imageFilterStyle?: string;
  mysteryName: string;
  /** Clé i18n pour le libellé au-dessus du nom (ex. daily vs endless). */
  nameLabelKey: string;
  /** Nombre d’essais déjà joués (pour le décompte « révélé dans X essais »). */
  completedGuesses: number;
  showSectionTitle?: boolean;
};

export function CharacterHintsPanel({
  hintConfig,
  hints,
  spoilerModeForHints,
  imageFilterStyle,
  mysteryName,
  nameLabelKey,
  completedGuesses,
  showSectionTitle = true,
}: CharacterHintsPanelProps) {
  const { t } = useTranslation();
  const useSpoilerOverlays = useCharacterDifficultyStore((s) => s.useSpoilerOverlays);
  const hardImageMode = useCharacterDifficultyStore((s) => s.hardImageMode);
  const setUseSpoilerOverlays = useCharacterDifficultyStore((s) => s.setUseSpoilerOverlays);
  const setHardImageMode = useCharacterDifficultyStore((s) => s.setHardImageMode);

  const hasDemographic = hints.demographicType != null && hints.demographicType !== '';
  const hasGenres = (hints.animeGenres?.length ?? 0) > 0;

  const demoKey = hasDemographic ? hints.demographicType! : '';
  const genresKey = hasGenres ? hints.animeGenres!.join(',') : '';

  const sortedTiers = hintConfig ? [...hintConfig.hintTiers].sort((a, b) => a.afterGuessCount - b.afterGuessCount) : [];

  const tiers = hintConfig?.hintTiers ?? [];
  const demoUnlock = afterGuessCountForAttribute(tiers, 'demographicType');
  const genresUnlock = afterGuessCountForAttribute(tiers, 'animeGenres');
  const demoRem = guessesRemainingUntilUnlock(demoUnlock, completedGuesses);
  const genresRem = guessesRemainingUntilUnlock(genresUnlock, completedGuesses);

  const demographicEmptyHint =
    !hasDemographic && demoRem != null && demoRem > 0
      ? t('character.revealedInGuesses', { count: demoRem })
      : undefined;
  const genresEmptyHint =
    !hasGenres && genresRem != null && genresRem > 0
      ? t('character.revealedInGuesses', { count: genresRem })
      : undefined;

  return (
    <>
      <section className="flex flex-col gap-4 border-border border-b pb-6">
        {showSectionTitle ? (
          <h2 className="text-center font-semibold text-lg text-primary">{t('character.hintsTitle')}</h2>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3 md:gap-6">
          <div className="order-2 flex h-full flex-col justify-between gap-2 md:order-1">
            <div>
              <p className="text-center font-semibold text-muted-foreground text-xs uppercase tracking-wide md:text-left">
                {t('guessTable.demographic')}
              </p>
              <HintSpoilerBlock
                useSpoiler={spoilerModeForHints}
                contentKey={demoKey}
                empty={!hasDemographic}
                emptyLabel={t('character.hintSlotEmpty')}
                emptyHint={demographicEmptyHint}
                tapLabel={t('character.spoilerTap')}
                align="left"
              >
                {hasDemographic ? <span className="text-base text-foreground">{hints.demographicType}</span> : null}
              </HintSpoilerBlock>
            </div>

            <div className="mt-2">
              {hintConfig ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="w-full gap-2 md:w-auto">
                      <BookOpen className="size-4" />
                      {t('character.scheduleCardTitle')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{t('character.scheduleCardTitle')}</DialogTitle>
                      <DialogDescription>{t('character.hintScheduleTitle')}</DialogDescription>
                    </DialogHeader>
                    <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
                      <li>
                        {t('character.hintImageBlurSchedule', {
                          count: hintConfig.imageBlur.totalGuessesUntilClear,
                        })}
                      </li>
                      {sortedTiers.map((tier) => (
                        <li key={tier.afterGuessCount + tier.revealAttributes.join(',')}>
                          {t('character.hintAttributeAt', {
                            labels: tier.revealAttributes
                              .map((k) => hintAttributeLabel(t, k))
                              .join(t('character.hintAttributeJoin')),
                            turn: tier.afterGuessCount,
                          })}
                        </li>
                      ))}
                    </ul>
                  </DialogContent>
                </Dialog>
              ) : (
                <p className="text-left text-muted-foreground text-xs">{t('common.loading')}</p>
              )}
            </div>
          </div>

          <div className="order-1 flex flex-col items-center gap-2 md:order-2">
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
              {t('character.mysteryImageLabel')}
            </p>
            {hintConfig?.mysteryImageUrl ? (
              <div className="flex w-full justify-center px-1">
                <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30 p-1">
                  <img
                    src={hintConfig.mysteryImageUrl}
                    alt=""
                    className="mx-auto block max-h-64 w-auto max-w-full object-contain"
                    style={{
                      filter: imageFilterStyle,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="order-3 flex h-full flex-col justify-between gap-2">
            <div>
              <p className="text-center font-semibold text-muted-foreground text-xs uppercase tracking-wide md:text-right">
                {t('guessTable.genres')}
              </p>
              <HintSpoilerBlock
                useSpoiler={spoilerModeForHints}
                contentKey={genresKey}
                empty={!hasGenres}
                emptyLabel={t('character.hintSlotEmpty')}
                emptyHint={genresEmptyHint}
                tapLabel={t('character.spoilerTap')}
                align="right"
              >
                {hasGenres ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {hints.animeGenres?.map((g) => (
                      <span key={g} className="rounded-md border border-border bg-muted px-2 py-0.5 text-sm">
                        {g}
                      </span>
                    ))}
                  </div>
                ) : null}
              </HintSpoilerBlock>
            </div>

            <div className="mt-2 flex justify-center md:justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-2">
                    <Settings className="size-4" />
                    {t('character.difficultySettings')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('character.difficultySettings')}</DialogTitle>
                    <DialogDescription>{t('character.difficultySettingsDesc')}</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 rounded border-input"
                        checked={useSpoilerOverlays}
                        onChange={(e) => setUseSpoilerOverlays(e.target.checked)}
                      />
                      <span>
                        <span className="font-medium">{t('character.settingSpoilersTitle')}</span>
                        <span className="block text-muted-foreground text-sm">
                          {t('character.settingSpoilersDesc')}
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 rounded border-input"
                        checked={hardImageMode}
                        onChange={(e) => setHardImageMode(e.target.checked)}
                      />
                      <span>
                        <span className="font-medium">{t('character.settingHardImageTitle')}</span>
                        <span className="block text-muted-foreground text-sm">
                          {t('character.settingHardImageDesc')}
                        </span>
                      </span>
                    </label>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center gap-3 border-border border-b pb-6">
        {mysteryName ? (
          <div className="text-center">
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{t(nameLabelKey)}</p>
            <p className="mt-1 font-bold text-2xl text-primary">{mysteryName}</p>
          </div>
        ) : null}
      </section>
    </>
  );
}
