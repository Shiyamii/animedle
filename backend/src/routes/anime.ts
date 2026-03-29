import { Hono } from 'hono';
import { AnimeService } from '@/services/AnimeService';
import { CharacterService } from '@/services/CharacterService';

const router = new Hono({ strict: false });
const animeService = AnimeService.getInstance();
const characterService = CharacterService.getInstance();

router.get('/animes', async (c) => {
  const animes = await animeService.getAnimeList();
  return c.json(animes);
});

router.get('/animes/endless', async (c) => {
  const randomAnime = await animeService.getRandomAnime();
  if (!randomAnime) {
    return c.json({ error: 'No anime found' }, 404);
  }
  return c.json(randomAnime);
});

router.post('/animes/guess/:id', async (c) => {
  const id = c.req.param('id');
  const guessNumber = parseInt(c.req.query('guessNumber') || '1', 10);
  if (Number.isNaN(guessNumber) || guessNumber < 1) {
    return c.json({ error: 'Invalid guess number' }, 400);
  }
  const anime = await animeService.guessAnime(id, guessNumber);
  if (!anime) {
    return c.json({ error: 'Anime not found' }, 404);
  }
  return c.json(anime);
});

router.post('/animes/endless/guess/:id', async (c) => {
  const id = c.req.param('id');
  const guessNumber = parseInt(c.req.query('guessNumber') || '1', 10);
  const refAnimeId = c.req.query('refAnimeId') || '';
  if (Number.isNaN(guessNumber) || guessNumber < 1) {
    return c.json({ error: 'Invalid guess number' }, 400);
  }
  const anime = await animeService.guessAnimeEndless(id, guessNumber, refAnimeId);
  if (!anime) {
    return c.json({ error: 'Anime not found' }, 404);
  }
  return c.json(anime);
});

router.get('/animes/current-date', async (c) => {
  const date = await animeService.getCurrentAnimeDate();
  if (!date) {
    return c.json({ error: 'Aucun anime courant' }, 404);
  }
  return c.json({ date });
});

router.get('/animes/stats', async (c) => {
  const idsParam = c.req.query('ids');
  if (!idsParam) {
    return c.json({ error: "Paramètre 'ids' requis" }, 400);
  }
  const ids = idsParam
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return c.json({ error: 'Aucun identifiant fourni' }, 400);
  }
  const stats = await animeService.getAnimeStats(ids);
  return c.json(stats);
});

router.get('/animes/characters/daily/hint-config', async (c) => {
  try {
    const config = await characterService.getDailyCharacterHintConfig();
    return c.json(config);
  } catch {
    return c.json({ error: 'Failed to load character hint config' }, 500);
  }
});

router.get('/animes/characters/endless', async (c) => {
  const target = await characterService.getRandomCharacterEndlessTarget();
  if (!target) {
    return c.json({ error: 'No character found' }, 404);
  }
  return c.json(target);
});

router.post('/animes/characters/endless/guess/:id', async (c) => {
  const id = c.req.param('id');
  const guessNumber = parseInt(c.req.query('guessNumber') || '1', 10);
  const refAnimeId = c.req.query('refAnimeId') || '';
  if (Number.isNaN(guessNumber) || guessNumber < 1) {
    return c.json({ error: 'Invalid guess number' }, 400);
  }
  if (!refAnimeId) {
    return c.json({ error: 'refAnimeId required' }, 400);
  }
  try {
    const result = await characterService.guessEndlessCharacter(id, guessNumber, refAnimeId);
    return c.json(result);
  } catch {
    return c.json({ error: 'Guess failed' }, 404);
  }
});

router.post('/animes/characters/daily/guess/:id', async (c) => {
  const id = c.req.param('id');
  const guessNumber = parseInt(c.req.query('guessNumber') || '1', 10);
  if (Number.isNaN(guessNumber) || guessNumber < 1) {
    return c.json({ error: 'Invalid guess number' }, 400);
  }
  const character = await characterService.guessDailyCharacter(id, guessNumber);
  if (!character) {
    return c.json({ error: 'Character not found' }, 404);
  }
  return c.json(character);
});

export default router;
