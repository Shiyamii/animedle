
// Bun WebSocket API: utilise Bun.serve({ websocket: { ... } })
import { AnimeService } from "./services/AnimeService";
type WS = WebSocket & { roomId?: string };

// Room structure: { [roomId: string]: Set<WebSocket> }
const rooms: Record<string, Set<WS>> = {};


function joinRoom(ws: WS, roomId: string) {
  if (!rooms[roomId]) rooms[roomId] = new Set();
  rooms[roomId].add(ws);
  ws.roomId = roomId;
}


function leaveRoom(ws: WS) {
  const roomId = ws.roomId;
  if (roomId && rooms[roomId]) {
    rooms[roomId].delete(ws);
    if (rooms[roomId].size === 0) delete rooms[roomId];
  }
}


Bun.serve({
  port: 3001,
  fetch(req, server) {
    // Upgrade HTTP to WebSocket if possible
    if (server.upgrade(req)) {
      return undefined;
    }
    return new Response("WebSocket server only", { status: 400 });
  },
  websocket: {
    open(ws) {
      ws.send(JSON.stringify({ type: "welcome" }));
    },
    message(ws, data) {
      try {
        const msg = JSON.parse(data);
        if (msg.type === "join") {
          joinRoom(ws as WS, msg.roomId);
          ws.send(JSON.stringify({ type: "joined", roomId: msg.roomId }));
        } else if (msg.type === "proposal") {
          // Relai simple : on renvoie les couleurs reçues
          const room = rooms[(ws as WS).roomId!];
          if (room) {
            for (const client of room) {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify({ type: "proposal", colors: msg.colors, from: msg.from }));
              }
            }
          }
        }
      } catch (e) {
        ws.send(JSON.stringify({ type: "error", error: "Invalid message format" }));
      }
    },
    close(ws) {
      leaveRoom(ws as WS);
    },
  },
});

console.log("WebSocket server running on ws://localhost:3001");
