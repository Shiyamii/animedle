import { Button } from "@/components/ui/button"
import { useHomePageViewModel } from "./useHomePageViewModel";
import { AutocompleteTextInput } from "@/components/AutoComplete";
import GuessTable from "@/components/GuessTable";
import { TooltipProvider } from "@/components/ui/tooltip";
import useConfetti from '@/hooks/useConfetti.ts';

function HomePage() {
    const {
        filtredAnimeList,
        isGuessingStarted,
        setIsGuessingStarted,
        inputValue,
        setInputValue,
        isFilteringLoading,
        guessList,
        onAnimeSelect,
        foundAnime
    } = useHomePageViewModel();

    useConfetti(!!foundAnime);

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex min-h-svh w-full flex-col items-center justify-center flexw-rap">
                {!isGuessingStarted ? (
                    <div className='w-full max-w-md bg-card text-card-foreground rounded-xl p-8 shadow-md border border-border'>
                        <div className="mt-4 flex flex-col items-center gap-4">
                            <h1 className="text-2xl font-bold text-primary">Start Guessing Today's Anime!</h1>
                            <Button onClick={() => setIsGuessingStarted(true)} className="mt-4">Start</Button>
                        </div>
                    </div>
                ) : (
                    <div className='w-full flex flex-col items-center max-w-6xl bg-card text-card-foreground rounded-xl p-8 shadow-md border border-border mt-24'>

                        {
                            !!foundAnime ? (
                                <div className="my-4 max-w-lg">
                                    <h2 className="text-2xl font-semibold">Congratulations! You found the anime:</h2>
                                    <p className="mt-2 text-center text-xl font-bold">{foundAnime.title}</p>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-2xl font-bold text-primary">Guess Today's Anime!</h1>
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
                            <GuessTable guesses={guessList}/>
                        )}
                    </div>
                )}

            </div>
        </TooltipProvider>
    )
}

export default HomePage;