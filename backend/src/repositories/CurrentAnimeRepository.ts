/** biome-ignore-all lint/style/useNamingConvention: TKT C FINE */
import mongoose, { type Model, Schema, Types } from 'mongoose';
import { ensureMongooseConnection } from '@/lib/db';
import type { AnimeEntity } from './AnimeRepository';

export interface CurrentAnimeEntity {
  _id?: Types.ObjectId;
  anime: AnimeEntity;
  date: Date;
  guesses: Record<string, number>;
  totalWins: number;
  winDistribution: Record<string, number>;
}

export interface AnimeStatsDTO {
  animeId: string;
  date: Date;
  guesses: Record<string, number>;
  totalWins: number;
  winDistribution: Record<string, number>;
}

const CurrentAnimeSchema = new Schema<CurrentAnimeEntity>(
  {
    anime: {
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
      score: { type: Number, default: null },
    },
    date: { type: Date, required: true },
    guesses: { type: Schema.Types.Mixed, default: {} },
    totalWins: { type: Number, default: 0 },
    winDistribution: { type: Schema.Types.Mixed, default: {} },
  },
  {
    versionKey: false,
    collection: 'current_animes',
  },
);

const CurrentAnimeModel: Model<CurrentAnimeEntity> =
  (mongoose.models.CurrentAnime as Model<CurrentAnimeEntity> | undefined) ??
  mongoose.model<CurrentAnimeEntity>('CurrentAnime', CurrentAnimeSchema);

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

  async recordGuess(animeId: string): Promise<void> {
    await ensureMongooseConnection();
    await this.model.findOneAndUpdate({}, { $inc: { [`guesses.${animeId}`]: 1 } }, { sort: { date: -1 } }).exec();
  }

  async recordWin(guessNumber: number): Promise<void> {
    await ensureMongooseConnection();
    await this.model
      .findOneAndUpdate({}, { $inc: { totalWins: 1, [`winDistribution.${guessNumber}`]: 1 } }, { sort: { date: -1 } })
      .exec();
  }

  async getAllHistory(): Promise<CurrentAnimeEntity[]> {
    await ensureMongooseConnection();
    return this.model.find({}).sort({ date: -1 }).lean<CurrentAnimeEntity[]>().exec();
  }

  async getStatsByAnimeIds(animeIds: string[]): Promise<AnimeStatsDTO[]> {
    await ensureMongooseConnection();
    const objectIds = animeIds.map((id) => new Types.ObjectId(id));
    const docs = await this.model
      .find({ 'anime._id': { $in: objectIds } })
      .lean<CurrentAnimeEntity[]>()
      .exec();
    return docs.map((doc) => ({
      animeId: doc.anime._id?.toHexString() ?? '',
      date: doc.date,
      guesses: doc.guesses ?? {},
      totalWins: doc.totalWins ?? 0,
      winDistribution: doc.winDistribution ?? {},
    }));
  }
}
