import fetch from 'node-fetch';
import fs from 'fs';
import mongoose, { Schema } from 'mongoose';

type JikanTitle = {
  type: string;
  title: string;
};

type JikanAnime = {
  images: { webp: unknown };
  type: string | null;
  genres: Array<{ name: string }>;
  titles: JikanTitle[];
  demographics: Array<{ name: string }>;
  episodes: number | null;
  aired?: { from?: string | null };
  studios: Array<{ name: string }>;
  source: string | null;
  score: number | null;
};

type JikanResponse = {
  data: JikanAnime[];
  pagination?: {
    has_next_page?: boolean;
  };
};

type FilteredAnime = {
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

const TARGET_ANIME_COUNT = 200;
const PAGE_SIZE = 25;
const MAX_RETRIES = 5;
const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/animedle';

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
  },
  {
    versionKey: false,
  },
);

const FilteredAnimeModel =
  mongoose.models.FilteredAnime || mongoose.model<FilteredAnime>('FilteredAnime', filteredAnimeSchema);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAnimePage(page: number): Promise<JikanResponse> {
  const url = `https://api.jikan.moe/v4/anime?order_by=scored_by&limit=${PAGE_SIZE}&sort=desc&page=${page}`;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
    });

    if (response.ok) {
      return (await response.json()) as JikanResponse;
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`Erreur API Jikan (${response.status}) sur la page ${page}.`);
    }

    const waitMs = 1000 * attempt;
    console.log(`Page ${page}: API ${response.status}, nouvelle tentative dans ${waitMs}ms...`);
    await sleep(waitMs);
  }

  throw new Error(`Échec inattendu lors de la récupération de la page ${page}.`);
}

async function saveFilteredAnimeToMongo(filtered: FilteredAnime[]) {
  const mongoUri = process.env.MONGO_URI ?? DEFAULT_MONGO_URI;

  await mongoose.connect(mongoUri);
  await FilteredAnimeModel.deleteMany({});
  await FilteredAnimeModel.insertMany(filtered, { ordered: false });
  await mongoose.disconnect();

  console.log(`MongoDB: ${filtered.length} animes enregistrés.`);
}

async function fetchAndFilterAnimeData() {
  // Récupérer jusqu'à 200 animes via pagination
  const allAnime: JikanAnime[] = [];
  let page = 1;
  let hasNextPage = true;

  while (allAnime.length < TARGET_ANIME_COUNT && hasNextPage) {
    const pageData = await fetchAnimePage(page);
    allAnime.push(...pageData.data);
    hasNextPage = pageData.pagination?.has_next_page ?? false;
    page += 1;
  }

  // Filtrer les champs pour chaque anime
  const filtered: FilteredAnime[] = allAnime.slice(0, TARGET_ANIME_COUNT).map((anime) => ({
    images_webp: anime.images.webp,
    anime_format: anime.type,
    genres: anime.genres.map((genre) => genre.name),
    titles: anime.titles,
    demographic_type: anime.demographics[0]?.name ?? null,
    episodes: anime.episodes,
    season_start: anime.aired?.from ?? null,
    studio: anime.studios[0]?.name ?? null,
    source: anime.source,
    score: anime.score,
  }));

  fs.writeFileSync('filtered_data.json', JSON.stringify(filtered, null, 2), 'utf-8');
  await saveFilteredAnimeToMongo(filtered);
  console.log(`Filtrage terminé. ${filtered.length} animes enregistrés dans filtered_data.json.`);
}

fetchAndFilterAnimeData().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
