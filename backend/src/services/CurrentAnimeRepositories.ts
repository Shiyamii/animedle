import { ensureMongooseConnection } from "@/lib/db";
import mongoose, { Model, Schema, Types } from "mongoose";
import { AnimeEntity } from "./AnimeRepositories";



export interface CurrentAnimeEntity{
  _id?: Types.ObjectId;
  anime: AnimeEntity;
  date: Date;
}


const CurrentAnimeSchema = new Schema<CurrentAnimeEntity>(
  {
    anime : {
      _id: { type: Schema.Types.ObjectId, required: false },
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
    date: { type: Date, required: true }
  },
  {
    versionKey: false,
    collection: "current_animes",
  },
);

const CurrentAnimeModel: Model<CurrentAnimeEntity> =
(mongoose.models.CurrentAnime as Model<CurrentAnimeEntity> | undefined) ??
mongoose.model<CurrentAnimeEntity>("CurrentAnime", CurrentAnimeSchema);



export class CurrentAnimeRepository {
  private model: Model<CurrentAnimeEntity>;

  constructor() {
      this.model = CurrentAnimeModel;
  }

  async saveCurrentAnime(anime: AnimeEntity): Promise<void> {
    await ensureMongooseConnection();
    const currentAnime = new this.model({
        anime,
        date: new Date(),
    });
    await currentAnime.save();
  }

  async getCurrentAnime(): Promise<CurrentAnimeEntity | null> {
    await ensureMongooseConnection();
    return this.model.findOne({}).sort({ date: -1 }).lean<CurrentAnimeEntity>().exec();
  }

  async deleteCurrentAnime(): Promise<void> {
    await ensureMongooseConnection();
    await this.model.deleteMany({});
  }

}