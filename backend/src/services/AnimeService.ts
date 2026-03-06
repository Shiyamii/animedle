import { AnimeEntity, AnimeRepository } from "./AnimeRepositories";

export interface AnimeItemDTO {
    id: number;
    title: string;
    alias: string[];
    imageUrl: string;
}

export interface AnimeDetailsDTO {
    id: number;
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


export class AnimeService {
    private repository: AnimeRepository;

    constructor() {
        this.repository = new AnimeRepository();
    }

    async getAnimeList(): Promise<AnimeItemDTO[]> {
        const entities = await this.repository.findAll();
        return entities.map(this.toItemDTO);
    }

    async getAnimeById(id: number): Promise<AnimeDetailsDTO | null> {
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
            id: entity.mal_id,
            title: this.getMainTitle(entity),
            alias: this.getAliases(entity),
            imageUrl: entity.images_webp.image_url,
        };
    }

    private toDetailsDTO(entity: AnimeEntity): AnimeDetailsDTO {
        return {
            id: entity.mal_id,
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

}
