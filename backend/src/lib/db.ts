import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

const client = new MongoClient(process.env.MONGODB_URL ?? 'mongodb://localhost:27017/animedle');

export const db = client.db();

const mongooseConnectionPromise: Promise<typeof mongoose> = mongoose.connect(
  process.env.MONGODB_URL ?? 'mongodb://localhost:27017/animedle',
);

export async function ensureMongooseConnection(): Promise<void> {
  await mongooseConnectionPromise;
}
