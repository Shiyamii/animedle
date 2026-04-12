// Simple WebSocket client for multiplayer
export type WSMessage =
  | { type: 'join'; roomId: string }
  | { type: 'joined'; roomId: string }
  | { type: 'proposal'; colors: string[]; from?: string }
  | { type: 'text'; text: string; from?: string }
  | { type: 'error'; error: string };

export class WSClient {
  ws: WebSocket | null = null;
  listeners: ((msg: WSMessage) => void)[] = [];

  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.listeners.forEach((cb) => {
          cb(msg);
        });
      } catch {
        /* ignore invalid messages */
      }
    };
  }

  joinRoom(roomId: string) {
    this.send({ type: 'join', roomId });
  }

  sendProposal(colors: string[], from?: string) {
    this.send({ type: 'proposal', colors, from });
  }

  onMessage(cb: (msg: WSMessage) => void) {
    this.listeners.push(cb);
  }

  send(msg: WSMessage) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
