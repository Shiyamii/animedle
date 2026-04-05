import { Hono } from 'hono';
import { roomService } from '../services/roomServiceInstance';
import { AnimeService } from '../services/AnimeService';
const { compareGuessToAnime } = require('../services/guessUtils');

const roomGuessRoutes = new Hono();
const animeService = AnimeService.getInstance();

// POST /api/room/:roomId/guess
roomGuessRoutes.post('/room/:roomId/guess', async (c) => {
  const roomId = c.req.param('roomId');
  const { userId, user, animeId } = await c.req.json();
  const playerKey = userId || user;
  const playerName = user || userId;
  if (!playerKey || !animeId) return c.json({ error: 'Missing userId/user or animeId' }, 400);
  // Récupère la progression du joueur depuis l'instance partagée de roomService
  const progress = roomService.getPlayerProgress(roomId, playerKey);
  if (!progress) return c.json({ error: 'Not found' }, 404);
  const currentIdx = progress.currentAnimeIdx || 0;
  const animes = roomService.getRoomAnimes(roomId) || [];
  const refAnime = animes[currentIdx];
  if (!refAnime) return c.json({ error: 'No anime to guess' }, 400);
  console.log('[CHALLENGE_GUESS] incoming', {
    roomId,
    userId,
    user,
    playerKey,
    currentIdx,
    receivedAnimeId: animeId,
    expectedAnimeId: refAnime.id,
    expectedAnimeTitle: refAnime.title,
  });
  // Compare la proposition à l'anime courant
  const currentRoundGuesses = progress.guessesByAnime?.[currentIdx] || [];
  const isDuplicateGuess = currentRoundGuesses.some((guess: any) => guess?.anime?.id === animeId);
  if (isDuplicateGuess) {
    return c.json({ error: 'Anime already guessed for this round' }, 409);
  }

  const guessNumber = currentRoundGuesses.length + 1;
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
    // Si la partie est finie, envoie 'win' au gagnant et 'loose' aux autres joueurs.
    const animes = roomService.getRoomAnimes(roomId) || [];
    if (progress.currentAnimeIdx >= animes.length) {
      const room = roomService.rooms.get(roomId);
      if (room) {
        for (const ws of room) {
          if (ws.readyState !== 1) {
            continue;
          }

          const wsPlayerKey = ws.data?.userId || ws.data?.name;
          if (wsPlayerKey === playerKey) {
            ws.send(JSON.stringify({ type: 'win' }));
          } else {
            ws.send(JSON.stringify({ type: 'loose', winner: playerName }));
          }
        }
      }
    }
  }
  return c.json(result);
});

export default roomGuessRoutes;
