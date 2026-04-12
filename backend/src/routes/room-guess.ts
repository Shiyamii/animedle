import { Hono } from 'hono';
import { AnimeService } from '../services/AnimeService';
import { roomService } from '../services/RoomService';

const roomGuessRoutes = new Hono();
const animeService = AnimeService.getInstance();

roomGuessRoutes.post('/room/:roomId/guess', async (c) => {
  const roomId = c.req.param('roomId');
  const { userId, user, guessedAnimeId, animeId } = await c.req.json();
  const finalGuessedAnimeId = guessedAnimeId || animeId;
  const playerKey = userId;
  const playerName = user;
  if (!(playerKey && finalGuessedAnimeId)) {
    return c.json({ error: 'Missing userId/user or guessedAnimeId' }, 400);
  }

  try {
    const result = await roomService.handleRoomGuess(roomId, playerKey, playerName, finalGuessedAnimeId, animeService);
    return c.json(result.body, result.status as 200 | 400 | 404 | 409);
  } catch {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default roomGuessRoutes;
