// RoomService.ts
// Service pour la gestion des rooms WebSocket

import console from "node:console";

export class RoomService {
  private rooms: Map<string, Set<WebSocket>> = new Map();
  private socketToRoom: Map<WebSocket, string> = new Map();

  joinRoom(ws: WebSocket, roomId: string) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Set();
      this.rooms.set(roomId, room);
    }
    room.add(ws);
    this.socketToRoom.set(ws, roomId);
    const name = ws.data?.name || 'Anonyme';
    // Broadcast join event à tous sauf la personne qui vient de rejoindre
    this.broadcastToRoom(
      roomId,
      JSON.stringify({ type: 'join', name }),
      name
    );
    console.log(`[WS INFO] Client joined room ${roomId}`);
  }

  leaveRoom(ws: WebSocket) {
    const roomId = this.socketToRoom.get(ws);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          this.rooms.delete(roomId);
        }
      }
      const name = ws.data?.name || 'Anonyme';
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

  broadcastToRoom(roomId: string, message: string, senderName?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
      for (const ws of room) {
        if (senderName && ws.data && ws.data.name === senderName) continue;
        if (ws.readyState == 1) {
          ws.send(message);
        } 
      }
    
  }

  getRoomId(ws: WebSocket): string | undefined {
    return this.socketToRoom.get(ws);
  }
}
