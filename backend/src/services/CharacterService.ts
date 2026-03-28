import { CharacterEntity, CharacterRepository } from "./CharacterRepository";
import { CurrentCharacterRepository } from "./CurrentCharacterRepositories";
import { AnimeDetailsDTO, AnimeService } from "./AnimeService";

/** Attributs du personnage du jour pouvant être révélés comme indices (ordre / paliers configurables via `hintTiers`). */
export type DailyCharacterHintKey = "imageUrl" | "demographicType" | "animeGenres";

export interface DailyCharacterHintTier {
    /** À partir de ce numéro de tentative (inclus), les attributs listés sont ajoutés à `hints`. */
    afterGuessCount: number;
    revealAttributes: DailyCharacterHintKey[];
}

export interface DailyCharacterHintsDTO {
    imageUrl?: string;
    demographicType?: string | null;
    animeGenres?: string[];
}

export interface DailyCharacterItemDTO {
    id: string;
    /** Même valeur que pour `POST .../daily/guess/:id` (devinette par anime). */
    animeId: string;
    name: string;
    animeTitle: string;
    imageUrl: string;
}

export interface DailyCharacterDetailsDTO {
    id: string;
    name: string;
    animeId: string;
    animeTitle: string;
    animeAlias: string[];
    animeGenres: string[];
    demographicType: string | null;
    imageUrl: string;
}

export interface DailyCharacterGuessResultDTO {
    isCorrect: boolean;
    guessNumber: number;
    /** Indices débloqués selon `guessNumber` et `hintTiers` (personnage mystère = `getCurrentCharacter`). */
    hints: DailyCharacterHintsDTO;
}

export class CharacterService {
    private static instance: CharacterService;

    /** Paliers par défaut : après 4 essais → image ; 5 essais de plus → démographie ; 3 de plus → genres. */
    public static readonly DEFAULT_HINT_TIERS: DailyCharacterHintTier[] = [
        { afterGuessCount: 4, revealAttributes: ["imageUrl"] },
        { afterGuessCount: 9, revealAttributes: ["demographicType"] },
        { afterGuessCount: 12, revealAttributes: ["animeGenres"] },
    ];

    private repository: CharacterRepository;
    private currentCharacterRepository: CurrentCharacterRepository;
    private animeService: AnimeService;

    /**
     * Paliers d’indices (modifiable à l’exécution : remplacer le tableau ou muter `afterGuessCount` / `revealAttributes`).
     */
    public hintTiers: DailyCharacterHintTier[];

    constructor() {
        this.repository = new CharacterRepository();
        this.currentCharacterRepository = new CurrentCharacterRepository();
        this.animeService = AnimeService.getInstance();
        this.hintTiers = [...CharacterService.DEFAULT_HINT_TIERS];
    }

    public static getInstance(): CharacterService {
        if (!CharacterService.instance) {
            CharacterService.instance = new CharacterService();
        }
        return CharacterService.instance;
    }

    private getCharacterMainAnimeTitle(entity: CharacterEntity): string {
        return entity.anime_titles.find((title) => title.type === "Default")?.title
            ?? entity.anime_titles[0]?.title
            ?? "";
    }

    private getCharacterAnimeAliases(entity: CharacterEntity): string[] {
        return entity.anime_titles
            .filter((title) => title.type !== "Default")
            .map((title) => title.title);
    }

    private getCharacterImageUrl(entity: CharacterEntity): string {
        if (typeof entity.images_webp === "object" && entity.images_webp !== null && "image_url" in entity.images_webp) {
            const imageUrl = (entity.images_webp as { image_url?: unknown }).image_url;
            return typeof imageUrl === "string" ? imageUrl : "";
        }
        return "";
    }

    private toDailyCharacterItemDTO(entity: CharacterEntity): DailyCharacterItemDTO {
        return {
            id: entity._id?.toHexString() ?? "",
            animeId: entity.anime_id,
            name: entity.name,
            animeTitle: this.getCharacterMainAnimeTitle(entity),
            imageUrl: this.getCharacterImageUrl(entity),
        };
    }

