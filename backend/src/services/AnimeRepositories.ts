import { ensureMongooseConnection } from "@/lib/db";
import mongoose, { Model, Schema, Types } from "mongoose";

export interface AnimeEntity {
  _id?: Types.ObjectId;
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

const AnimeSchema = new Schema<AnimeEntity>(
  {
    images_webp: { type: Schema.Types.Mixed, required: true },
    anime_format: { type: String, default: null },
    genres: { type: [String], required: true },
    titles: {
      type: [
        {
          type: { type: String, required: true },
          title: { type: String, required: true },
        },
      ],
      required: true,
    },
    demographic_type: { type: String, default: null },
    episodes: { type: Number, default: null },
    season_start: { type: String, default: null },
    studio: { type: String, default: null },
    source: { type: String, default: null },
    score: { type: Number, default: null }
  },
  {
    versionKey: false,
    collection: "animes",
  },
);

const AnimeModel: Model<AnimeEntity> =
(mongoose.models.Anime as Model<AnimeEntity> | undefined) ??
mongoose.model<AnimeEntity>("Anime", AnimeSchema);


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
    private model: Model<AnimeEntity>;

    constructor() {
        this.model = AnimeModel;
    }

    async findAll(): Promise<AnimeEntity[]> {
        await ensureMongooseConnection();
        return this.model.find({}).lean<AnimeEntity[]>().exec();
    }

    async findById(id: string): Promise<AnimeEntity | null> {
        await ensureMongooseConnection();
        return this.model.findOne({ _id: id }).lean<AnimeEntity>().exec();
    }
}
