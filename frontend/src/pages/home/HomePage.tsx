import { Button } from "@/components/ui/button"
import { useHomePageViewModel } from "./useHomePageViewModel";
import { AutocompleteTextInput } from "@/components/AutoComplete";

function HomePage() {
    const {filtredAnimeList, isGuessingStarted, setIsGuessingStarted, inputValue, setInputValue} = useHomePageViewModel();
    return (
        <div className="flex min-h-svh w-full flex-col items-center justify-center">
                {!isGuessingStarted ? (
                    <div className='w-full max-w-md bg-card text-card-foreground rounded-xl p-8 shadow-md border border-border'>
                        <div className="mt-4 flex flex-col items-center gap-4">
                            <h1 className="text-2xl font-bold text-primary">Start Guessing Today's Anime!</h1>
                            <Button onClick={() => setIsGuessingStarted(true)} className="mt-4">Start</Button>
                        </div>
                    </div>
                ) : (
                    <div className='w-full max-w-3xl bg-card text-card-foreground rounded-xl p-8 shadow-md border border-border'>
                        <h1 className="text-2xl font-bold text-primary">Guess Today's Anime!</h1>
                        <div className="mt-4">
                            <AutocompleteTextInput values={filtredAnimeList} inputValue={inputValue} setInputValue={setInputValue} />
                        </div>
                    </div>
                )}

        </div>
    )
}

export default HomePage;