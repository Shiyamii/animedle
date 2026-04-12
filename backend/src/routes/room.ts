import { Hono } from 'hono';
import { roomService } from '../services/RoomService';

const roomRoutes = new Hono();

roomRoutes.get('/room/:roomId/status', (c) => {
  const roomId = c.req.param('roomId');
  return c.json(roomService.getRoomStatus(roomId));
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
    const progressWithStats = roomService.getProgressWithStats(roomId, playerKey);
    if (!progressWithStats) {
      return c.json({ error: 'Not found' }, 404);
    }

    return c.json(progressWithStats);
  } catch {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

roomRoutes.get('/room/:roomId/remaining', (c) => {
  const roomId = c.req.param('roomId');
  const userId = c.req.query('userId');
  const user = c.req.query('user');
  const playerKey = userId || user;
  if (!playerKey) {
    return c.json({ error: 'Missing userId or user' }, 400);
  }
  const remaining = roomService.getRemaining(roomId, playerKey);
  if (!remaining) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.json(remaining);
});

export default roomRoutes;
