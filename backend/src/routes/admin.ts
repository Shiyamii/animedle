import { Hono } from 'hono';
import { adminMiddleware } from '@/lib/adminMiddleware';
import { AnimeService } from '@/services/AnimeService';
import { CharacterService } from '@/services/CharacterService';

const router = new Hono({ strict: false });
const animeService = AnimeService.getInstance();
const characterService = CharacterService.getInstance();

router.use('/admin/*', adminMiddleware);

router.get('/admin/animes', async (c) => {
  const animes = await animeService.getAdminAnimeList();
  return c.json(animes);
});

router.get('/admin/animes/current', async (c) => {
  const current = await animeService.getCurrentAnimeAdmin();
  return c.json(current);
});

router.post('/admin/animes/current/random', async (c) => {
  const anime = await animeService.setCurrentAnimeRandom();
  return c.json(anime);
});

router.post('/admin/animes/current/:id', async (c) => {
  const id = c.req.param('id');
  const anime = await animeService.setCurrentAnimeById(id);
  if (!anime) {
    return c.json({ error: 'Anime non trouvé' }, 404);
  }
  return c.json(anime);
});

router.post('/admin/animes', async (c) => {
  const body = await c.req.json();
  try {
    const anime = await animeService.createAnime(body);
    return c.json(anime, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return c.json({ error: message }, 400);
  }
});

router.put('/admin/animes/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  try {
    const anime = await animeService.updateAnime(id, body);
    if (!anime) {
      return c.json({ error: 'Anime non trouvé' }, 404);
    }
    return c.json(anime);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return c.json({ error: message }, 400);
  }
});

router.get('/admin/stats', async (c) => {
  const stats = await animeService.getAdminStats();
  return c.json(stats);
});

router.patch('/admin/animes/:id/enabled', async (c) => {
  const id = c.req.param('id');
  const { enabled } = await c.req.json<{ enabled: boolean }>();
  if (typeof enabled !== 'boolean') {
    return c.json({ error: "Paramètre 'enabled' requis (booléen)" }, 400);
  }
  const anime = await animeService.toggleAnimeEnabled(id, enabled);
  if (!anime) {
    return c.json({ error: 'Anime non trouvé' }, 404);
  }
  return c.json(anime);
});

router.delete('/admin/animes/:id', async (c) => {
  const id = c.req.param('id');
  const deleted = await animeService.deleteAnime(id);
  if (!deleted) {
    return c.json({ error: 'Anime non trouvé' }, 404);
  }
  return c.json({ success: true });
});

router.get('/admin/characters', async (c) => {
  const characters = await characterService.getAdminCharacterList();
  return c.json(characters);
});

router.post('/admin/characters', async (c) => {
  const body = await c.req.json();
  try {
    const character = await characterService.createCharacter(body);
    return c.json(character, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return c.json({ error: message }, 400);
  }
});

router.put('/admin/characters/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  try {
    const character = await characterService.updateCharacter(id, body);
    if (!character) {
      return c.json({ error: 'Personnage non trouvé' }, 404);
    }
    return c.json(character);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return c.json({ error: message }, 400);
  }
});

router.delete('/admin/characters/:id', async (c) => {
  const id = c.req.param('id');
  const deleted = await characterService.deleteCharacter(id);
  if (!deleted) {
    return c.json({ error: 'Personnage non trouvé' }, 404);
  }
  return c.json({ success: true });
});

export default router;
