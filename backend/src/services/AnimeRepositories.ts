import { Collection, ObjectId } from "mongodb";
import { db } from "@/lib/db";

export interface AnimeEntity {
    _id?: ObjectId;
    images_webp: AnimeImagesWebpEntity;
    anime_format: string;
    genres: string[];
    titles: AnimeTitleEntity[];
    demographic_type: string;
    episodes: number;
    season_start: string;
    studio: string;
    source: string;
    score: number;
}

export interface AnimeImagesWebpEntity {
    image_url: string;
    small_image_url: string;
    large_image_url: string;
}

export interface AnimeTitleEntity {
    type: string;
    title: string;
}

export class AnimeRepository {
    private collection: Collection<AnimeEntity>;

    constructor() {
        this.collection = db.collection<AnimeEntity>("animes");
    }

    async findAll(): Promise<AnimeEntity[]> {
        return this.collection.find({}).toArray();
    }

    async findById(malId: number): Promise<AnimeEntity | null> {
        return this.collection.findOne({ mal_id: malId });
    }
}
