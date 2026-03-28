import { AutocompleteTextInput } from "@/components/AutoComplete";
import { ModeMenu } from "@/components/ModeMenu";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import useConfetti from "@/hooks/useConfetti.ts";
import type { CharacterGuessResultDTO } from "@/stores/animeStore";
import { useCharacterDifficultyStore } from "@/stores/characterDifficultyStore";
import { BookOpen, Settings } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useCharacterGuessingPageViewModel } from "./useCharacterGuessingPageViewModel";

const MYSTERY_IMAGE_MAX_BLUR_PX = 28;

function resolveGuessDisplay(
    guess: CharacterGuessResultDTO,
    animeList: { id: string; title: string; imageUrl: string }[],
) {
    const fromStore = animeList.find((a) => a.id === guess.guessedAnimeId);
    return {
        title: fromStore?.title ?? "",
        imageUrl: fromStore?.imageUrl ?? "",
    };
}

function hintAttributeLabel(t: (k: string) => string, key: string): string {
    if (key === "demographicType") {
        return t("guessTable.demographic");
    }
    if (key === "animeGenres") {
        return t("guessTable.genres");
    }
    if (key === "imageUrl") {
        return t("character.hintLabelImage");
    }
    return key;
}

function HintSpoilerBlock({
    useSpoiler,
    contentKey,
    empty,
    emptyLabel,
    tapLabel,
    children,
    align,
}: {
    useSpoiler: boolean;
    contentKey: string;
    empty: boolean;
    emptyLabel: string;
    tapLabel: string;
    children: ReactNode;
    align: "left" | "right";
}) {
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        setRevealed(false);
    }, [contentKey]);

    if (empty) {
        return (
            <div
                className={cn(
                    "flex min-h-[7rem] flex-col justify-center rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground",
                    align === "left" ? "text-left" : "text-right",
                )}
            >
                {emptyLabel}
            </div>
        );
    }

    if (!useSpoiler) {
        return (
            <div
                className={cn(
                    "min-h-[7rem] rounded-lg border border-border bg-muted/10 p-3 text-sm",
                    align === "left" ? "text-left" : "text-right",
                )}
            >
                {children}
            </div>
        );
    }

    if (!revealed) {
        return (
            <button
                type="button"
                onClick={() => setRevealed(true)}
                className={cn(
                    "flex min-h-[7rem] w-full flex-col items-center justify-center rounded-lg border border-dashed border-primary/40 bg-muted/30 p-3 text-center text-sm font-medium text-primary transition hover:bg-muted/50",
                )}
            >
                {tapLabel}
            </button>
        );
    }

    return (
        <div
            className={cn(
                "min-h-[7rem] rounded-lg border border-border bg-muted/10 p-3 text-sm",
                align === "left" ? "text-left" : "text-right",
            )}
        >
            {children}
        </div>
    );
}

