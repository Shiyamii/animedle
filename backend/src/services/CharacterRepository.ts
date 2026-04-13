/** biome-ignore-all lint/style/useNamingConvention: Tkt c fine */
import mongoose, { type Model, Schema, type Types } from 'mongoose';
import { ensureMongooseConnection } from '@/lib/db';
import type { AnimeTitleEntity } from './AnimeRepositories';

export interface CharacterEntity {
  _id?: Types.ObjectId;
  images_webp: unknown;
  name: string;
  anime_id: string;
  anime_titles: AnimeTitleEntity[];
  anime_genres: string[];
  demographic_type: string | null;
}

const CharacterSchema = new Schema<CharacterEntity>(
  {
    images_webp: { type: Schema.Types.Mixed, required: true },
    name: { type: String, required: true },
    anime_id: { type: String, required: true },
    anime_titles: {
      type: [
        {
          type: { type: String, required: true },
          title: { type: String, required: true },
        },
      ],
      required: true,
    },
    anime_genres: { type: [String], required: true },
    demographic_type: { type: String, default: null },
  },
  {
    versionKey: false,
    collection: 'characters',
  },
);

const CharacterModel: Model<CharacterEntity> =
  (mongoose.models.Character as Model<CharacterEntity> | undefined) ??
  mongoose.model<CharacterEntity>('Character', CharacterSchema);

export class CharacterRepository {
  private model: Model<CharacterEntity>;

  constructor() {
    this.model = CharacterModel;
  }

  async findAll(): Promise<CharacterEntity[]> {
    await ensureMongooseConnection();
    return this.model.find({}).lean<CharacterEntity[]>().exec();
  }

  async findById(id: string): Promise<CharacterEntity | null> {
    await ensureMongooseConnection();
    return this.model.findOne({ _id: id }).lean<CharacterEntity>().exec();
  }

  async findOneByAnimeId(animeId: string): Promise<CharacterEntity | null> {
    await ensureMongooseConnection();
    return this.model.findOne({ anime_id: animeId }).lean<CharacterEntity>().exec();
  }

  async create(data: Omit<CharacterEntity, '_id'>): Promise<CharacterEntity> {
    await ensureMongooseConnection();
    const character = new this.model(data);
    const saved = await character.save();
    return saved.toObject() as CharacterEntity;
  }

  async update(id: string, data: Partial<Omit<CharacterEntity, '_id'>>): Promise<CharacterEntity | null> {
    await ensureMongooseConnection();
    return this.model.findByIdAndUpdate(id, data, { new: true }).lean<CharacterEntity>().exec();
  }

  async delete(id: string): Promise<boolean> {
    await ensureMongooseConnection();
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }
}

export interface CurrentCharacterEntity {
  _id?: Types.ObjectId;
  character: CharacterEntity;
  date: Date;
  guesses: Record<string, number>;
  totalWins: number;
  winDistribution: Record<string, number>;
}
