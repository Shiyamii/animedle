import { ensureMongooseConnection } from "@/lib/db";
import mongoose, { Model, Schema, Types } from "mongoose";
import { CharacterEntity } from "./CharacterRepository";

export interface CurrentCharacterEntity {
  _id?: Types.ObjectId;
  character: CharacterEntity;
  date: Date;
  guesses: Record<string, number>;
  totalWins: number;
  winDistribution: Record<string, number>;
}

const CurrentCharacterSchema = new Schema<CurrentCharacterEntity>(
  {
    character: {
      _id: { type: Schema.Types.ObjectId, required: false },
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
    date: { type: Date, required: true },
    guesses: { type: Schema.Types.Mixed, default: {} },
    totalWins: { type: Number, default: 0 },
    winDistribution: { type: Schema.Types.Mixed, default: {} },
  },
  {
    versionKey: false,
    collection: "current_characters",
  },
);

const CurrentCharacterModel: Model<CurrentCharacterEntity> =
  (mongoose.models.CurrentCharacter as Model<CurrentCharacterEntity> | undefined) ??
  mongoose.model<CurrentCharacterEntity>("CurrentCharacter", CurrentCharacterSchema);

export class CurrentCharacterRepository {
  private model: Model<CurrentCharacterEntity>;

  constructor() {
    this.model = CurrentCharacterModel;
  }

  async saveCurrentCharacter(character: CharacterEntity): Promise<void> {
    await ensureMongooseConnection();
    const currentCharacter = new this.model({
      character,
      date: new Date(),
    });
    await currentCharacter.save();
  }

  async getCurrentCharacter(): Promise<CurrentCharacterEntity | null> {
    await ensureMongooseConnection();
    return this.model.findOne({}).sort({ date: -1 }).lean<CurrentCharacterEntity>().exec();
  }

  async recordGuess(characterId: string): Promise<void> {
    await ensureMongooseConnection();
    await this.model.findOneAndUpdate(
      {},
      { $inc: { [`guesses.${characterId}`]: 1 } },
      { sort: { date: -1 } },
    ).exec();
  }

  async recordWin(guessNumber: number): Promise<void> {
    await ensureMongooseConnection();
    await this.model.findOneAndUpdate(
      {},
      { $inc: { totalWins: 1, [`winDistribution.${guessNumber}`]: 1 } },
      { sort: { date: -1 } },
    ).exec();
  }
}
