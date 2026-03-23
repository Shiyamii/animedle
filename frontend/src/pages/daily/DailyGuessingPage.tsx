import { useDailyGuessingPageViewModel } from "./useDailyGuessingPageViewModel";
import { AutocompleteTextInput } from "@/components/AutoComplete";
import GuessTable from "@/components/GuessTable";
import { TooltipProvider } from "@/components/ui/tooltip";
import useConfetti from '@/hooks/useConfetti.ts';
import { useTranslation } from "react-i18next";
import { ModeMenu } from "@/components/ModeMenu";

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
            <div className="flex min-h-svh w-full flex-col items-center justify-center flexw-rap px-6">
                <div className='w-full flex flex-col items-center max-w-6xl bg-card text-card-foreground rounded-xl p-4 shadow-md border border-border'>
                    <ModeMenu orientation="horizontal" />
                </div>
                <div className='mt-6 w-full flex flex-col items-center max-w-6xl bg-card text-card-foreground rounded-xl p-8 shadow-md border border-border'>

                    {
                        !!foundAnime ? (
                            <div className="my-4 max-w-lg">
                                <h2 className="text-2xl font-semibold">{t("home.congratulations")}</h2>
                                <p className="mt-2 text-center text-xl font-bold">{foundAnime.title}</p>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-primary">{t("home.guessTitle")}</h1>
                                <div className="my-4 max-w-lg w-full items-center gap-4 flex flex-col flex-wrap">
                                    <AutocompleteTextInput values={filtredAnimeList}
                                                            inputValue={inputValue}
                                                            setInputValue={setInputValue}
                                                            isFilteringLoading={isFilteringLoading}
                                                            onSelect={onAnimeSelect}/>

                                </div>
                            </>

                        )
                    }
                    {guessList.length > 0 && (
                        <GuessTable guesses={guessList} guessStats={guessStats}/>
                    )}
                </div>


            </div>
        </TooltipProvider>
    )
}

export default DailyGuessingPage;
