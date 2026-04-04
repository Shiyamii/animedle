import { upgradeWebSocket } from 'hono/bun';
import { Hono } from 'hono';

// Types et rooms
export type ChallengeWS = WebSocket & { roomId?: string };
const rooms: Record<string, Set<ChallengeWS>> = {};

function joinRoom(ws: ChallengeWS, roomId: string) {
  if (!rooms[roomId]) rooms[roomId] = new Set();
  rooms[roomId].add(ws);
  ws.roomId = roomId;
}

function leaveRoom(ws: ChallengeWS) {
  const roomId = ws.roomId;
  if (roomId && rooms[roomId]) {
    rooms[roomId].delete(ws);
    if (rooms[roomId].size === 0) delete rooms[roomId];
  }
}


const challengeWsRouter = new Hono();

challengeWsRouter.get('/ws/challenge', (c) => {
  if (!c.req.raw.headers.get('upgrade')) {
    return c.text('WebSocket endpoint', 400);
  }
  return upgradeWebSocket(c, {
    onOpen: (ws: any) => {
      ws.send(JSON.stringify({ type: 'welcome' }));
    },
    onMessage: (ws: any, event: any) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'join') {
          joinRoom(ws as ChallengeWS, msg.roomId);
          ws.data.roomId = msg.roomId;
          ws.send(JSON.stringify({ type: 'joined', roomId: msg.roomId }));
        } else if (msg.type === 'proposal') {
          const room = rooms[(ws as ChallengeWS).roomId!];
          if (room) {
            for (const client of room) {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify({ type: 'proposal', colors: msg.colors, from: msg.from }));
              }
            }
          }
        } else if (msg.type === 'start') {
          // Relaye à tous les membres de la room
          const room = rooms[(ws as ChallengeWS).roomId!];
          if (room) {
            for (const client of room) {
              if (client.readyState === 1) {
                client.send(JSON.stringify({ type: 'start' }));
              }
            }
          }
        }
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
      }
    },
    onClose: (ws: any) => {
      leaveRoom(ws as ChallengeWS);
    },
  });
});

export default challengeWsRouter;
