import { AnimeService } from './AnimeService';

export class RoomService {
  private rooms: Map<string, Set<WebSocket>>;
  private socketToRoom: Map<WebSocket, string>;
  private roomAnimes: Map<string, any[]>;
  private roomProgress: Map<
    string,
    {
      [playerName: string]: {
        currentRoundIndex: number;
        guessesByRound: { [roundIndex: number]: any[] };
        foundCharacters: any[];
      };
    }
  >;

  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
    this.roomAnimes = new Map();
    this.roomProgress = new Map();
  }

  private getPlayerKeyFromSocket(socketConnection) {
    return (socketConnection.data && (socketConnection.data.userId || socketConnection.data.name)) || 'Anonyme';
  }

  getPlayerProgress(roomId, playerName) {
    return this.roomProgress?.get(roomId)?.[playerName];
  }
  setPlayerProgress(roomId, playerName, progress) {
    if (!this.roomProgress.has(roomId)) this.roomProgress.set(roomId, {});
    const roomProg = this.roomProgress.get(roomId);
    roomProg[playerName] = progress;
    this.roomProgress.set(roomId, roomProg);
  }

  joinRoom(socketConnection, roomId) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Set();
      this.rooms.set(roomId, room);
    }
    room.add(socketConnection);
    this.socketToRoom.set(socketConnection, roomId);
    const name = socketConnection.data && socketConnection.data.name ? socketConnection.data.name : 'Anonyme';

    const playerNames = Array.from(room).map((client) =>
      client.data && client.data.name ? client.data.name : 'Anonyme',
    );
    try {
      socketConnection.send(JSON.stringify({ type: 'players', players: playerNames }));
    } catch {
      /* ignore */
    }
    this.broadcastToRoom(roomId, JSON.stringify({ type: 'join', name }), name);
  }

  leaveRoom(socketConnection) {
    const roomId = this.socketToRoom.get(socketConnection);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.delete(socketConnection);
        if (room.size === 0) {
          this.rooms.delete(roomId);
        }
      }
      const name = socketConnection.data && socketConnection.data.name ? socketConnection.data.name : 'Anonyme';
      this.broadcastToRoom(roomId, JSON.stringify({ type: 'leave', name }), name);
      this.socketToRoom.delete(socketConnection);
    }
  }

  broadcastToRoom(roomId, message, senderName) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const participantSocket of room) {
      if (senderName && participantSocket.data && participantSocket.data.name === senderName) continue;
      if (participantSocket.readyState === 1) {
        participantSocket.send(message);
      }
    }
  }

  getRoomId(socketConnection) {
    return this.socketToRoom.get(socketConnection);
  }

  async startGame(roomId, animeLimit) {
    const animeList = await AnimeService.getInstance().getAnimeList();
    const shuffled = animeList.sort(() => Math.random() - 0.5);
    const animes = shuffled.slice(0, animeLimit);

    this.roomAnimes.set(roomId, animes);
    const room = this.rooms.get(roomId);
    if (room) {
      if (!this.roomProgress.has(roomId)) this.roomProgress.set(roomId, {});
      for (const socketConnection of room) {
        const playerKey = this.getPlayerKeyFromSocket(socketConnection);
        this.setPlayerProgress(roomId, playerKey, {
          currentRoundIndex: 0,
          guessesByRound: {},
          foundCharacters: [],
        });
      }
    }

    this.broadcastToRoom(roomId, JSON.stringify({ type: 'start' }));
  }

  handleProposal(socketConnection, guess, roundIndex) {
    const roomId = this.getRoomId(socketConnection);
    if (!roomId) return;
    const playerKey = this.getPlayerKeyFromSocket(socketConnection);
    if (!this.roomProgress.has(roomId)) this.roomProgress.set(roomId, {});
    const progress = this.roomProgress.get(roomId);
    if (!progress[playerKey]) {
      progress[playerKey] = {
        currentRoundIndex: 0,
        guessesByRound: {},
        foundCharacters: [],
      };
    }
    if (!progress[playerKey].guessesByRound[roundIndex]) progress[playerKey].guessesByRound[roundIndex] = [];
    progress[playerKey].guessesByRound[roundIndex].push(guess);
    const animes = this.roomAnimes.get(roomId) || [];
    if (guess && guess.isCorrect && animes[roundIndex]) {
      progress[playerKey].foundCharacters.push({
        id: animes[roundIndex].characterId,
        name: animes[roundIndex].characterName,
        imageUrl: animes[roundIndex].characterImageUrl,
      });
      progress[playerKey].currentRoundIndex = roundIndex + 1;
    }
    socketConnection.send(
      JSON.stringify({
        type: 'progression',
        guessesByRound: progress[playerKey].guessesByRound,
        currentRoundIndex: progress[playerKey].currentRoundIndex,
        foundCharacters: progress[playerKey].foundCharacters,
      }),
    );
  }

  getRoomAnimes(roomId) {
    return this.roomAnimes.get(roomId);
  }

  getRoomStatus(roomId) {
    const animes = this.getRoomAnimes(roomId);
    const started = !!(animes && animes.length > 0);
    return { started };
  }

  getProgressWithStats(roomId, playerKey) {
    const progress = this.getPlayerProgress(roomId, playerKey);
    if (!progress) return null;

    const triesByAnime = Object.fromEntries(
      Object.entries(progress.guessesByRound || {}).map(([roundIndex, guesses]) => [
        roundIndex,
        (guesses as any[]).length,
      ]),
    );
    const totalTries = Object.values(triesByAnime).reduce((sum, tries) => sum + tries, 0);

    const correctGuessesHistory = Object.keys(progress.guessesByRound || {})
      .map((roundIndex) => Number(roundIndex))
      .sort((a, b) => a - b)
      .map((roundIndex) => (progress.guessesByRound?.[roundIndex] || []).find((guess: any) => guess?.isCorrect))
      .filter((guess: any) => !!guess);

    return {
      ...progress,
      triesByAnime,
      totalTries,
      correctGuessesHistory,
    };
  }

  getRemaining(roomId, playerKey) {
    const progress = this.getPlayerProgress(roomId, playerKey);
    const animes = this.getRoomAnimes(roomId) || [];
    if (!progress) return null;
    const remaining = Math.max(0, animes.length - (progress.currentRoundIndex || 0));
    return { remaining };
  }

  async handleRoomGuess(roomId, playerKey, playerName, guessedAnimeId, animeService) {
    const progress = this.getPlayerProgress(roomId, playerKey);
    if (!progress) return { status: 404, body: { error: 'Not found' } };

    const currentRoundIndex = progress.currentRoundIndex || 0;
    const animes = this.getRoomAnimes(roomId) || [];
    const refAnime = animes[currentRoundIndex];
    if (!refAnime) return { status: 400, body: { error: 'No anime to guess' } };

    const currentRoundGuesses = progress.guessesByRound?.[currentRoundIndex] || [];
    const isDuplicateGuess = currentRoundGuesses.some((guess: any) => guess?.anime?.id === guessedAnimeId);
    if (isDuplicateGuess) {
      return { status: 409, body: { error: 'Anime already guessed for this round' } };
    }

    const guessNumber = currentRoundGuesses.length + 1;
    const result = await animeService.guessAnimeEndless(guessedAnimeId, guessNumber, refAnime.id);

    if (!result.isCorrect) {
      this.notifyRoomAttempt(roomId, playerKey, playerName, currentRoundIndex, guessedAnimeId, result, guessNumber);
    }

    if (!progress.guessesByRound[currentRoundIndex]) progress.guessesByRound[currentRoundIndex] = [];
    progress.guessesByRound[currentRoundIndex].push(result);

    if (result.isCorrect) {
      this.notifyRoomFound(roomId, playerKey, playerName, currentRoundIndex, guessedAnimeId, result, guessNumber);

      progress.foundCharacters.push({
        id: refAnime.characterId,
        name: refAnime.characterName,
        imageUrl: refAnime.characterImageUrl,
      });
      progress.currentRoundIndex = currentRoundIndex + 1;

      this.resolveRoomWinnerIfFinished(roomId);
    }

    return { status: 200, body: result };
  }

  notifyRoomAttempt(roomId, playerKey, playerName, roundIndex, guessedAnimeId, result, guessNumber) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const participantSocket of room) {
      if (participantSocket.readyState !== 1) continue;
      const participantPlayerKey = participantSocket.data?.userId || participantSocket.data?.name;
      if (participantPlayerKey === playerKey) continue;

      participantSocket.send(
        JSON.stringify({
          type: 'challenge-attempt',
          playerKey,
          playerName,
          roundIndex,
          guessedAnimeId,
          guessedAnimeTitle: result.anime?.title || guessedAnimeId,
          guessNumber,
        }),
      );
    }
  }

  notifyRoomFound(roomId, playerKey, playerName, roundIndex, foundAnimeId, result, guessNumber) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const participantSocket of room) {
      if (participantSocket.readyState !== 1) continue;
      const participantPlayerKey = participantSocket.data?.userId || participantSocket.data?.name;
      if (participantPlayerKey === playerKey) continue;

      participantSocket.send(
        JSON.stringify({
          type: 'challenge-found',
          playerKey,
          playerName,
          roundIndex,
          foundAnimeId: result.anime?.id || foundAnimeId,
          foundAnimeTitle: result.anime?.title || foundAnimeId,
          guessNumber,
        }),
      );
    }
  }

  resolveRoomWinnerIfFinished(roomId) {
    const room = this.rooms.get(roomId) as any;
    if (!room) return;

    const animes = this.getRoomAnimes(roomId) || [];
    const allPlayersFinished = Array.from(room).every((socketConnection: any) => {
      const playerKey = socketConnection.data?.userId || socketConnection.data?.name;
      const playerProgress = this.getPlayerProgress(roomId, playerKey);
      return !!playerProgress && (playerProgress.currentRoundIndex || 0) >= animes.length;
    });

    if (!allPlayersFinished) return;

    const playerResults = Array.from(room)
      .map((socketConnection: any) => {
        const playerKey = socketConnection.data?.userId || socketConnection.data?.name;
        const playerProgress = this.getPlayerProgress(roomId, playerKey);
        const totalTries = Object.values(playerProgress?.guessesByRound || {}).reduce(
          (sum: number, guesses: any) => sum + ((guesses as any[])?.length || 0),
          0,
        );
        return {
          socketConnection,
          playerKey,
          playerName: socketConnection.data?.name || playerKey,
          totalTries,
        };
      })
      .filter((entry: any) => entry.socketConnection.readyState === 1);

    if (playerResults.length === 0) return;

    const winnerTries = Math.min(...playerResults.map((entry) => entry.totalTries));
    const winners = playerResults.filter((entry) => entry.totalTries === winnerTries);
    const winnerNames = winners.map((entry) => entry.playerName);

    for (const entry of playerResults) {
      if (winners.some((winner) => winner.playerKey === entry.playerKey)) {
        entry.socketConnection.send(
          JSON.stringify({ type: 'win', totalTries: entry.totalTries, winners: winnerNames }),
        );
      } else {
        entry.socketConnection.send(
          JSON.stringify({ type: 'loose', winner: winnerNames.join(', '), totalTries: entry.totalTries }),
        );
      }
    }
  }
}

export const roomService = new RoomService();
