import { AnimeEntity, AnimeImagesWebpEntity, AnimeTitleEntity, AnimeRepository } from "./AnimeRepositories";
import { AnimeStatsDTO, CurrentAnimeRepository } from "./CurrentAnimeRepositories";

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
    guessNumber: number;
}


export interface AdminStatsTodayDTO {
    anime: AdminAnimeDTO | null;
    date: string | null;
    totalGuesses: number;
    totalWins: number;
    winDistribution: Record<string, number>;
}

export interface AdminStatsGlobalDTO {
    totalDays: number;
    totalGuesses: number;
    totalWins: number;
    winDistribution: Record<string, number>;
}

export interface AdminStatsDTO {
    today: AdminStatsTodayDTO;
    global: AdminStatsGlobalDTO;
}

export interface AdminAnimeDTO {
    id: string;
    title: string;
    imageUrl: string;
    titles: AnimeTitleEntity[];
    anime_format: string;
    genres: string[];
    demographic_type: string;
    episodes: number;
    season_start: string;
    studio: string;
    source: string;
    score: number;
}

export interface CreateAdminAnimeDTO {
    imageUrl: string;
    titles: AnimeTitleEntity[];
    anime_format: string;
    genres: string[];
    demographic_type: string;
    episodes: number;
    season_start: string;
    studio: string;
    source: string;
    score: number;
}


export interface RandomAnimeDTO {
    id: string;
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

    private parseMALImageUrl(url: string): AnimeImagesWebpEntity {
        const match = url.match(/^(https?:\/\/(?:cdn\.)?myanimelist\.net\/images\/anime\/\d+\/\d+)/);
        if (!match) throw new Error('URL MAL invalide. Format attendu : https://cdn.myanimelist.net/images/anime/{dossier}/{id}');
        const base = match[1];
        return {
            image_url: `${base}.webp`,
            small_image_url: `${base}s.webp`,
            large_image_url: `${base}l.webp`,
        };
    }

    private toAdminDTO(entity: AnimeEntity): AdminAnimeDTO {
        return {
            id: entity._id?.toHexString() ?? "",
            title: this.getMainTitle(entity),
            imageUrl: entity.images_webp.image_url,
            titles: entity.titles,
            anime_format: entity.anime_format,
            genres: entity.genres,
            demographic_type: entity.demographic_type,
            episodes: entity.episodes,
            season_start: entity.season_start,
            studio: entity.studio,
            source: entity.source,
            score: entity.score,
        };
    }

    async getAdminAnimeList(): Promise<AdminAnimeDTO[]> {
        const entities = await this.repository.findAll();
        return entities.map(entity => this.toAdminDTO(entity));
    }

    async getCurrentAnimeAdmin(): Promise<AdminAnimeDTO | null> {
        const current = await this.currentAnimeRepository.getCurrentAnime();
        if (!current?.anime) return null;
        return this.toAdminDTO(current.anime);
    }

    async createAnime(data: CreateAdminAnimeDTO): Promise<AdminAnimeDTO> {
        const images_webp = this.parseMALImageUrl(data.imageUrl);
        const entity = await this.repository.create({
            images_webp,
            titles: data.titles,
            anime_format: data.anime_format,
            genres: data.genres,
            demographic_type: data.demographic_type,
            episodes: data.episodes,
            season_start: data.season_start,
            studio: data.studio,
            source: data.source,
            score: data.score,
        });
        return this.toAdminDTO(entity);
    }

    async updateAnime(id: string, data: CreateAdminAnimeDTO): Promise<AdminAnimeDTO | null> {
        const images_webp = this.parseMALImageUrl(data.imageUrl);
        const entity = await this.repository.update(id, {
            images_webp,
            titles: data.titles,
            anime_format: data.anime_format,
            genres: data.genres,
            demographic_type: data.demographic_type,
            episodes: data.episodes,
            season_start: data.season_start,
            studio: data.studio,
            source: data.source,
            score: data.score,
        });
        if (!entity) return null;
        return this.toAdminDTO(entity);
    }

    async deleteAnime(id: string): Promise<boolean> {
        return this.repository.delete(id);
    }

    async setCurrentAnimeById(id: string): Promise<AdminAnimeDTO | null> {
        const entity = await this.repository.findById(id);
        if (!entity) return null;
        await this.currentAnimeRepository.saveCurrentAnime(entity);
        return this.toAdminDTO(entity);
    }

