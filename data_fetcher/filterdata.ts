import fs from 'fs';
import fetch from 'node-fetch';

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

type JikanCharacter = {
  character: {
    mal_id: number;
    url: string;
    images: { webp: unknown };
    name: string;
  };
  role: string;
  favorites: number;
};

type AnimeRelatedList = {
  first: number;
  relatedIds: number[];
};

type JikanResponse = {};

type JikanAnimePaginatedResponse = JikanResponse & {
  data: JikanAnime[];
  pagination?: {
    has_next_page?: boolean;
  };
};

type JikanAnimeResponse = JikanResponse & {
  data: JikanAnime;
};

type JikanCharacterResponse = JikanResponse & {
  data: JikanCharacter[];
};

type JikanRelationsResponse = JikanResponse & {
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

type FilteredCharacter = {
  mal_id: number;
  name: string;
  images_webp: unknown;
};

///////////////////////////////////
// Constantes et Schéma Mongoose //
///////////////////////////////////

const TARGET_ANIME_COUNT = 200;
const PAGE_SIZE = 25;
const MAX_RETRIES = 5;

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
    if (waitMs > 1000) {
    }
    await sleep(waitMs);
  }

  throw new Error(`Échec inattendu lors de la récupération de l'URL: ${url}`);
}

function fetchAnimePage(page: number): Promise<JikanAnimePaginatedResponse> {
  const url = `https://api.jikan.moe/v4/anime?order_by=scored_by&limit=${PAGE_SIZE}&sort=desc&page=${page}`;
  return fetchFromJikan<JikanAnimePaginatedResponse>(url);
}

function fetchAnimeRelations(id: number): Promise<JikanRelationsResponse> {
  const url = `https://api.jikan.moe/v4/anime/${id}/relations`;
  return fetchFromJikan<JikanRelationsResponse>(url);
}

async function fetchAnime(id: number): Promise<JikanAnime> {
  const cachedAnime = fetchedAnimeCache.get(id);
  if (cachedAnime) {
    return cachedAnime;
  }
  const url = `https://api.jikan.moe/v4/anime/${id}`;
  const response = await fetchFromJikan<JikanAnimeResponse>(url);
  fetchedAnimeCache.set(id, response.data);
  return response.data;
}

function fetchCharacterData(animeId: number): Promise<JikanCharacterResponse> {
  const url = `https://api.jikan.moe/v4/anime/${animeId}/characters`;
  return fetchFromJikan<JikanCharacterResponse>(url);
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
async function getAllRelationsOfAnime(
  id: number,
  visited = new Set<number>(),
  relation = 'all',
): Promise<AnimeRelatedList> {
  if (visited.has(id)) {
    return { first: id, relatedIds: [] };
  }

  const currentAnime = await fetchAnime(id);
  if (currentAnime.type === 'Movie') {
    return { first: id, relatedIds: [] };
  }
  visited.add(id);

  const relationsResponse = await fetchAnimeRelations(id);
  const relatedAnimes = relationsResponse.data;
  const prequelResults =
    relation === 'Sequel'
      ? { first: null as number | null, relatedIds: [] as number[] }
      : await collectRelatedBranch(relatedAnimes, visited, 'Prequel');
  const sequelResults =
    relation === 'Prequel'
      ? { first: null as number | null, relatedIds: [] as number[] }
      : await collectRelatedBranch(relatedAnimes, visited, 'Sequel');

  return {
    first: prequelResults.first ?? id,
    relatedIds: [id, ...prequelResults.relatedIds, ...sequelResults.relatedIds],
  };
}

async function collectRelatedBranch(
  relatedAnimes: JikanRelation[],
  visited: Set<number>,
  relationType: 'Prequel' | 'Sequel',
): Promise<{ first: number | null; relatedIds: number[] }> {
  const relatedIds = relatedAnimes
    .filter((rel) => rel.relation === relationType)
    .flatMap((rel) =>
      rel.entry
        .filter((entry) => entry.type === 'anime' && !relationIdsToIgnore.has(entry.mal_id))
        .map((entry) => entry.mal_id),
    );

  let first: number | null = null;
  const collectedIds: number[] = [];

  for (const relatedId of relatedIds) {
    if (visited.has(relatedId)) {
      continue;
    }

    const relatedAnime = await fetchAnime(relatedId);
    if (relatedAnime.type === 'Movie') {
      continue;
    }

    const nestedResults = await getAllRelationsOfAnime(relatedId, visited, relationType);
    if (first === null) {
      first = nestedResults.first;
    }
    collectedIds.push(...nestedResults.relatedIds);
  }

  return { first, relatedIds: collectedIds };
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
  for (const relatedId of allRelations.relatedIds) {
    visitedAnimeIds.add(relatedId);
  }

  let totalEpisodes = mainEpisodes;
  for (const relatedId of allRelations.relatedIds) {
    const episodes = await fetchAnimeEpisodes(relatedId);
    if (episodes !== null) {
      totalEpisodes += episodes;
    }
  }

  const mainAnime = await fetchAnime(allRelations.first);
  mainAnime.episodes = totalEpisodes > 0 ? totalEpisodes : mainAnime.episodes;
  // Garder que les titres principaux, synonymes, francais et angalis
  mainAnime.titles = mainAnime.titles.filter((title) =>
    ['Default', 'Synonym', 'English', 'French'].includes(title.type),
  );
  mainAnime.titles;
  return mainAnime;
}

async function getCharacters(animeId: number): Promise<JikanCharacter[]> {
  const characterResponse = await fetchCharacterData(animeId);
  return characterResponse.data;
}

async function getMainCharacter(animeId: number): Promise<FilteredCharacter | null> {
  const characters = await getCharacters(animeId);
  const mainCharacter = characters.filter((char) => char.role === 'Main').sort((a, b) => b.favorites - a.favorites)[0];
  if (!mainCharacter) {
    return null;
  }
  return {
    mal_id: mainCharacter.character.mal_id,
    name: mainCharacter.character.name,
    images_webp: mainCharacter.character.images.webp,
  };
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
        const fullAnime = await getAnime(anime.mal_id);
        allAnime.push(fullAnime);
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
    mal_id: anime.mal_id,
  }));

  fs.writeFileSync('filtered_data.json', JSON.stringify(filtered, null, 2), 'utf-8');

  fecthAndFilterCharacterData(filtered).catch((_error) => {
    process.exitCode = 1;
  });
}

async function fecthAndFilterCharacterData(animes: FilteredAnime[]) {
  const charactersData: Record<number, FilteredCharacter | null> = {};

  for (const anime of animes) {
    if (anime.mal_id) {
      const mainCharacter = await getMainCharacter(anime.mal_id);
      charactersData[anime.mal_id] = mainCharacter;
    }
  }

  fs.writeFileSync('filtered_characters.json', JSON.stringify(charactersData, null, 2), 'utf-8');
}

fetchAndFilterAnimeData().catch((_error) => {
  process.exitCode = 1;
});
