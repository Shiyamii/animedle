/** biome-ignore-all lint/style/useNamingConvention: TKT */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuessResultDTO } from '../AnimeService';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  getAnimeList: vi.fn(),
  guessAnimeEndless: vi.fn(),
}));

vi.mock('@/services/AnimeService', () => ({
  AnimeService: {
    getInstance: vi.fn(() => ({
      getAnimeList: mocks.getAnimeList,
      guessAnimeEndless: mocks.guessAnimeEndless,
    })),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { RoomService } from '../RoomService';

type MockSocket = {
  data: { name?: string; userId?: string };
  readyState: number;
  send: ReturnType<typeof vi.fn>;
};

function makeSocket(name?: string, userId?: string, readyState = 1): MockSocket {
  return {
    data: { name, userId },
    readyState,
    send: vi.fn(),
  };
}

function makeRoomAnime(id: string) {
  return {
    id,
    characterId: `char-${id}`,
    characterName: `Character ${id}`,
    characterImageUrl: `https://img.example.com/${id}.webp`,
  };
}

function makeGuessResult(overrides: Partial<GuessResultDTO> = {}): GuessResultDTO {
  return {
    isCorrect: false,
    guessNumber: 1,
    anime: { id: 'anime-guessed', title: 'Guessed Anime' },
    results: {
      demographicType: { isCorrect: false },
      episodes: { isCorrect: false, isHigher: false },
      seasonStart: { isCorrect: false, isEarlier: false },
      studio: { isCorrect: false },
      source: { isCorrect: false },
      genres: { isCorrect: false, isPartiallyCorrect: false },
      animeFormat: { isCorrect: false },
      score: { isCorrect: false, isHigher: false },
    },
    ...overrides,
  } as GuessResultDTO;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RoomService', () => {
  let service: RoomService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new RoomService();
  });

  // ── joinRoom ──────────────────────────────────────────────────────────────

  describe('joinRoom', () => {
    it('envoie la liste des joueurs au nouveau connecté', () => {
      const socket = makeSocket('Alice');

      service.joinRoom(socket as never, 'room-1');

      expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'players', players: ['Alice'] }));
    });

    it('diffuse un message "join" aux autres joueurs de la salle', () => {
      const alice = makeSocket('Alice');
      const bob = makeSocket('Bob');

      service.joinRoom(alice as never, 'room-1');
      service.joinRoom(bob as never, 'room-1');

      // Alice reçoit le message "join" de Bob
      const aliceMessages = alice.send.mock.calls.map((call) => JSON.parse(call[0] as string));
      expect(aliceMessages).toContainEqual({ type: 'join', name: 'Bob' });
    });

    it("crée une nouvelle salle si elle n'existe pas encore", () => {
      const socket = makeSocket('Alice');

      service.joinRoom(socket as never, 'new-room');

      expect(service.getRoomId(socket as never)).toBe('new-room');
    });

    it('utilise "Anonyme" si le socket n\'a pas de nom', () => {
      const socket = makeSocket();

      service.joinRoom(socket as never, 'room-1');

      const messages = socket.send.mock.calls.map((call) => JSON.parse(call[0] as string));
      expect(messages[0]).toEqual({ type: 'players', players: ['Anonyme'] });
    });
  });

  // ── leaveRoom ─────────────────────────────────────────────────────────────

  describe('leaveRoom', () => {
    it('diffuse un message "leave" aux autres joueurs', () => {
      const alice = makeSocket('Alice');
      const bob = makeSocket('Bob');

      service.joinRoom(alice as never, 'room-1');
      service.joinRoom(bob as never, 'room-1');
      service.leaveRoom(alice as never);

      const bobMessages = bob.send.mock.calls.map((call) => JSON.parse(call[0] as string));
      expect(bobMessages).toContainEqual({ type: 'leave', name: 'Alice' });
    });

    it('supprime la salle quand le dernier joueur la quitte', () => {
      const socket = makeSocket('Alice');

      service.joinRoom(socket as never, 'room-1');
      service.leaveRoom(socket as never);

      expect(service.getRoomId(socket as never)).toBeUndefined();
      expect(service.getRoomStatus('room-1').started).toBe(false);
    });

    it("ne fait rien si le socket n'est dans aucune salle", () => {
      const socket = makeSocket('Ghost');
      // Ne doit pas lever d'erreur
      expect(() => service.leaveRoom(socket as never)).not.toThrow();
    });
  });

  // ── getRoomId ─────────────────────────────────────────────────────────────

  describe('getRoomId', () => {
    it("retourne l'identifiant de la salle du socket", () => {
      const socket = makeSocket('Alice');
      service.joinRoom(socket as never, 'room-42');
      expect(service.getRoomId(socket as never)).toBe('room-42');
    });

    it("retourne undefined si le socket n'est dans aucune salle", () => {
      const socket = makeSocket('Ghost');
      expect(service.getRoomId(socket as never)).toBeUndefined();
    });
  });

  // ── broadcastToRoom ───────────────────────────────────────────────────────

  describe('broadcastToRoom', () => {
    it("envoie le message à tous les joueurs sauf l'émetteur", () => {
      const alice = makeSocket('Alice');
      const bob = makeSocket('Bob');
      const charlie = makeSocket('Charlie');

      service.joinRoom(alice as never, 'room-1');
      service.joinRoom(bob as never, 'room-1');
      service.joinRoom(charlie as never, 'room-1');

      // Réinitialise les appels précédents de joinRoom
      alice.send.mockClear();
      bob.send.mockClear();
      charlie.send.mockClear();

      service.broadcastToRoom('room-1', 'hello', 'Alice');

      expect(alice.send).not.toHaveBeenCalled();
      expect(bob.send).toHaveBeenCalledWith('hello');
      expect(charlie.send).toHaveBeenCalledWith('hello');
    });

    it("n'envoie rien si la salle n'existe pas", () => {
      // Ne doit pas lever d'erreur
      expect(() => service.broadcastToRoom('inexistant', 'msg')).not.toThrow();
    });

    it("n'envoie pas aux sockets dont readyState != 1", () => {
      const alice = makeSocket('Alice');
      const closed = makeSocket('Bob', undefined, 3);

      service.joinRoom(alice as never, 'room-1');
      service.joinRoom(closed as never, 'room-1');

      alice.send.mockClear();
      closed.send.mockClear();

      service.broadcastToRoom('room-1', 'msg');

      expect(closed.send).not.toHaveBeenCalled();
    });
  });

  // ── getPlayerProgress / setPlayerProgress ──────────────────────────────────

  describe('getPlayerProgress / setPlayerProgress', () => {
    it("retourne undefined si le joueur n'a pas de progression", () => {
      expect(service.getPlayerProgress('room-1', 'Alice')).toBeUndefined();
    });

    it('sauvegarde et retourne la progression du joueur', () => {
      const progress = { currentRoundIndex: 2, guessesByRound: {}, foundCharacters: [] };
      service.setPlayerProgress('room-1', 'Alice', progress);
      expect(service.getPlayerProgress('room-1', 'Alice')).toEqual(progress);
    });
  });

  // ── getRoomStatus ─────────────────────────────────────────────────────────

  describe('getRoomStatus', () => {
    it('retourne started=false avant le démarrage', () => {
      expect(service.getRoomStatus('room-1')).toEqual({ started: false });
    });

    it('retourne started=true après le démarrage de la partie', async () => {
      const socket = makeSocket('Alice');
      service.joinRoom(socket as never, 'room-1');

      mocks.getAnimeList.mockResolvedValue([makeRoomAnime('anime-1')]);
      await service.startGame('room-1', 1);

      expect(service.getRoomStatus('room-1').started).toBe(true);
    });
  });

  // ── getRemaining ──────────────────────────────────────────────────────────

  describe('getRemaining', () => {
    it('retourne null si le joueur est inconnu', () => {
      expect(service.getRemaining('room-1', 'Ghost')).toBeNull();
    });

    it("retourne le nombre d'animes restants", async () => {
      const socket = makeSocket('Alice');
      service.joinRoom(socket as never, 'room-1');

      mocks.getAnimeList.mockResolvedValue([makeRoomAnime('a1'), makeRoomAnime('a2'), makeRoomAnime('a3')]);
      await service.startGame('room-1', 3);

      const remaining = service.getRemaining('room-1', 'Alice');
      expect(remaining?.remaining).toBe(3);
    });
  });

  // ── getProgressWithStats ──────────────────────────────────────────────────

  describe('getProgressWithStats', () => {
    it("retourne null si le joueur n'a pas de progression", () => {
      expect(service.getProgressWithStats('room-1', 'Ghost')).toBeNull();
    });

    it('calcule totalTries et triesByAnime correctement', () => {
      service.setPlayerProgress('room-1', 'Alice', {
        currentRoundIndex: 1,
        guessesByRound: {
          0: [{ isCorrect: false }, { isCorrect: true }],
          1: [{ isCorrect: false }],
        },
        foundCharacters: [],
      });

      const stats = service.getProgressWithStats('room-1', 'Alice');

      expect(stats?.totalTries).toBe(3);
      expect(stats?.triesByAnime).toEqual({ '0': 2, '1': 1 });
    });

    it('retourne correctGuessesHistory avec uniquement les tentatives réussies', () => {
      service.setPlayerProgress('room-1', 'Alice', {
        currentRoundIndex: 2,
        guessesByRound: {
          0: [{ isCorrect: false }, { isCorrect: true, anime: { id: 'a1' } }],
          1: [{ isCorrect: true, anime: { id: 'a2' } }],
        },
        foundCharacters: [],
      });

      const stats = service.getProgressWithStats('room-1', 'Alice');

      expect(stats?.correctGuessesHistory).toHaveLength(2);
      expect((stats?.correctGuessesHistory[0] as { isCorrect: boolean })?.isCorrect).toBe(true);
    });
  });

  // ── handleProposal ────────────────────────────────────────────────────────

  describe('handleProposal', () => {
    it('ignore une proposition avec un roundIndex invalide', () => {
      const socket = makeSocket('Alice');
      service.joinRoom(socket as never, 'room-1');

      service.handleProposal(socket as never, { isCorrect: false }, -1);

      const progress = service.getPlayerProgress('room-1', 'Alice');
      expect(Object.keys(progress?.guessesByRound ?? {})).toHaveLength(0);
    });

    it('ajoute la proposition à guessesByRound', () => {
      const socket = makeSocket('Alice');
      service.joinRoom(socket as never, 'room-1');
      service.setPlayerProgress('room-1', 'Alice', {
        currentRoundIndex: 0,
        guessesByRound: {},
        foundCharacters: [],
      });

      const guess = { isCorrect: false, anime: { id: 'anime-1' } };
      service.handleProposal(socket as never, guess, 0);

      const progress = service.getPlayerProgress('room-1', 'Alice');
      expect(progress?.guessesByRound[0]).toHaveLength(1);
    });

    it('avance au round suivant si la proposition est correcte', async () => {
      const socket = makeSocket('Alice');
      service.joinRoom(socket as never, 'room-1');

      mocks.getAnimeList.mockResolvedValue([makeRoomAnime('a1'), makeRoomAnime('a2')]);
      await service.startGame('room-1', 2);

      const correctGuess = {
        isCorrect: true,
        anime: { id: 'a1' },
      };
      service.handleProposal(socket as never, correctGuess, 0);

      const progress = service.getPlayerProgress('room-1', 'Alice');
      expect(progress?.currentRoundIndex).toBe(1);
      expect(progress?.foundCharacters).toHaveLength(1);
    });

    it('envoie une mise à jour de progression via le socket', () => {
      const socket = makeSocket('Alice');
      service.joinRoom(socket as never, 'room-1');
      service.setPlayerProgress('room-1', 'Alice', {
        currentRoundIndex: 0,
        guessesByRound: {},
        foundCharacters: [],
      });

      socket.send.mockClear();
      service.handleProposal(socket as never, { isCorrect: false }, 0);

      const lastCall = socket.send.mock.calls[socket.send.mock.calls.length - 1];
      const message = JSON.parse(lastCall[0] as string);
      expect(message.type).toBe('progression');
    });
  });

  // ── handleRoomGuess ───────────────────────────────────────────────────────

  describe('handleRoomGuess', () => {
    async function setupRoomWithPlayer(roomId: string, playerKey: string) {
      const socket = makeSocket(playerKey);
      service.joinRoom(socket as never, roomId);
      mocks.getAnimeList.mockResolvedValue([makeRoomAnime('anime-ref')]);
      await service.startGame(roomId, 1);
      return socket;
    }

    it("retourne 404 si le joueur n'a pas de progression", async () => {
      const { AnimeService } = await import('../AnimeService');
      const animeService = AnimeService.getInstance() as never;

      const result = await service.handleRoomGuess('room-1', 'Ghost', 'Ghost', 'anime-1', animeService);
      expect(result.status).toBe(404);
    });

    it('retourne 400 si aucun anime à deviner pour ce round', async () => {
      service.setPlayerProgress('room-1', 'Player', {
        currentRoundIndex: 99,
        guessesByRound: {},
        foundCharacters: [],
      });

      const { AnimeService } = await import('../AnimeService');
      const animeService = AnimeService.getInstance() as never;

      const result = await service.handleRoomGuess('room-1', 'Player', 'Player', 'anime-1', animeService);
      expect(result.status).toBe(400);
    });

    it('retourne 409 en cas de devinette dupliquée pour ce round', async () => {
      await setupRoomWithPlayer('room-dup', 'Player');
      service.setPlayerProgress('room-dup', 'Player', {
        currentRoundIndex: 0,
        guessesByRound: { 0: [{ anime: { id: 'anime-already' } }] },
        foundCharacters: [],
      });

      const { AnimeService } = await import('../AnimeService');
      const animeService = AnimeService.getInstance() as never;

      const result = await service.handleRoomGuess('room-dup', 'Player', 'Player', 'anime-already', animeService);
      expect(result.status).toBe(409);
    });

    it('retourne 200 avec le résultat de la devinette incorrecte', async () => {
      await setupRoomWithPlayer('room-ok', 'Player');

      const guessResult = makeGuessResult({ isCorrect: false });
      mocks.guessAnimeEndless.mockResolvedValue(guessResult);

      const { AnimeService } = await import('../AnimeService');
      const animeService = AnimeService.getInstance() as never;

      const result = await service.handleRoomGuess('room-ok', 'Player', 'Player', 'anime-wrong', animeService);

      expect(result.status).toBe(200);
      expect(result.body).toEqual(guessResult);
    });

    it('avance le currentRoundIndex en cas de bonne réponse', async () => {
      await setupRoomWithPlayer('room-win', 'Player');

      const guessResult = makeGuessResult({ isCorrect: true });
      mocks.guessAnimeEndless.mockResolvedValue(guessResult);

      const { AnimeService } = await import('../AnimeService');
      const animeService = AnimeService.getInstance() as never;

      await service.handleRoomGuess('room-win', 'Player', 'Player', 'anime-ref', animeService);

      const progress = service.getPlayerProgress('room-win', 'Player');
      expect(progress?.currentRoundIndex).toBe(1);
      expect(progress?.foundCharacters).toHaveLength(1);
    });
  });

  // ── resolveRoomWinnerIfFinished ───────────────────────────────────────────

  describe('resolveRoomWinnerIfFinished', () => {
    it("ne fait rien si tous les joueurs n'ont pas fini", async () => {
      const alice = makeSocket('Alice');
      const bob = makeSocket('Bob');

      service.joinRoom(alice as never, 'room-1');
      service.joinRoom(bob as never, 'room-1');

      mocks.getAnimeList.mockResolvedValue([makeRoomAnime('a1'), makeRoomAnime('a2')]);
      await service.startGame('room-1', 2);

      // Alice a fini, Bob non
      service.setPlayerProgress('room-1', 'Alice', {
        currentRoundIndex: 2,
        guessesByRound: { 0: [{}], 1: [{}] },
        foundCharacters: [],
      });

      alice.send.mockClear();
      bob.send.mockClear();

      service.resolveRoomWinnerIfFinished('room-1');

      const aliceWinMsg = alice.send.mock.calls.find((call) => JSON.parse(call[0] as string).type === 'win');
      expect(aliceWinMsg).toBeUndefined();
    });

    it("détermine le gagnant (moins d'essais total) quand tous ont fini", async () => {
      const alice = makeSocket('Alice');
      const bob = makeSocket('Bob');

      service.joinRoom(alice as never, 'room-1');
      service.joinRoom(bob as never, 'room-1');

      mocks.getAnimeList.mockResolvedValue([makeRoomAnime('a1')]);
      await service.startGame('room-1', 1);

      // Alice = 1 essai, Bob = 3 essais
      service.setPlayerProgress('room-1', 'Alice', {
        currentRoundIndex: 1,
        guessesByRound: { 0: [{ isCorrect: true }] },
        foundCharacters: [],
      });
      service.setPlayerProgress('room-1', 'Bob', {
        currentRoundIndex: 1,
        guessesByRound: { 0: [{}, {}, { isCorrect: true }] },
        foundCharacters: [],
      });

      alice.send.mockClear();
      bob.send.mockClear();

      service.resolveRoomWinnerIfFinished('room-1');

      const aliceMessages = alice.send.mock.calls.map((call) => JSON.parse(call[0] as string));
      const bobMessages = bob.send.mock.calls.map((call) => JSON.parse(call[0] as string));

      expect(aliceMessages.some((m) => m.type === 'win')).toBe(true);
      expect(bobMessages.some((m) => m.type === 'loose')).toBe(true);
    });

    it("déclare tous les joueurs gagnants en cas d'égalité", async () => {
      const alice = makeSocket('Alice');
      const bob = makeSocket('Bob');

      service.joinRoom(alice as never, 'room-tie');
      service.joinRoom(bob as never, 'room-tie');

      mocks.getAnimeList.mockResolvedValue([makeRoomAnime('a1')]);
      await service.startGame('room-tie', 1);

      // Alice et Bob = 2 essais chacun
      service.setPlayerProgress('room-tie', 'Alice', {
        currentRoundIndex: 1,
        guessesByRound: { 0: [{}, { isCorrect: true }] },
        foundCharacters: [],
      });
      service.setPlayerProgress('room-tie', 'Bob', {
        currentRoundIndex: 1,
        guessesByRound: { 0: [{}, { isCorrect: true }] },
        foundCharacters: [],
      });

      alice.send.mockClear();
      bob.send.mockClear();

      service.resolveRoomWinnerIfFinished('room-tie');

      const aliceMessages = alice.send.mock.calls.map((call) => JSON.parse(call[0] as string));
      const bobMessages = bob.send.mock.calls.map((call) => JSON.parse(call[0] as string));

      expect(aliceMessages.some((m) => m.type === 'win')).toBe(true);
      expect(bobMessages.some((m) => m.type === 'win')).toBe(true);
    });
  });

  // ── startGame ─────────────────────────────────────────────────────────────

  describe('startGame', () => {
    it('initialise la progression de chaque joueur de la salle', async () => {
      const alice = makeSocket('Alice');
      const bob = makeSocket('Bob');

      service.joinRoom(alice as never, 'room-1');
      service.joinRoom(bob as never, 'room-1');

      mocks.getAnimeList.mockResolvedValue([makeRoomAnime('a1'), makeRoomAnime('a2')]);
      await service.startGame('room-1', 2);

      expect(service.getPlayerProgress('room-1', 'Alice')).toEqual({
        currentRoundIndex: 0,
        guessesByRound: {},
        foundCharacters: [],
      });
      expect(service.getPlayerProgress('room-1', 'Bob')).toEqual({
        currentRoundIndex: 0,
        guessesByRound: {},
        foundCharacters: [],
      });
    });

    it('diffuse un message "start" à tous les joueurs', async () => {
      const alice = makeSocket('Alice');
      service.joinRoom(alice as never, 'room-1');

      mocks.getAnimeList.mockResolvedValue([makeRoomAnime('a1')]);

      alice.send.mockClear();
      await service.startGame('room-1', 1);

      const aliceMessages = alice.send.mock.calls.map((call) => JSON.parse(call[0] as string));
      expect(aliceMessages.some((m) => m.type === 'start')).toBe(true);
    });

    it("limite le nombre d'animes selon animeLimit", async () => {
      const socket = makeSocket('Alice');
      service.joinRoom(socket as never, 'room-1');

      const allAnimes = Array.from({ length: 10 }, (_, i) => makeRoomAnime(`a${i}`));
      mocks.getAnimeList.mockResolvedValue(allAnimes);

      await service.startGame('room-1', 3);

      expect(service.getRoomAnimes('room-1')).toHaveLength(3);
    });
  });
});