    async setCurrentAnimeRandom(): Promise<AdminAnimeDTO> {
        const entity = await this.updateGoalAnime();
        return this.toAdminDTO(entity);
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

    public async getRandomAnime(): Promise<RandomAnimeDTO> {
        const selectedAnime = await this.generateRandomAnime();
        return { id: selectedAnime._id?.toHexString() ?? "" };
    }

    private async generateRandomAnime(): Promise<AnimeEntity> {
        const animes = await this.repository.findAll();
        if (animes.length === 0) {
            console.warn("No animes found in the database to update the goal anime.");
            throw new Error("No animes found to update the goal anime.");
        }
        const randomIndex = Math.floor(Math.random() * animes.length);
        const selectedAnime = animes[randomIndex];
        return selectedAnime;
    }

    /**
     * This fonction choses a random anime and set it's as today's goal anime. It should be called once a day, at midnight.
     */
    public async updateGoalAnime(): Promise<AnimeEntity> {
        const selectedAnime = await this.generateRandomAnime();
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

    public async guessAnime(id: string, guessNumber: number): Promise<GuessResultDTO> {
        const currentAnime = await this.getCurrentAnime();
        const guessedAnime = await this.repository.findById(id);
        if (!currentAnime || !guessedAnime) {
            throw new Error("Current anime or guessed anime not found");
        }
        const result = this.compareAnimes(currentAnime, guessedAnime, guessNumber);
        await this.currentAnimeRepository.recordGuess(id);
        if (result.isCorrect) {
            await this.currentAnimeRepository.recordWin(guessNumber);
        }
        return result;
    }

    public async getAnimeStats(animeIds: string[]): Promise<AnimeStatsDTO[]> {
        return this.currentAnimeRepository.getStatsByAnimeIds(animeIds);
    }

    public async getAdminStats(): Promise<AdminStatsDTO> {
        const history = await this.currentAnimeRepository.getAllHistory();
        const today = history[0] ?? null;
        const todayTotalGuesses = today
            ? Object.values(today.guesses ?? {}).reduce((a, b) => a + b, 0)
            : 0;

        let globalTotalGuesses = 0;
        let globalTotalWins = 0;
        const globalWinDist: Record<string, number> = {};

        for (const doc of history) {
            globalTotalGuesses += Object.values(doc.guesses ?? {}).reduce((a, b) => a + b, 0);
            globalTotalWins += doc.totalWins ?? 0;
            for (const [k, v] of Object.entries(doc.winDistribution ?? {})) {
                globalWinDist[k] = (globalWinDist[k] ?? 0) + (v as number);
            }
        }

        return {
            today: {
                anime: today?.anime ? this.toAdminDTO(today.anime as AnimeEntity) : null,
                date: today?.date?.toISOString() ?? null,
                totalGuesses: todayTotalGuesses,
                totalWins: today?.totalWins ?? 0,
                winDistribution: today?.winDistribution ?? {},
            },
            global: {
                totalDays: history.length,
                totalGuesses: globalTotalGuesses,
                totalWins: globalTotalWins,
                winDistribution: globalWinDist,
            },
        };
    }

    public async getCurrentAnimeDate(): Promise<string | null> {
        await this.getCurrentAnime(); // déclenche le reset quotidien si nécessaire
        const current = await this.currentAnimeRepository.getCurrentAnime();
        return current?.date?.toISOString() ?? null;
    }

    public async guessAnimeEndless(id: string, guessNumber: number, refAnimeId: string): Promise<GuessResultDTO> {
        const refAnime = await this.repository.findById(refAnimeId);
        const guessedAnime = await this.repository.findById(id);   
        if (!refAnime || !guessedAnime) {
            throw new Error("Reference anime or guessed anime not found");
        }
        return this.compareAnimes(refAnime, guessedAnime, guessNumber);
    }

    // Compare two dates in "Season Year" format (e.g., "Spring 2023")
    private compareDates(date1: string, date2: string): number {
        const [season1, year1] = date1.split(" ");
        const [season2, year2] = date2.split(" ");
        const seasonOrder = ["Winter", "Spring", "Summer", "Fall"];
        if (year1 !== year2) {
            return parseInt(year1) - parseInt(year2);
        }
        return seasonOrder.indexOf(season1) - seasonOrder.indexOf(season2);
    }

    private compareGenreLists(genres1: string[], genres2: string[]): { isCorrect: boolean; isPartiallyCorrect: boolean } {
        const isCorrect = genres1.every(g => genres2.includes(g)) && genres1.length === genres2.length;
        const isPartiallyCorrect = genres1.some(g => genres2.includes(g)) && !isCorrect;
        return { isCorrect, isPartiallyCorrect };
    }

    private compareAnimes(ref: AnimeEntity, test: AnimeEntity, guessNumber: number): GuessResultDTO {
        return {
            isCorrect: ref._id?.toHexString() === test._id?.toHexString(),
            guessNumber: guessNumber,
            results : {
                demographicType: {
                    isCorrect: ref.demographic_type === test.demographic_type
                },
                episodes: {
                    isCorrect: ref.episodes === test.episodes,
                    isHigher: test.episodes < ref.episodes ? true : false
                },
                seasonStart: {
                    isCorrect: ref.season_start === test.season_start,
                    isEarlier: this.compareDates(test.season_start, ref.season_start) > 0 ? true : false
                },
                studio: {
                    isCorrect: ref.studio === test.studio
                },
                source: {
                    isCorrect: ref.source === test.source
                },
                score: {
                    isCorrect: ref.score === test.score,
                    isHigher: test.score < ref.score ? true : false
                },
                genres: {
                    ...this.compareGenreLists(ref.genres, test.genres)
                },
                animeFormat: {
                    isCorrect: ref.anime_format === test.anime_format
                }
            },
            anime: this.toDetailsDTO(test)
        };
    }

}
