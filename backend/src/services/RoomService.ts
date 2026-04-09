import { AnimeService, type GuessResultDTO } from './AnimeService';

type WsData = {
  name?: string;
  userId?: string;
};

type SocketConnection = Bun.ServerWebSocket<WsData>;

type GuessLike = {
  isCorrect?: boolean;
  anime?: {
    id?: string;
    title?: string;
  };
};

function asGuessLike(value: unknown): GuessLike | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return value as GuessLike;
}

type FoundCharacter = {
  id: string;
  name: string;
  imageUrl: string;
};

type PlayerProgress = {
  currentRoundIndex: number;
  guessesByRound: Record<number, GuessLike[]>;
  foundCharacters: FoundCharacter[];
};

type RoomProgress = Record<string, PlayerProgress>;

type RoomAnime = {
  id: string;
  characterId: string;
  characterName: string;
  characterImageUrl: string;
};

export class RoomService {
  private rooms: Map<string, Set<SocketConnection>>;
  private socketToRoom: Map<SocketConnection, string>;
  private roomAnimes: Map<string, RoomAnime[]>;
  private roomProgress: Map<string, RoomProgress>;

  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
    this.roomAnimes = new Map();
    this.roomProgress = new Map();
  }

  private getPlayerKeyFromSocket(socketConnection: SocketConnection): string {
    return socketConnection.data?.userId || socketConnection.data?.name || 'Anonyme';
  }

  private ensureRoomProgress(roomId: string): RoomProgress {
    if (!this.roomProgress.has(roomId)) this.roomProgress.set(roomId, {});
    return this.roomProgress.get(roomId)!;
  }

  getPlayerProgress(roomId: string, playerName: string): PlayerProgress | undefined {
    return this.roomProgress?.get(roomId)?.[playerName];
  }

  setPlayerProgress(roomId: string, playerName: string, progress: PlayerProgress): void {
    const roomProg = this.ensureRoomProgress(roomId);
    roomProg[playerName] = progress;
  }

  joinRoom(socketConnection: SocketConnection, roomId: string): void {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Set();
      this.rooms.set(roomId, room);
    }
    room.add(socketConnection);
    this.socketToRoom.set(socketConnection, roomId);
    const name = socketConnection.data?.name || 'Anonyme';

    const playerNames = Array.from(room).map((client) => client.data?.name || 'Anonyme');
    try {
      socketConnection.send(JSON.stringify({ type: 'players', players: playerNames }));
    } catch {
      /* ignore */
    }
    this.broadcastToRoom(roomId, JSON.stringify({ type: 'join', name }), name);
  }

  leaveRoom(socketConnection: SocketConnection): void {
    const roomId = this.socketToRoom.get(socketConnection);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.delete(socketConnection);
        if (room.size === 0) {
          this.rooms.delete(roomId);
        }
      }
      const name = socketConnection.data?.name || 'Anonyme';
      this.broadcastToRoom(roomId, JSON.stringify({ type: 'leave', name }), name);
      this.socketToRoom.delete(socketConnection);
    }
  }

  broadcastToRoom(roomId: string, message: string, senderName?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const participantSocket of room) {
      if (senderName && participantSocket.data?.name === senderName) continue;
      if (participantSocket.readyState === 1) {
        participantSocket.send(message);
      }
    }
  }

  getRoomId(socketConnection: SocketConnection): string | undefined {
    return this.socketToRoom.get(socketConnection);
  }

  async startGame(roomId: string, animeLimit: number): Promise<void> {
    const animeList = await AnimeService.getInstance().getAnimeList();
    const shuffled = animeList.sort(() => Math.random() - 0.5);
    const animes = shuffled.slice(0, animeLimit) as unknown as RoomAnime[];

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

  handleProposal(socketConnection: SocketConnection, guess: unknown, roundIndex: unknown): void {
    if (typeof roundIndex !== 'number' || !Number.isInteger(roundIndex) || roundIndex < 0) return;

    const guessLike = asGuessLike(guess);

    const roomId = this.getRoomId(socketConnection);
    if (!roomId) return;
    const playerKey = this.getPlayerKeyFromSocket(socketConnection);
    const progress = this.ensureRoomProgress(roomId);

    if (!progress[playerKey]) {
      progress[playerKey] = {
        currentRoundIndex: 0,
        guessesByRound: {},
        foundCharacters: [],
      };
    }
    if (!progress[playerKey].guessesByRound[roundIndex]) progress[playerKey].guessesByRound[roundIndex] = [];
    if (guessLike) progress[playerKey].guessesByRound[roundIndex].push(guessLike);
    const animes = this.roomAnimes.get(roomId) || [];
    if (guessLike?.isCorrect && animes[roundIndex]) {
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

  getRoomAnimes(roomId: string): RoomAnime[] | undefined {
    return this.roomAnimes.get(roomId);
  }

  getRoomStatus(roomId: string): { started: boolean } {
    const animes = this.getRoomAnimes(roomId);
    const started = !!(animes && animes.length > 0);
    return { started };
  }

  getProgressWithStats(roomId: string, playerKey: string) {
    const progress = this.getPlayerProgress(roomId, playerKey);
    if (!progress) return null;

    const triesByAnime = Object.fromEntries(
      Object.entries(progress.guessesByRound || {}).map(([roundIndex, guesses]) => [roundIndex, guesses.length]),
    );
    const totalTries = Object.values(triesByAnime).reduce((sum, tries) => sum + Number(tries), 0);

    const correctGuessesHistory = Object.keys(progress.guessesByRound || {})
      .map((roundIndex) => Number(roundIndex))
      .sort((a, b) => a - b)
      .map((currentRoundIndex) =>
        (progress.guessesByRound?.[currentRoundIndex] || []).find((attempt) => attempt?.isCorrect),
      )
      .filter((attempt) => !!attempt);

    return {
      ...progress,
      triesByAnime,
      totalTries,
      correctGuessesHistory,
    };
  }

  getRemaining(roomId: string, playerKey: string): { remaining: number } | null {
    const progress = this.getPlayerProgress(roomId, playerKey);
    const animes = this.getRoomAnimes(roomId) || [];
    if (!progress) return null;
    const remaining = Math.max(0, animes.length - (progress.currentRoundIndex || 0));
    return { remaining };
  }

  async handleRoomGuess(
    roomId: string,
    playerKey: string,
    playerName: string,
    guessedAnimeId: string,
    animeService: AnimeService,
  ): Promise<{ status: number; body: GuessResultDTO | { error: string } }> {
    const progress = this.getPlayerProgress(roomId, playerKey);
    if (!progress) return { status: 404, body: { error: 'Not found' } };

    const currentRoundIndex = progress.currentRoundIndex || 0;
    const animes = this.getRoomAnimes(roomId) || [];
    const refAnime = animes[currentRoundIndex];
    if (!refAnime) return { status: 400, body: { error: 'No anime to guess' } };

    const currentRoundGuesses = progress.guessesByRound?.[currentRoundIndex] || [];
    const isDuplicateGuess = currentRoundGuesses.some((attempt) => attempt?.anime?.id === guessedAnimeId);
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

  notifyRoomAttempt(
    roomId: string,
    playerKey: string,
    playerName: string,
    roundIndex: number,
    guessedAnimeId: string,
    result: GuessResultDTO,
    guessNumber: number,
  ): void {
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

  notifyRoomFound(
    roomId: string,
    playerKey: string,
    playerName: string,
    roundIndex: number,
    foundAnimeId: string,
    result: GuessResultDTO,
    guessNumber: number,
  ): void {
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

  resolveRoomWinnerIfFinished(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const animes = this.getRoomAnimes(roomId) || [];
    const allPlayersFinished = Array.from(room).every((socketConnection) => {
      const playerKey = socketConnection.data?.userId || socketConnection.data?.name;
      if (!playerKey) return false;
      const playerProgress = this.getPlayerProgress(roomId, playerKey);
      return !!playerProgress && (playerProgress.currentRoundIndex || 0) >= animes.length;
    });

    if (!allPlayersFinished) return;

    const playerResults = Array.from(room)
      .map((socketConnection) => {
        const playerKey = socketConnection.data?.userId || socketConnection.data?.name;
        if (!playerKey) return null;
        const playerProgress = this.getPlayerProgress(roomId, playerKey);
        const totalTries = Object.values(playerProgress?.guessesByRound || {}).reduce(
          (sum: number, guesses) => sum + (guesses?.length || 0),
          0,
        );
        return {
          socketConnection,
          playerKey,
          playerName: socketConnection.data?.name || playerKey,
          totalTries,
        };
      })
      .filter(
        (
          entry,
        ): entry is { socketConnection: SocketConnection; playerKey: string; playerName: string; totalTries: number } =>
          !!entry && entry.socketConnection.readyState === 1,
      );

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
