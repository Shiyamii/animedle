import { Button } from "@/components/ui/button"
import { useHomePageViewModel } from "./useHomePageViewModel";

function HomePage() {
    const {getAnimeList, isGuessingStarted, setIsGuessingStarted} = useHomePageViewModel();
    return (
        <div className="flex min-h-svh w-full flex-col items-center justify-center">
            <div className='w-full max-w-md bg-card text-card-foreground rounded-xl p-8 shadow-md border border-border'>
                {!isGuessingStarted ? (
                    <div className="mt-4 flex flex-col items-center gap-4">
                        <h1 className="text-2xl font-bold text-primary">Start Guessing Today's Anime!</h1>
                        <Button onClick={() => setIsGuessingStarted(true)} className="mt-4">Start</Button>
                    </div>
                ) : (
                    <div className="mt-4">
                    <p>Guess</p>
                        </div>
                )}
            </div>

        </div>
    )
}

export default HomePage;