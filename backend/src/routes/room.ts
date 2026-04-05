
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
  const user = c.req.query('user');

  try {
    if (!user) {
      console.log('[DEBUG] Missing user param');
      return c.json({ error: 'Missing user' }, 400);
    }
    const progress = roomService.getPlayerProgress(roomId, user);
    console.log('[DEBUG] Progression found:', progress);
    if (!progress) {
      console.log('[DEBUG] Progress not found for user', user);
      return c.json({ error: 'Not found' }, 404);
    }
    return c.json(progress);
  } catch (err) {
    console.error('[ERROR] Exception in /room/:roomId/progression', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

roomRoutes.get('/room/:roomId/remaining', (c) => {
  const roomId = c.req.param('roomId');
  const user = c.req.query('user');
  if (!user) return c.json({ error: 'Missing user' }, 400);
  const progress = roomService.getPlayerProgress(roomId, user);
  const animes = roomService.getRoomAnimes(roomId) || [];
  if (!progress) return c.json({ error: 'Not found' }, 404);
  const remaining = Math.max(0, animes.length - (progress.currentAnimeIdx || 0));
  return c.json({ remaining });
});

export default roomRoutes;
