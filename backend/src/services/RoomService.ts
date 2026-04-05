// RoomService.js (remplace .ts par .js si besoin)
const { AnimeService } = require("./AnimeService");
const console = require("node:console");

class RoomService {
  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
    this.roomAnimes = new Map();
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
    // Envoie la liste complète des joueurs à la personne qui vient de rejoindre
    const playerNames = Array.from(room).map(client => client.data && client.data.name ? client.data.name : 'Anonyme');
    try {
      ws.send(JSON.stringify({ type: 'players', players: playerNames }));
    } catch (e) { console.error('WS send error:', e); }
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
    console.log(`[WS INFO] Total animes available: ${animeList.length}`);
    console.log(`[WS INFO] Selected animes:`, animes.map(a => a.title));
    this.roomAnimes.set(roomId, animes);
    this.broadcastToRoom(
      roomId,
      JSON.stringify({ type: 'start', animes })
    );
    console.log(`[WS INFO] Game started in room ${roomId} with animes:`, animes.map(a => a.title));
  }

  getRoomAnimes(roomId) {
    return this.roomAnimes.get(roomId);
  }
}

module.exports = { RoomService };