const { AnimeService } = require("./AnimeService");

class RoomService {

  private rooms: Map<string, Set<WebSocket>>;
  private socketToRoom: Map<WebSocket, string>
  private roomAnimes: Map<string, any[]>;
  private roomProgress: Map<string, { [playerName: string]: { currentAnimeIdx: number, guessesByAnime: { [animeIdx: number]: any[] }, foundCharacters: any[] } }>;

  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
    this.roomAnimes = new Map();
    this.roomProgress = new Map();
  }

  private getPlayerKeyFromSocket(ws) {
    return (ws.data && (ws.data.userId || ws.data.name)) || 'Anonyme';
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

  joinRoom(ws, roomId) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Set();
      this.rooms.set(roomId, room);
    }
    room.add(ws);
    this.socketToRoom.set(ws, roomId);
    const name = ws.data && ws.data.name ? ws.data.name : 'Anonyme';

    const playerNames = Array.from(room).map(client => client.data && client.data.name ? client.data.name : 'Anonyme');
    try {
      ws.send(JSON.stringify({ type: 'players', players: playerNames }));
    } catch (e) { console.error('WS send error:', e); }
    this.broadcastToRoom(
      roomId,
      JSON.stringify({ type: 'join', name }),
      name
    );
  }

  leaveRoom(ws) {
    const roomId = this.socketToRoom.get(ws);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          this.rooms.delete(roomId);
        }
      }
      const name = ws.data && ws.data.name ? ws.data.name : 'Anonyme';
      this.broadcastToRoom(
        roomId,
        JSON.stringify({ type: 'leave', name }),
        name
      );
      this.socketToRoom.delete(ws);
    }
  }

  broadcastToRoom(roomId, message, senderName) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const ws of room) {
      if (senderName && ws.data && ws.data.name === senderName) continue;
      if (ws.readyState == 1) {
        ws.send(message);
      }
    }
  }

  getRoomId(ws) {
    return this.socketToRoom.get(ws);
  }

  async startGame(roomId, animeLimit) {
    const animeList = await AnimeService.getInstance().getAnimeList();
    const shuffled = animeList.sort(() => Math.random() - 0.5);
    const animes = shuffled.slice(0, animeLimit);

    this.roomAnimes.set(roomId, animes);
    const room = this.rooms.get(roomId);
    if (room) {
      if (!this.roomProgress.has(roomId)) this.roomProgress.set(roomId, {});
      for (const ws of room) {
        const playerKey = this.getPlayerKeyFromSocket(ws);
        const name = ws.data && ws.data.name ? ws.data.name : playerKey;
        this.setPlayerProgress(roomId, playerKey, {
          currentAnimeIdx: 0,
          guessesByAnime: {},
          foundCharacters: [],
        });
      }
    }

    this.broadcastToRoom(
      roomId,
      JSON.stringify({ type: 'start' })
    );
  }

  handleProposal(ws, guess, animeIdx) {
    const roomId = this.getRoomId(ws);
    if (!roomId) return;
    const playerKey = this.getPlayerKeyFromSocket(ws);
    const name = ws.data && ws.data.name ? ws.data.name : playerKey;
    if (!this.roomProgress.has(roomId)) this.roomProgress.set(roomId, {});
    const progress = this.roomProgress.get(roomId);
    if (!progress[playerKey]) {
      progress[playerKey] = {
        currentAnimeIdx: 0,
        guessesByAnime: {},
        foundCharacters: [],
      };
    }
    if (!progress[playerKey].guessesByAnime[animeIdx]) progress[playerKey].guessesByAnime[animeIdx] = [];
    progress[playerKey].guessesByAnime[animeIdx].push(guess);
    const animes = this.roomAnimes.get(roomId) || [];
    if (guess && guess.isCorrect && animes[animeIdx]) {
      progress[playerKey].foundCharacters.push({
        id: animes[animeIdx].characterId,
        name: animes[animeIdx].characterName,
        imageUrl: animes[animeIdx].characterImageUrl,
      });
      progress[playerKey].currentAnimeIdx = animeIdx + 1;
    }
    ws.send(JSON.stringify({
      type: 'progression',
      guessesByAnime: progress[playerKey].guessesByAnime,
      currentAnimeIdx: progress[playerKey].currentAnimeIdx,
      foundCharacters: progress[playerKey].foundCharacters,
    }));
  }

  getRoomAnimes(roomId) {
    return this.roomAnimes.get(roomId);
  }
}

module.exports = { RoomService };