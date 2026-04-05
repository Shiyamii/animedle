import { Hono } from 'hono';
import { roomService } from '../services/roomServiceInstance';
import { AnimeService } from '../services/AnimeService';
const { compareGuessToAnime } = require('../services/guessUtils');

const roomGuessRoutes = new Hono();
const animeService = AnimeService.getInstance();

// POST /api/room/:roomId/guess
roomGuessRoutes.post('/room/:roomId/guess', async (c) => {
  const roomId = c.req.param('roomId');
  const { user, animeId } = await c.req.json();
  if (!user || !animeId) return c.json({ error: 'Missing user or animeId' }, 400);
  // Récupère la progression du joueur depuis l'instance partagée de roomService
  const progress = roomService.getPlayerProgress(roomId, user);
  if (!progress) return c.json({ error: 'Not found' }, 404);
  const currentIdx = progress.currentAnimeIdx || 0;
  const animes = roomService.getRoomAnimes(roomId) || [];
  const refAnime = animes[currentIdx];
  if (!refAnime) return c.json({ error: 'No anime to guess' }, 400);
  console.log('[CHALLENGE_GUESS] incoming', {
    roomId,
    user,
    currentIdx,
    receivedAnimeId: animeId,
    expectedAnimeId: refAnime.id,
    expectedAnimeTitle: refAnime.title,
  });
  // Compare la proposition à l'anime courant
  const guessNumber = (progress.guessesByAnime?.[currentIdx]?.length || 0) + 1;
  const result = await compareGuessToAnime(animeId, refAnime.id, guessNumber, animeService);
  // Met à jour la progression
  if (!progress.guessesByAnime[currentIdx]) progress.guessesByAnime[currentIdx] = [];
  progress.guessesByAnime[currentIdx].push(result);
  if (result.isCorrect) {
    progress.foundCharacters.push({
      id: refAnime.characterId,
      name: refAnime.characterName,
      imageUrl: refAnime.characterImageUrl,
    });
    progress.currentAnimeIdx = currentIdx + 1;
    // Si la partie est finie, envoie un message WS 'win' à l'utilisateur
    const animes = roomService.getRoomAnimes(roomId) || [];
    if (progress.currentAnimeIdx >= animes.length) {
      // Trouve la socket de ce user dans la room
      const room = roomService.rooms.get(roomId);
      if (room) {
        for (const ws of room) {
          if (ws.data && ws.data.name === user && ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'win' }));
          }
        }
      }
    }
  }
  return c.json(result);
});

export default roomGuessRoutes;
