import { useTranslation } from 'react-i18next';
import { AutocompleteTextInput } from '@/components/AutoComplete';
import GuessTable from '@/components/GuessTable';
import { ModeMenu } from '@/components/ModeMenu';
import { TooltipProvider } from '@/components/ui/tooltip';
import useConfetti from '@/hooks/useConfetti.ts';
import { useDailyGuessingPageViewModel } from './useDailyGuessingPageViewModel';

function DailyGuessingPage() {
  const { t } = useTranslation();
  const {
    filtredAnimeList,
    inputValue,
    setInputValue,
    isFilteringLoading,
    guessList,
    onAnimeSelect,
    foundAnime,
    guessStats,
  } = useDailyGuessingPageViewModel();

  useConfetti(!!foundAnime);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flexw-rap flex min-h-svh w-full flex-col items-center justify-center">
        <div className="mt-24 flex w-full max-w-6xl flex-col items-center rounded-xl border border-border bg-card p-4 text-card-foreground shadow-md">
          <ModeMenu orientation="horizontal" />
        </div>
        <div className="mt-2 flex w-full max-w-6xl flex-col items-center rounded-xl border border-border bg-card p-8 text-card-foreground shadow-md">
          {foundAnime ? (
            <div className="my-4 max-w-lg text-center">
              <h2 className="font-semibold text-2xl text-primary">{t('home.congratulations')}</h2>
              <p className="mt-2 text-center font-bold text-xl">{foundAnime.title}</p>
            </div>
          ) : (
            <>
              <h1 className="font-bold text-2xl text-primary">{t('home.guessTitle')}</h1>
              <div className="my-4 flex w-full max-w-lg flex-col flex-wrap items-center gap-4">
                <AutocompleteTextInput
                  values={filtredAnimeList}
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  isFilteringLoading={isFilteringLoading}
                  onSelect={onAnimeSelect}
                />
              </div>
            </>
          )}
          {guessList.length > 0 && <GuessTable guesses={guessList} guessStats={guessStats} />}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default DailyGuessingPage;
