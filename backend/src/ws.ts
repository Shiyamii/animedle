


import { Hono } from 'hono';
import { websocket } from 'hono/bun';

type ChallengeWS = WebSocket & { roomId?: string };
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



const wsRouter = new Hono();


wsRouter.get('/ws/challenge', websocket({
  open(ws: any) {
    ws.send(JSON.stringify({ type: 'welcome' }));
  },
  message(ws: any, data: any) {
    try {
      const msg = JSON.parse(data as string);
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
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
    }
  },
  close(ws: any) {
    leaveRoom(ws as ChallengeWS);
  },
}));

export default wsRouter;
