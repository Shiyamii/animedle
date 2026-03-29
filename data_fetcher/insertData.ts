import fs from 'fs';
import mongoose, { Schema } from 'mongoose';

type Anime = {
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

type CharacterFromJson = {
  images_webp: unknown;
  name: string;
};

type CharacterJson = {
  [key: string]: CharacterFromJson;
};

type Character = {
  images_webp: unknown;
  name: string;
  anime_id: string;
  anime_titles: JikanTitle[];
  anime_genres: string[];
  demographic_type: string | null;
};

type JikanTitle = {
  type: string;
  title: string;
};

const AnimeSchema = new Schema<Anime>(
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
  },
  {
    versionKey: false,
  },
);

const CharacterSchema = new Schema<Character>(
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
  },
);

const AnimeModel = mongoose.models.Anime || mongoose.model<Anime>('Anime', AnimeSchema);

const CharacterModel = mongoose.models.Character || mongoose.model<Character>('Character', CharacterSchema);

const DEFAULT_MONGO_URI = 'mongodb://admin:adminpassword@localhost:27017/animedle?authSource=admin';

const FORCE_DELETE_AND_RECREATE = true; // Mettre à true pour forcer la suppression et la recréation de la collection

async function isDatabaseEmpty(): Promise<boolean> {
  const count = await AnimeModel.countDocuments();
  return count === 0;
}

// Insert an anime into MongoDB and return the inserted document's ID
async function addMangaAnimeToMongo(anime: Anime): Promise<string> {
  const newAnime = new AnimeModel(anime);
  await newAnime.save();
  return newAnime._id.toString();
}

async function insertMangaWithCharacter(anime: Anime, character: CharacterFromJson): Promise<void> {
  const animeId = await addMangaAnimeToMongo(anime);
  const characterDoc = new CharacterModel({
    ...character,
    anime_id: animeId,
    anime_titles: anime.titles,
    anime_genres: anime.genres,
    demographic_type: anime.demographic_type,
  });
  await characterDoc.save();
}

async function saveAnimeToMongo(animes: Anime[], characters: CharacterJson) {
  const mongoUri = process.env.MONGO_URI ?? DEFAULT_MONGO_URI;
  const forceDelete = process.env.FORCE_DELETE_AND_RECREATE || FORCE_DELETE_AND_RECREATE;

  await mongoose.connect(mongoUri);
  const isEmpty = await isDatabaseEmpty();
  if (isEmpty || forceDelete) {
    await AnimeModel.deleteMany({});
    await CharacterModel.deleteMany({});
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropCollection('current_animes').catch(() => {});
    }
    for (const anime of animes) {
      if (!anime.mal_id) {
        continue;
      }
      const character = characters[anime.mal_id];
      if (character) {
        await insertMangaWithCharacter(anime, character);
      }
    }
  } else {
  }
  await mongoose.disconnect();
}

function replaceDateBySeasonDate(anime: Anime): Anime {
  if (!anime.season_start) {
    return anime;
  }
  const date = new Date(anime.season_start);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  let season: string;
  if (month >= 3 && month <= 5) {
    season = 'Spring';
  } else if (month >= 6 && month <= 8) {
    season = 'Summer';
  } else if (month >= 9 && month <= 11) {
    season = 'Fall';
  } else {
    season = 'Winter';
  }
  return { ...anime, season_start: `${season} ${year}` };
}

//fecth file "filtered_data.json" and insert it to mongoDB
async function insertFilteredDataToMongo() {
  const rawDataAnime = fs.readFileSync('filtered_data.json', 'utf-8');
  const rawDataCharacter = fs.readFileSync('filtered_characters.json', 'utf-8');
  const filtered: Anime[] = JSON.parse(rawDataAnime);
  const filteredWithSeasonDate = filtered.map(replaceDateBySeasonDate);
  const characters: CharacterJson = JSON.parse(rawDataCharacter);
  await saveAnimeToMongo(filteredWithSeasonDate, characters);
}

insertFilteredDataToMongo().catch((_error) => {
  process.exitCode = 1;
});
