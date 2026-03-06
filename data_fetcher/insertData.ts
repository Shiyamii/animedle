import mongoose, { Schema } from 'mongoose';
import fs from 'fs';

type FilteredAnime = {
  mal_id?: number;
  images_webp: unknown;
  anime_format: string | null;
  genres: string[];
  titles: JikanTitle[];
  demographic_type: string | null;
  episodes: number | null;
  season_start: string | null;
  studio: string | null;
  source: string | null;
  score: number | null;
};

type JikanTitle = {
  type: string;
  title: string;
};


const filteredAnimeSchema = new Schema<FilteredAnime>(
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
    score: { type: Number, default: null },
    mal_id: { type: Number, unique: true, sparse: true },
  },
  {
    versionKey: false,
  },
);

const FilteredAnimeModel =
  mongoose.models.FilteredAnime || mongoose.model<FilteredAnime>('FilteredAnime', filteredAnimeSchema);

const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/animedle';

async function saveFilteredAnimeToMongo(filtered: FilteredAnime[]) {
  const mongoUri = process.env.MONGO_URI ?? DEFAULT_MONGO_URI;

  await mongoose.connect(mongoUri);
  await FilteredAnimeModel.deleteMany({});
  await FilteredAnimeModel.insertMany(filtered, { ordered: false });
  await mongoose.disconnect();

  console.log(`MongoDB: ${filtered.length} animes enregistrés.`);
}

//fecth file "filtered_data.json" and insert it to mongoDB
async function insertFilteredDataToMongo() {
  const rawData = fs.readFileSync('filtered_data.json', 'utf-8');
  const filtered: FilteredAnime[] = JSON.parse(rawData);
  await saveFilteredAnimeToMongo(filtered);
  console.log(`Insertion terminée.`);
}

insertFilteredDataToMongo().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});