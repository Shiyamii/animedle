import fetch from 'node-fetch';
import fs from 'fs';
import mongoose, { Schema } from 'mongoose';
import { log } from 'console';

///////////////////////////
/// Types et Interfaces ///
///////////////////////////
type JikanTitle = {
  type: string;
  title: string;
};

type JikanAnime = {
  mal_id: number;
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

type JikanRelation = {
  relation: string;
  entry: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
};

type AnimeRelatedList = {
  first: number;
  relatedIds: number[];
}

type JikanResponse = {
};


type JikanAnimePaginatedResponse = JikanResponse & {
  data: JikanAnime[];
  pagination?: {
    has_next_page?: boolean;
  };
}


type JikanAnimeResponse = JikanResponse & {
  data: JikanAnime;
}


type JikanRelationsResponse = JikanResponse &{
  data: JikanRelation[];
};

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

///////////////////////////////////
// Constantes et Schéma Mongoose //
///////////////////////////////////

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
    mal_id: { type: Number, unique: true, sparse: true },
  },
  {
    versionKey: false,
  },
);

const FilteredAnimeModel =
  mongoose.models.FilteredAnime || mongoose.model<FilteredAnime>('FilteredAnime', filteredAnimeSchema);


const fetchedAnimeCache = new Map<number, JikanAnime>();

const visitedAnimeIds = new Set<number>();
const relationIdsToIgnore = new Set<number>([]);

/////////////////////////////
/// Fonctions Utilitaires ///
/////////////////////////////

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFromJikan<T extends JikanResponse>(url: string): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`Erreur API Jikan (${response.status}) sur la requete: ${url}`);
    }

    const waitMs = 1000 * attempt;
    // Log uniquement les tentatives de retry qui attendent plus d'une seconde pour éviter de surcharger les logs
    if(waitMs > 1000) 
      console.log(`API ${response.status}, nouvelle tentative dans ${waitMs}ms...`);
    await sleep(waitMs);
  }

  throw new Error(`Échec inattendu lors de la récupération de l'URL: ${url}`);
    
}

async function fetchAnimePage(page: number): Promise<JikanAnimePaginatedResponse> {
  const url = `https://api.jikan.moe/v4/anime?order_by=scored_by&limit=${PAGE_SIZE}&sort=desc&page=${page}`;
  return fetchFromJikan<JikanAnimePaginatedResponse>(url);
}

async function fetchAnimeRelations(id: number): Promise<JikanRelationsResponse> {
  const url = `https://api.jikan.moe/v4/anime/${id}/relations`;
  return fetchFromJikan<JikanRelationsResponse>(url);
}


async function fetchAnime(id: number): Promise<JikanAnime> {
  if (fetchedAnimeCache.has(id)) {
    return fetchedAnimeCache.get(id)!;
  }
  const url = `https://api.jikan.moe/v4/anime/${id}`;
  const response = await fetchFromJikan<JikanAnimeResponse>(url);
  fetchedAnimeCache.set(id, response.data);
  return response.data;
}

//////////////////////////
/// Logique Principale ///
//////////////////////////

/**
 * Récupère récursivement tous les saisons d'un anime donné en suivant les relations de type "Sequel" et "Prequel".
 * Utilise un ensemble "visited" pour éviter les boucles infinies en cas de relations circulaires.
 * @param id L'ID MAL de l'anime de départ
 * @param visited Un ensemble d'IDs déjà visités pour éviter les boucles
 * @param relation Le type de relation à suivre (par défaut "all", mais peut être "Sequel" ou "Prequel" pour filtrer)
 * @returns Un tableau d'IDs MAL de tous les animes liés selon les relations spécifiées, incluant l'anime de départ
 */
async function getAllRelationsOfAnime(id: number, visited = new Set<number>(), relation = "all"): Promise<AnimeRelatedList> {
  if (visited.has(id)) {
    return { first: id, relatedIds: [] };
  }
  
  const anime = await fetchAnime(id);
  if (anime.type === 'Movie') {
    return { first: id, relatedIds: [] };
  }
  visited.add(id);

  const relationsResponse = await fetchAnimeRelations(id);
  const relatedAnimes = relationsResponse.data;
  let allRelatedIds = [];
  let first = id;

  if (relation === "Prequel" || relation === "all") {
    const prequelIds = relatedAnimes.filter((rel) => rel.relation === 'Prequel').flatMap((rel) => rel.entry.filter((entry) => entry.type === 'anime' && !relationIdsToIgnore.has(entry.mal_id)).map((entry) => entry.mal_id));
    for (const prequelId of prequelIds) {
      if (visited.has(prequelId)) {
        continue;
      }
      const anime = await fetchAnime(prequelId);
      if (anime.type === 'Movie') {
        continue
      }
      const prequels = await getAllRelationsOfAnime(prequelId, visited, "Prequel");
      first = prequels.first;
      allRelatedIds.push(...prequels.relatedIds);
    }

  }
  if (relation === "Sequel" || relation === "all") {
    const sequelsIds = relatedAnimes.filter((rel) => rel.relation === 'Sequel').flatMap((rel) => rel.entry.filter((entry) => entry.type === 'anime' && !relationIdsToIgnore.has(entry.mal_id)).map((entry) => entry.mal_id));

    for (const sequelId of sequelsIds) {
      if (visited.has(sequelId)) {
        continue;
      }
      const anime = await fetchAnime(sequelId);
      if (anime.type === 'Movie') {
        continue
      }
      const subRelatedIds = (await getAllRelationsOfAnime(sequelId, visited, "Sequel")).relatedIds;
      allRelatedIds.push(...subRelatedIds);
    }
      
  }

  return { first: first, relatedIds: [id, ...allRelatedIds] };
}

/**
 * Récupère le nombre total d'épisodes d'un anime en sommant les épisodes de tous les animes liés en tant que "Sequel".
 * @param id  L'ID MAL de l'anime de départ
 * @returns Le nombre total d'épisodes ou null si l'information n'est pas disponible
 */
async function fetchAnimeEpisodes(id: number): Promise<number | null> {
  const animeData = await fetchAnime(id);
  return animeData.episodes;
}

async function getAnime(id: number): Promise<JikanAnime> {
  const mainEpisodes = 0;
  const allRelations = await getAllRelationsOfAnime(id, new Set<number>());

  // Ajouter les Id visité dans le set global pour éviter de les re-parcourir dans d'autres appels
  allRelations.relatedIds.forEach((relatedId) => visitedAnimeIds.add(relatedId));

  let totalEpisodes = mainEpisodes;
  for (const relatedId of allRelations.relatedIds) {
    const episodes = await fetchAnimeEpisodes(relatedId);
    if (episodes !== null) {
      totalEpisodes += episodes;
    }
  }

  const mainAnime = await fetchAnime(allRelations.first);
  mainAnime.episodes = totalEpisodes > 0 ? totalEpisodes : mainAnime.episodes;
  return mainAnime;
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
    for (const anime of pageData.data) {
      if (!visitedAnimeIds.has(anime.mal_id) && allAnime.length < TARGET_ANIME_COUNT) {
        if (!fetchedAnimeCache.has(anime.mal_id)) {
          fetchedAnimeCache.set(anime.mal_id, anime);
        }

        const fullAnime = await getAnime(anime.mal_id);
        allAnime.push(fullAnime);
        log(`Anime ID ${anime.mal_id} ajouté. Total actuel: ${allAnime.length}`);
      }
    }
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
  console.log(`Nombre ID visité : ${visitedAnimeIds.size}`);
}

fetchAndFilterAnimeData().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
