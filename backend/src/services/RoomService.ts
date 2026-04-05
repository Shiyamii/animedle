// RoomService.js (remplace .ts par .js si besoin)
const { AnimeService } = require("./AnimeService");
const console = require("node:console");

class RoomService {

  private rooms: Map<string, Set<WebSocket>>;
  private socketToRoom: Map<WebSocket, string>
  private roomAnimes: Map<string, any[]>;
  private roomProgress: Map<string, { [playerName: string]: { currentAnimeIdx: number, guessesByAnime: { [animeIdx: number]: any[] }, foundCharacters: any[] } }>;

  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
    this.roomAnimes = new Map();
    // Nouvelle structure: progression par room et par joueur
    // { [roomId]: { [playerName]: { currentAnimeIdx, guessesByAnime, foundCharacters } } }
    this.roomProgress = new Map();
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
    // Init progression pour ce joueur dans la room
    if (!this.roomProgress.has(roomId)) this.roomProgress.set(roomId, {});
    const progress = this.roomProgress.get(roomId);
    if (!progress[name]) {
      progress[name] = {
        currentAnimeIdx: 0,
        guessesByAnime: {},
        foundCharacters: [],
      };
    }
    // Envoie la liste complète des joueurs à la personne qui vient de rejoindre
    const playerNames = Array.from(room).map(client => client.data && client.data.name ? client.data.name : 'Anonyme');
    try {
      ws.send(JSON.stringify({ type: 'players', players: playerNames }));
    } catch (e) { console.error('WS send error:', e); }
    // (Ne plus envoyer la liste des animes ni la progression ici, tout passe par l'API REST)
    // Broadcast join event à tous sauf la personne qui vient de rejoindre
    this.broadcastToRoom(
      roomId,
      JSON.stringify({ type: 'join', name }),
      name
    );
    console.log(`[WS INFO] Client joined room ${roomId}`);
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
      // Broadcast leave event à tous sauf la personne qui quitte
      this.broadcastToRoom(
        roomId,
        JSON.stringify({ type: 'leave', name }),
        name
      );
      this.socketToRoom.delete(ws);
      console.log(`[WS INFO] Client left room ${roomId}`);
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

    console.log(`[WS INFO] Starting game in room ${roomId} with anime limit ${animeLimit}`);
    this.roomAnimes.set(roomId, animes);
    // Réinitialise la progression de tous les joueurs de la room
    const room = this.rooms.get(roomId);
    if (room) {
      if (!this.roomProgress.has(roomId)) this.roomProgress.set(roomId, {});
      for (const ws of room) {
        const name = ws.data && ws.data.name ? ws.data.name : 'Anonyme';
        this.roomProgress.get(roomId)[name] = {
          currentAnimeIdx: 0,
          guessesByAnime: {},
          foundCharacters: [],
        };
      }
    }
    // (Ne plus envoyer la liste des animes ni la progression ici, tout passe par l'API REST)
    // Broadcast start event
    // Envoyer à tous les joueurs, y compris l'hôte
    this.broadcastToRoom(
      roomId,
      JSON.stringify({ type: 'start' })
    );
    console.log(`[WS INFO] Game started in room ${roomId} with animes:`, animes.map(a => a.title));
  }

  // Gère la proposition d'un joueur (guess)
  handleProposal(ws, guess, animeIdx) {
    const roomId = this.getRoomId(ws);
    if (!roomId) return;
    const name = ws.data && ws.data.name ? ws.data.name : 'Anonyme';
    if (!this.roomProgress.has(roomId)) this.roomProgress.set(roomId, {});
    const progress = this.roomProgress.get(roomId);
    if (!progress[name]) {
      progress[name] = {
        currentAnimeIdx: 0,
        guessesByAnime: {},
        foundCharacters: [],
      };
    }
    // Ajoute le guess à la bonne liste
    if (!progress[name].guessesByAnime[animeIdx]) progress[name].guessesByAnime[animeIdx] = [];
    progress[name].guessesByAnime[animeIdx].push(guess);
    // Si le guess est correct, ajoute le perso trouvé et avance
    const animes = this.roomAnimes.get(roomId) || [];
    if (guess && guess.isCorrect && animes[animeIdx]) {
      progress[name].foundCharacters.push({
        id: animes[animeIdx].characterId,
        name: animes[animeIdx].characterName,
        imageUrl: animes[animeIdx].characterImageUrl,
      });
      progress[name].currentAnimeIdx = animeIdx + 1;
    }
    // Envoie la progression à ce joueur
    ws.send(JSON.stringify({
      type: 'progression',
      guessesByAnime: progress[name].guessesByAnime,
      currentAnimeIdx: progress[name].currentAnimeIdx,
      foundCharacters: progress[name].foundCharacters,
    }));
  }

  getRoomAnimes(roomId) {
    return this.roomAnimes.get(roomId);
  }
}

module.exports = { RoomService };