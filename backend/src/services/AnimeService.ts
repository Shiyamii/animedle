import { AnimeEntity, AnimeRepository } from "./AnimeRepositories";
import { CurrentAnimeRepository } from "./CurrentAnimeRepositories";

export interface AnimeItemDTO {
    id: string;
    title: string;
    alias: string[];
    imageUrl: string;
}

export interface AnimeDetailsDTO {
    id: string;
    alias: string[];
    title: string;
    demographic_type: string;
    episodes: number;
    season_start: string;
    studio: string;
    source: string;
    score: number;
    genres: string[];
    anime_format: string;
    imageUrl: string;
}

export interface GuessResultDTO {
    isCorrect: boolean;
    results : {
        demographicType: {
            isCorrect: boolean;
        },
        episodes: {
            isCorrect: boolean;
            isHigher: boolean | null;
        },
        seasonStart: {
            isCorrect: boolean;
            isEarlier: boolean | null;
        },
        studio: {
            isCorrect: boolean;
        },
        source: {
            isCorrect: boolean;
        },
        score: {
            isCorrect: boolean;
            isHigher: boolean | null;
        },
        genres: {
            isCorrect: boolean;
            isPartiallyCorrect: boolean;
        },
        animeFormat: {
            isCorrect: boolean;
        }
    }, 
    anime: AnimeDetailsDTO;
}


export class AnimeService {
    private static instance: AnimeService;

    private repository: AnimeRepository;
    private currentAnimeRepository: CurrentAnimeRepository;

    constructor() {
        this.repository = new AnimeRepository();
        this.currentAnimeRepository = new CurrentAnimeRepository();
    }

    public static getInstance(): AnimeService {
        if (!AnimeService.instance) {
            AnimeService.instance = new AnimeService();
        }
        return AnimeService.instance;
    }

    async getAnimeList(): Promise<AnimeItemDTO[]> {
        const entities = await this.repository.findAll();
        return entities.map(entity => this.toItemDTO(entity));
    }

    async getAnimeById(id: string): Promise<AnimeDetailsDTO | null> {
        const entity = await this.repository.findById(id);
        if (!entity) return null;
        return this.toDetailsDTO(entity);
    }

    private getMainTitle(entity: AnimeEntity): string {
        return entity.titles.find(t => t.type === "Default")?.title
            ?? entity.titles[0]?.title
            ?? "";
    }

    private getAliases(entity: AnimeEntity): string[] {
        return entity.titles
            .filter(t => t.type !== "Default")
            .map(t => t.title);
    }

    private toItemDTO(entity: AnimeEntity): AnimeItemDTO {
        return {
            id: entity._id?.toHexString() ? entity._id.toHexString() : "",
            title: this.getMainTitle(entity),
            alias: this.getAliases(entity),
            imageUrl: entity.images_webp.image_url,
        };
    }

    private toDetailsDTO(entity: AnimeEntity): AnimeDetailsDTO {
        return {
            id: entity._id?.toHexString() ? entity._id.toHexString() : "",
            title: this.getMainTitle(entity),
            alias: this.getAliases(entity),
            imageUrl: entity.images_webp.large_image_url,
            demographic_type: entity.demographic_type,
            episodes: entity.episodes,
            season_start: entity.season_start,
            studio: entity.studio,
            source: entity.source,
            score: entity.score,
            genres: entity.genres,
            anime_format: entity.anime_format,
        };
    }

    /**
     * This fonction choses a random anime and set it's as today's goal anime. It should be called once a day, at midnight.
     */
    public async updateGoalAnime(): Promise<AnimeEntity> {
        const animes = await this.repository.findAll();
        if (animes.length === 0) {
            console.warn("No animes found in the database to update the goal anime.");
            throw new Error("No animes found to update the goal anime.");
        }
        const randomIndex = Math.floor(Math.random() * animes.length);
        const selectedAnime = animes[randomIndex];
        await this.currentAnimeRepository.saveCurrentAnime(selectedAnime);
        return selectedAnime;
    }

    /**
     * This function retrieves the current goal anime. If there is no current anime or if the current anime is outdated (not from today), it will call updateGoalAnime to set a new one and return it.
     * (This is to ensure that if the server/database was down at the time of the update, the goal anime will still be updated when the first user tries to access it after the downtime.)
     */
    private async getCurrentAnime(): Promise<AnimeEntity> {
        return this.currentAnimeRepository.getCurrentAnime().then(async(current) => {
            const today = new Date();
            let currentAnime = current?.anime;
            if (!current || current.date.toDateString() !== today.toDateString() || !currentAnime) {
                currentAnime = await this.updateGoalAnime();
            }
            return currentAnime;
        }).catch(err => {
            console.error("Failed to get the current anime:", err);
            return Promise.reject("Error retrieving current anime.");
        });
    }

    public async guessAnime(id: string): Promise<GuessResultDTO> {
        const currentAnime = await this.getCurrentAnime();
        const guessedAnime = await this.repository.findById(id);
        if (!currentAnime || !guessedAnime) {
            throw new Error("Current anime or guessed anime not found");
        }
        return this.compareAnimes(currentAnime, guessedAnime);
    }

    private compareAnimes(ref: AnimeEntity, test: AnimeEntity): GuessResultDTO {
        return {
            isCorrect: ref._id?.toHexString() === test._id?.toHexString(),
            results : {
                demographicType: {
                    isCorrect: ref.demographic_type === test.demographic_type
                },
                episodes: {
                    isCorrect: ref.episodes === test.episodes,
                    isHigher: ref.episodes < test.episodes ? true : null
                },
                seasonStart: {
                    isCorrect: ref.season_start === test.season_start,
                    isEarlier: ref.season_start > test.season_start ? true : null
                },
                studio: {
                    isCorrect: ref.studio === test.studio
                },
                source: {
                    isCorrect: ref.source === test.source
                },
                score: {
                    isCorrect: ref.score === test.score,
                    isHigher: ref.score < test.score ? true : null
                },
                genres: {
                    isCorrect: ref.genres.every(g => test.genres.includes(g)),
                    isPartiallyCorrect: ref.genres.some(g => test.genres.includes(g))
                },
                animeFormat: {
                    isCorrect: ref.anime_format === test.anime_format
                }
            },
            anime: this.toDetailsDTO(test)
        };
    }

}
