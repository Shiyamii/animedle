
// Simple WebSocket client for multiplayer
export type WSMessage =
  { type: "join"; roomId: string } |
  { type: "joined"; roomId: string } |
  { type: "proposal"; colors: string[]; from?: string } |
  { type: "text"; text: string; from?: string } |
  { type: "error"; error: string };

export class WSClient {
  ws: WebSocket | null = null;
  listeners: ((msg: WSMessage) => void)[] = [];

  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.listeners.forEach((cb) => cb(msg));
      } catch {
        console.error("Error parsing message:", event.data);
      }
    };
  }

  joinRoom(roomId: string) {
    this.send({ type: "join", roomId });
    console.debug(`[WS INFO] Joining room ${roomId}...`);
  }

  sendProposal(colors: string[], from?: string) {
    this.send({ type: "proposal", colors, from });
    console.debug(`[WS INFO] Sending proposal: ${colors.join(", ")}`);
  }

  onMessage(cb: (msg: WSMessage) => void) {
    this.listeners.push(cb);
    console.debug(`[WS INFO] Added new message listener, total: ${this.listeners.length}`);
  }

    send(msg: WSMessage) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(msg));
      console.debug(`[WS INFO] Sent message:`, msg);
    }
  }
}
