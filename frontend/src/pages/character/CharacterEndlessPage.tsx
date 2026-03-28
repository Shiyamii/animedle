import { AutocompleteTextInput } from "@/components/AutoComplete";
import { MYSTERY_IMAGE_MAX_BLUR_PX } from "@/components/character/characterGuessingUtils";
import { CharacterGuessRows } from "@/components/character/CharacterGuessRows";
import { CharacterHintsPanel } from "@/components/character/CharacterHintsPanel";
import { ModeMenu } from "@/components/ModeMenu";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import useConfetti from "@/hooks/useConfetti.ts";
import { useCharacterDifficultyStore } from "@/stores/characterDifficultyStore";
import { useTranslation } from "react-i18next";
import { useCharacterEndlessPageViewModel } from "./useCharacterEndlessPageViewModel";

function CharacterEndlessPage() {
    const { t } = useTranslation();
    const {
        hintConfig,
        animeList,
        filtredAnimeList,
        inputValue,
        setInputValue,
        isFilteringLoading,
        guessList,
        hints,
        foundAnime,
        onAnimeSelect,
        startNewGame,
    } = useCharacterEndlessPageViewModel();

    const useSpoilerOverlays = useCharacterDifficultyStore((s) => s.useSpoilerOverlays);
    const hardImageMode = useCharacterDifficultyStore((s) => s.hardImageMode);

    const spoilerModeForHints = useSpoilerOverlays && !foundAnime;

    useConfetti(!!foundAnime);

    const completedGuesses = guessList.length;
    const totalBlurGuesses = hintConfig?.imageBlur.totalGuessesUntilClear ?? 10;
    const blurProgress =
        foundAnime
            ? 0
            : MYSTERY_IMAGE_MAX_BLUR_PX
              * Math.max(0, totalBlurGuesses - Math.min(completedGuesses, totalBlurGuesses))
              / Math.max(1, totalBlurGuesses);

    const imageFilters: string[] = [];
    if (!foundAnime) {
        if (blurProgress > 0) {
            imageFilters.push(`blur(${blurProgress}px)`);
        }
        if (hardImageMode) {
            imageFilters.push("grayscale(1)");
        }
    }
    const imageFilterStyle = imageFilters.length > 0 ? imageFilters.join(" ") : undefined;

    const mysteryName = hintConfig?.mysteryCharacterName?.trim() ?? "";

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex min-h-svh w-full flex-col items-center justify-center flex-wrap px-6">
                <div className="mt-24 w-full max-w-6xl rounded-xl border border-border bg-card p-4 text-card-foreground shadow-md">
                    <ModeMenu orientation="horizontal" />
                </div>
                <div className="mt-6 flex w-full max-w-6xl flex-col gap-8 rounded-xl border border-border bg-card p-8 text-card-foreground shadow-md">
                    <CharacterHintsPanel
                        hintConfig={hintConfig}
                        hints={hints}
                        spoilerModeForHints={spoilerModeForHints}
                        imageFilterStyle={imageFilterStyle}
                        mysteryName={mysteryName}
                        nameLabelKey="character.endlessNameLabel"
                        completedGuesses={guessList.length}
                    />

                    <section className="flex flex-col items-center gap-4">
                        {foundAnime ? (
                            <div className="max-w-lg text-center">
                                <h2 className="text-2xl font-semibold text-primary">
                                    {t("home.congratulations")}
                                </h2>
                                <p className="mt-2 text-xl font-bold">{foundAnime.title}</p>
                                <div className="mt-4 flex justify-center">
                                    <Button type="button" onClick={() => startNewGame()}>
                                        {t("endless.playAgain")}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-primary">{t("character.endlessGuessTitle")}</h1>
                                <div className="flex w-full max-w-lg flex-col items-center gap-4">
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
                    </section>

                    <CharacterGuessRows guessList={guessList} animeList={animeList} />
                </div>
            </div>
        </TooltipProvider>
    );
}

export default CharacterEndlessPage;
