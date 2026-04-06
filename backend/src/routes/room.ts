
import { Hono } from 'hono';
import { roomService } from '../services/roomServiceInstance';

const roomRoutes = new Hono();


// Endpoint pour savoir si la partie est déjà commencée (animes assignés à la room)
roomRoutes.get('/room/:roomId/status', (c) => {
  const roomId = c.req.param('roomId');
  // Si la room a une liste d'animes, la partie est considérée comme commencée
  const animes = roomService.getRoomAnimes(roomId);
  const started = !!(animes && animes.length > 0);
  return c.json({ started });
});


roomRoutes.get('/room/:roomId/animes', (c) => {
  const roomId = c.req.param('roomId');
  const animes = roomService.getRoomAnimes(roomId) || [];
  return c.json({ animes });
});

roomRoutes.get('/room/:roomId/progression', (c) => {
  const roomId = c.req.param('roomId');
  const userId = c.req.query('userId');
  const user = c.req.query('user');
  const playerKey = userId || user;

  try {
    if (!playerKey) {
      return c.json({ error: 'Missing userId or user' }, 400);
    }
    const progress = roomService.getPlayerProgress(roomId, playerKey);
    if (!progress) {
      return c.json({ error: 'Not found' }, 404);
    }

    const triesByAnime = Object.fromEntries(
      Object.entries(progress.guessesByAnime || {}).map(([animeIdx, guesses]) => [animeIdx, (guesses as any[]).length]),
    );
    const totalTries = Object.values(triesByAnime).reduce((sum, tries) => sum + tries, 0);

    const correctGuessesHistory = Object.keys(progress.guessesByAnime || {})
      .map((animeIdx) => Number(animeIdx))
      .sort((a, b) => a - b)
      .map((animeIdx) => (progress.guessesByAnime?.[animeIdx] || []).find((guess: any) => guess?.isCorrect))
      .filter((guess: any) => !!guess);

    return c.json({
      ...progress,
      triesByAnime,
      totalTries,
      correctGuessesHistory,
    });
  } catch (err) {
    console.error('[ERROR] Exception in /room/:roomId/progression', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

roomRoutes.get('/room/:roomId/remaining', (c) => {
  const roomId = c.req.param('roomId');
  const userId = c.req.query('userId');
  const user = c.req.query('user');
  const playerKey = userId || user;
  if (!playerKey) return c.json({ error: 'Missing userId or user' }, 400);
  const progress = roomService.getPlayerProgress(roomId, playerKey);
  const animes = roomService.getRoomAnimes(roomId) || [];
  if (!progress) return c.json({ error: 'Not found' }, 404);
  const remaining = Math.max(0, animes.length - (progress.currentAnimeIdx || 0));
  return c.json({ remaining });
});

export default roomRoutes;
