import { roomService } from './services/RoomService';

type WsData = {
  name?: string;
  userId?: string;
};

type IncomingData =
  | { type: 'join'; roomId: string; name?: string; userId?: string }
  | { type: 'message'; content: string }
  | { type: 'start'; animeLimit?: number }
  | { type: 'proposal'; guess?: unknown; animeIdx?: unknown };

type GlobalWithWsServer = typeof globalThis & {
  __animedleWsServer?: Bun.Server<WsData>;
};

function parseIncomingData(message: string | Buffer): IncomingData | null {
  const raw = typeof message === 'string' ? message : message.toString();
  const parsed: unknown = JSON.parse(raw);

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const data = parsed as Record<string, unknown>;

  if (data.type === 'join' && typeof data.roomId === 'string') {
    return {
      type: 'join',
      roomId: data.roomId,
      name: typeof data.name === 'string' ? data.name : undefined,
      userId: typeof data.userId === 'string' ? data.userId : undefined,
    };
  }

  if (data.type === 'message' && typeof data.content === 'string') {
    return {
      type: 'message',
      content: data.content,
    };
  }

  if (data.type === 'start') {
    return {
      type: 'start',
      animeLimit: typeof data.animeLimit === 'number' ? data.animeLimit : undefined,
    };
  }

  if (data.type === 'proposal') {
    return {
      type: 'proposal',
      guess: data.guess,
      animeIdx: data.animeIdx,
    };
  }

  return null;
}

function handleJoin(
  socketConnection: Bun.ServerWebSocket<WsData>,
  data: Extract<IncomingData, { type: 'join' }>,
): void {
  socketConnection.data = {
    name: data.name,
    userId: data.userId,
  };

  roomService.joinRoom(socketConnection, data.roomId);
  socketConnection.send(JSON.stringify({ type: 'joined', roomId: data.roomId }));
  socketConnection.send(JSON.stringify({ type: 'info', message: `Joined room ${data.roomId}` }));
}

function handleMessage(
  socketConnection: Bun.ServerWebSocket<WsData>,
  data: Extract<IncomingData, { type: 'message' }>,
): void {
  const roomId = roomService.getRoomId(socketConnection);
  const name = socketConnection.data?.name || 'Anonyme';

  if (!roomId) {
    socketConnection.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
    return;
  }

  roomService.broadcastToRoom(
    roomId,
    JSON.stringify({ type: 'message', from: roomId, content: data.content, name }),
    name,
  );
}

function handleStart(
  socketConnection: Bun.ServerWebSocket<WsData>,
  data: Extract<IncomingData, { type: 'start' }>,
): void {
  const roomId = roomService.getRoomId(socketConnection);
  if (!roomId) {
    socketConnection.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
    return;
  }

  const animeLimit = typeof data.animeLimit === 'number' && data.animeLimit > 0 ? data.animeLimit : 5;
  roomService.startGame(roomId, animeLimit).catch(() => {
    socketConnection.send(JSON.stringify({ type: 'error', message: 'Failed to start game' }));
  });
}

function handleProposal(
  socketConnection: Bun.ServerWebSocket<WsData>,
  data: Extract<IncomingData, { type: 'proposal' }>,
): void {
  roomService.handleProposal(socketConnection, data.guess, data.animeIdx);
}

const globalWithWsServer = globalThis as GlobalWithWsServer;
if (!globalWithWsServer.__animedleWsServer) {
  globalWithWsServer.__animedleWsServer = Bun.serve<WsData>({
    port: 3001,
    fetch(req, server) {
      if (server.upgrade(req, { data: {} })) {
        return undefined;
      }
      return new Response('WebSocket server only', { status: 400 });
    },
    websocket: {
      open(_socketConnection: Bun.ServerWebSocket<WsData>) {},
      message(socketConnection: Bun.ServerWebSocket<WsData>, message: string | Buffer) {
        let data: IncomingData | null;

        try {
          data = parseIncomingData(message);
        } catch {
          socketConnection.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
          return;
        }

        if (!data) {
          socketConnection.send(JSON.stringify({ type: 'error', message: 'Unknown action' }));
          return;
        }

        switch (data.type) {
          case 'join':
            handleJoin(socketConnection, data);
            break;
          case 'message':
            handleMessage(socketConnection, data);
            break;
          case 'start':
            handleStart(socketConnection, data);
            break;
          case 'proposal':
            handleProposal(socketConnection, data);
            break;
        }
      },
      close(socketConnection: Bun.ServerWebSocket<WsData>) {
        roomService.leaveRoom(socketConnection);
      },
    },
  });
}
