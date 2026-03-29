import { useTranslation } from 'react-i18next';
import { AutocompleteTextInput } from '@/components/AutoComplete';
import GuessTable from '@/components/GuessTable';
import { ModeMenu } from '@/components/ModeMenu';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import useConfetti from '@/hooks/useConfetti.ts';
import { useEndlessModePageViewModel } from './useEndlessModePageViewModel';

function EndlessPage() {
  const { t } = useTranslation();
  const {
    filtredAnimeList,
    inputValue,
    setInputValue,
    isFilteringLoading,
    guessList,
    onAnimeSelect,
    foundAnime,
    startNewGame,
  } = useEndlessModePageViewModel();

  useConfetti(!!foundAnime);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flexw-rap flex min-h-svh w-full flex-col items-center justify-center px-6">
        <div className="flex w-full max-w-6xl flex-col items-center rounded-xl border border-border bg-card p-4 text-card-foreground shadow-md">
          <ModeMenu orientation="horizontal" />
        </div>
        <div className="mt-6 flex w-full max-w-6xl flex-col items-center rounded-xl border border-border bg-card p-8 text-card-foreground shadow-md">
          {foundAnime ? (
            <div className="my-4 max-w-lg">
              <h2 className="font-semibold text-2xl">{t('home.congratulations')}</h2>
              <p className="mt-2 text-center font-bold text-xl">{foundAnime.title}</p>
              <div className="flex items-center justify-center">
                <Button className="mt-4" onClick={() => startNewGame()}>
                  {t('endless.playAgain')}
                </Button>
              </div>
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
          {guessList.length > 0 && <GuessTable guesses={guessList} />}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default EndlessPage;