    private toDailyCharacterDetailsDTO(entity: CharacterEntity): DailyCharacterDetailsDTO {
        return {
            id: entity._id?.toHexString() ?? "",
            name: entity.name,
            animeId: entity.anime_id,
            animeTitle: this.getCharacterMainAnimeTitle(entity),
            animeAlias: this.getCharacterAnimeAliases(entity),
            animeGenres: entity.anime_genres,
            demographicType: entity.demographic_type,
            imageUrl: this.getCharacterImageUrl(entity),
        };
    }

    private mapAnimeDetailsToDailyCharacterDetailsDTO(anime: AnimeDetailsDTO): DailyCharacterDetailsDTO {
        return {
            id: "",
            name: "",
            animeId: anime.id,
            animeTitle: anime.title,
            animeAlias: anime.alias,
            animeGenres: anime.genres,
            demographicType: anime.demographic_type || null,
            imageUrl: anime.imageUrl,
        };
    }

    private buildHintsForGuess(ref: CharacterEntity, guessNumber: number): DailyCharacterHintsDTO {
        const hints: DailyCharacterHintsDTO = {};
        for (const tier of this.hintTiers) {
            if (guessNumber < tier.afterGuessCount) {
                continue;
            }
            for (const key of tier.revealAttributes) {
                if (key === "imageUrl") {
                    hints.imageUrl = this.getCharacterImageUrl(ref);
                } else if (key === "demographicType") {
                    hints.demographicType = ref.demographic_type;
                } else if (key === "animeGenres") {
                    hints.animeGenres = [...ref.anime_genres];
                }
            }
        }
        return hints;
    }

    public async getDailyCharacters(): Promise<DailyCharacterItemDTO[]> {
        const characters = await this.repository.findAll();
        return characters.map((character) => this.toDailyCharacterItemDTO(character));
    }

    private async generateRandomCharacter(): Promise<CharacterEntity> {
        const characters = await this.repository.findAll();
        if (characters.length === 0) {
            console.warn("No characters found in the database to update the goal character.");
            throw new Error("No characters found to update the goal character.");
        }
        const randomIndex = Math.floor(Math.random() * characters.length);
        return characters[randomIndex];
    }

    public async updateGoalCharacter(): Promise<CharacterEntity> {
        const selectedCharacter = await this.generateRandomCharacter();
        await this.currentCharacterRepository.saveCurrentCharacter(selectedCharacter);
        return selectedCharacter;
    }

    private async getCurrentCharacter(): Promise<CharacterEntity> {
        return this.currentCharacterRepository.getCurrentCharacter().then(async (current) => {
            const today = new Date();
            let currentCharacter = current?.character;
            if (!current || current.date.toDateString() !== today.toDateString() || !currentCharacter) {
                currentCharacter = await this.updateGoalCharacter();
            }
            return currentCharacter;
        }).catch((err) => {
            console.error("Failed to get the current character:", err);
            return Promise.reject("Error retrieving current character.");
        });
    }

    private buildGuessResult(
        ref: CharacterEntity,
        guessedAnimeId: string,
        guessNumber: number,
    ): DailyCharacterGuessResultDTO {
        const animeMatch = ref.anime_id === guessedAnimeId;
        return {
            isCorrect: animeMatch,
            guessNumber,
            hints: this.buildHintsForGuess(ref, guessNumber),
        };
    }

    /**
     * @param animeId Identifiant de l’anime proposé (même champ que `anime_id` côté personnage / liste d’animes).
     */
    public async guessDailyCharacter(animeId: string, guessNumber: number): Promise<DailyCharacterGuessResultDTO> {
        const currentCharacter = await this.getCurrentCharacter();
        if (!currentCharacter) {
            throw new Error("Current character or guessed character not found");
        }

        const result = this.buildGuessResult(currentCharacter, animeId, guessNumber);
        await this.currentCharacterRepository.recordGuess(animeId);
        if (result.isCorrect) {
            await this.currentCharacterRepository.recordWin(guessNumber);
        }
        return result;
    }
}