function CharacterGuessingPage() {
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
    } = useCharacterGuessingPageViewModel();

    const useSpoilerOverlays = useCharacterDifficultyStore((s) => s.useSpoilerOverlays);
    const hardImageMode = useCharacterDifficultyStore((s) => s.hardImageMode);
    const setUseSpoilerOverlays = useCharacterDifficultyStore((s) => s.setUseSpoilerOverlays);
    const setHardImageMode = useCharacterDifficultyStore((s) => s.setHardImageMode);

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

    const hasDemographic =
        hints.demographicType != null && hints.demographicType !== "";
    const hasGenres = (hints.animeGenres?.length ?? 0) > 0;

    const demoKey = hasDemographic ? hints.demographicType! : "";
    const genresKey = hasGenres ? hints.animeGenres!.join(",") : "";

    const sortedTiers = hintConfig
        ? [...hintConfig.hintTiers].sort((a, b) => a.afterGuessCount - b.afterGuessCount)
        : [];

    const mysteryName = hintConfig?.mysteryCharacterName?.trim() ?? "";

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex min-h-svh w-full flex-col items-center justify-center flex-wrap">
                <div className="mt-24 w-full max-w-6xl rounded-xl border border-border bg-card p-4 text-card-foreground shadow-md">
                    <ModeMenu orientation="horizontal" />
                </div>
                <div className="mt-2 flex w-full max-w-6xl flex-col gap-8 rounded-xl border border-border bg-card p-8 text-card-foreground shadow-md">
                    <section className="flex flex-col gap-4 border-b border-border pb-6">
                        <h2 className="text-center text-lg font-semibold text-primary">{t("character.hintsTitle")}</h2>

                        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3 md:gap-6">
                            <div className="order-2 flex flex-col gap-2 md:order-1 justify-between h-full">
                                <div>
                                    <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-left">
                                        {t("guessTable.demographic")}
                                    </p>
                                    <HintSpoilerBlock
                                        useSpoiler={spoilerModeForHints}
                                        contentKey={demoKey}
                                        empty={!hasDemographic}
                                        emptyLabel={t("character.hintSlotEmpty")}
                                        tapLabel={t("character.spoilerTap")}
                                        align="left"
                                    >
                                        {hasDemographic ? <span className="text-base text-foreground">{hints.demographicType}</span> : null}
                                </HintSpoilerBlock>
                                </div>

                                <div className="mt-2">
                                    {hintConfig ? (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full gap-2 md:w-auto"
                                                >
                                                    <BookOpen className="size-4" />
                                                    {t("character.scheduleCardTitle")}
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                                                <DialogHeader>
                                                    <DialogTitle>{t("character.scheduleCardTitle")}</DialogTitle>
                                                    <DialogDescription>{t("character.hintScheduleTitle")}</DialogDescription>
                                                </DialogHeader>
                                                <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                                                    <li>
                                                        {t("character.hintImageBlurSchedule", {
                                                            count: hintConfig.imageBlur.totalGuessesUntilClear,
                                                        })}
                                                    </li>
                                                    {sortedTiers.map((tier) => (
                                                        <li key={tier.afterGuessCount + tier.revealAttributes.join(",")}>
                                                            {t("character.hintAttributeAt", {
                                                                labels: tier.revealAttributes
                                                                    .map((k) => hintAttributeLabel(t, k))
                                                                    .join(t("character.hintAttributeJoin")),
                                                                turn: tier.afterGuessCount,
                                                            })}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </DialogContent>
                                        </Dialog>
                                    ) : (
                                        <p className="text-left text-xs text-muted-foreground">{t("common.loading")}</p>
                                    )}
                                </div>
                            </div>

                            <div className="order-1 flex flex-col items-center gap-2 md:order-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t("character.mysteryImageLabel")}
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

                            <div className="order-3 flex flex-col gap-2 justify-between h-full">
                                <div>
                                    <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-right">
                                        {t("guessTable.genres")}
                                    </p>
                                    <HintSpoilerBlock
                                        useSpoiler={spoilerModeForHints}
                                        contentKey={genresKey}
                                        empty={!hasGenres}
                                        emptyLabel={t("character.hintSlotEmpty")}
                                        tapLabel={t("character.spoilerTap")}
                                        align="right"
                                    >
                                        {hasGenres ? (
                                            <div className="flex flex-wrap justify-end gap-2">
                                                {hints.animeGenres!.map((g) => (
                                                    <span
                                                        key={g}
                                                        className="rounded-md border border-border bg-muted px-2 py-0.5 text-sm"
                                                    >
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
                                                {t("character.difficultySettings")}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{t("character.difficultySettings")}</DialogTitle>
                                                <DialogDescription>{t("character.difficultySettingsDesc")}</DialogDescription>
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
                                                        <span className="font-medium">{t("character.settingSpoilersTitle")}</span>
                                                        <span className="block text-sm text-muted-foreground">
                                                            {t("character.settingSpoilersDesc")}
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
                                                        <span className="font-medium">{t("character.settingHardImageTitle")}</span>
                                                        <span className="block text-sm text-muted-foreground">
                                                            {t("character.settingHardImageDesc")}
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

                    <section className="flex flex-col items-center gap-3 border-b border-border pb-6">
                        {mysteryName ? (
                            <div className="text-center">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t("character.dailyNameLabel")}
                                </p>
                                <p className="mt-1 text-2xl font-bold text-primary">{mysteryName}</p>
                            </div>
                        ) : null}
                    </section>

                    <section className="flex flex-col items-center gap-4">
                        {foundAnime ? (
                            <div className="max-w-lg text-center">
                                <h2 className="text-2xl font-semibold text-primary">
                                    {t("home.congratulations")}
                                </h2>
                                <p className="mt-2 text-xl font-bold">{foundAnime.title}</p>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-primary">{t("character.guessTitle")}</h1>
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

                    {guessList.length > 0 && (
                        <section className="flex flex-col gap-3 border-t border-border pt-6">
                            <ul className="flex flex-col gap-3">
                                {guessList.map((guess) => {
                                    const { title, imageUrl } = resolveGuessDisplay(guess, animeList);
                                    return (
                                        <li
                                            key={`${guess.guessedAnimeId}-${guess.guessNumber}`}
                                            className={`flex flex-row items-center gap-3 rounded-lg border border-border px-3 py-2 ${
                                                guess.isCorrect
                                                    ? "bg-green-600/20 text-foreground"
                                                    : "bg-red-600/20 text-foreground"
                                            }`}
                                        >
                                            <img
                                                src={imageUrl}
                                                alt=""
                                                className="h-14 w-12 shrink-0 rounded-md object-cover"
                                            />
                                            <span className="text-lg font-medium">{title}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}

export default CharacterGuessingPage;
