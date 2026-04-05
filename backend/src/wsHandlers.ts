// wsHandlers.ts
import { RoomService } from './services/RoomService';

const roomService = new RoomService();

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
        open(ws: WebSocket) {
            console.log('[WS OPEN] Nouvelle connexion WebSocket');
        },
        message(ws: WebSocket, message: string | Buffer) {
            let data: any;
            try {
                data = typeof message === 'string' ? JSON.parse(message) : JSON.parse(message.toString());
            } catch (e) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
                return;
            }
            if (data.type === 'join' && typeof data.roomId === 'string') {
                ws.data = { name: typeof data.name === 'string' ? data.name : undefined };
                roomService.joinRoom(ws, data.roomId);
                ws.send(JSON.stringify({ type: 'joined', roomId: data.roomId }));
                ws.send(JSON.stringify({ type: 'info', message: `Joined room ${data.roomId}` }));
            } else if (data.type === 'message' && typeof data.content === 'string') {
                const roomId = roomService.getRoomId(ws);
                const name = (ws.data && ws.data.name) || 'Anonyme';
                if (roomId) {
                    roomService.broadcastToRoom(
                        roomId,
                        JSON.stringify({ type: 'message', from: roomId, content: data.content, name }),
                        name // filtrage par nom
                    );
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
                }
            } else if (data.type === 'start') {
                const roomId = roomService.getRoomId(ws);
                // On attend que l'hôte envoie la limite d'animes (animeLimit)
                const animeLimit = typeof data.animeLimit === 'number' && data.animeLimit > 0 ? data.animeLimit : 5;
                if (roomId) {
                    roomService.startGame(roomId, animeLimit);
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
                }
            } else if (data.type === 'proposal') {
                // data: { type: 'proposal', guess, animeIdx, from }
                roomService.handleProposal(ws, data.guess, data.animeIdx);
            } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Unknown action' }));
            }
        },
        close(ws: WebSocket) {
            roomService.leaveRoom(ws);
            console.log('[WS CLOSE] Connexion fermée');
        }
    }
});

console.log("WebSocket server running on ws://localhost:3001");
