import fetch from 'node-fetch';
import fs from 'fs';

type JikanTitle = {
  type: string;
  title: string;
};

type JikanAnime = {
  images: { webp: unknown };
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

const TARGET_ANIME_COUNT = 200;
const PAGE_SIZE = 25;
const MAX_RETRIES = 5;

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
  const filtered = allAnime.slice(0, TARGET_ANIME_COUNT).map((anime) => ({
    images_webp: anime.images.webp,
    genres: anime.genres.map((genre) => genre.name),
    titles: anime.titles,
    demographic: anime.demographics[0]?.name ?? null,
    episodes: anime.episodes,
    season_start: anime.aired?.from ?? null,
    studio: anime.studios[0]?.name ?? null,
    source: anime.source,
    score: anime.score,
  }));

  fs.writeFileSync('filtered_data.json', JSON.stringify(filtered, null, 2), 'utf-8');
  console.log(`Filtrage terminé. ${filtered.length} animes enregistrés dans filtered_data.json.`);
}

fetchAndFilterAnimeData().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
