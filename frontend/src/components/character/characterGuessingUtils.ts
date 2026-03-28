import type { CharacterGuessResultDTO } from "@/stores/animeStore";

export const MYSTERY_IMAGE_MAX_BLUR_PX = 28;

export function resolveGuessDisplay(
    guess: CharacterGuessResultDTO,
    animeList: { id: string; title: string; imageUrl: string }[],
) {
    const fromStore = animeList.find((a) => a.id === guess.guessedAnimeId);
    return {
        title: fromStore?.title ?? "",
        imageUrl: fromStore?.imageUrl ?? "",
    };
}

/** Palier minimal qui révèle cet attribut (ex. demographicType, animeGenres). */
export function afterGuessCountForAttribute(
    tiers: { afterGuessCount: number; revealAttributes: string[] }[],
    attr: string,
): number | null {
    const tier = tiers.find((x) => x.revealAttributes.includes(attr));
    return tier?.afterGuessCount ?? null;
}

/** Essais restants avant la révélation (décroit à chaque essai). */
export function guessesRemainingUntilUnlock(
    unlockAt: number | null,
    completedGuesses: number,
): number | null {
    if (unlockAt == null) {
        return null;
    }
    return Math.max(0, unlockAt - completedGuesses);
}

export function hintAttributeLabel(t: (k: string) => string, key: string): string {
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
