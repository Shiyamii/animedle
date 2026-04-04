import React, { useState, useRef, useEffect } from "react";

const WS_URL = import.meta.env.VITE_BACKEND_WS_URL || `${window.location.protocol === "https:" ? "wss" : "ws"}://localhost:3000/ws/challenge`;

export default function RoomLogPage() {
  const [roomId, setRoomId] = useState("");
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [wsLog, setWsLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [sendMsg, setSendMsg] = useState('');
  const [isWsOpen, setIsWsOpen] = useState(false);

  useEffect(() => {
    if (!joinedRoom) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      setIsWsOpen(true);
      const joinMsg = { type: "join", roomId: joinedRoom };
      ws.send(JSON.stringify(joinMsg));
      setWsLog((log) => [...log, `[SEND] ${JSON.stringify(joinMsg)}`]);
      console.log('[WS OPEN] Connected, sent join:', joinMsg);
    };
    ws.onmessage = (event) => {
      setWsLog((log) => [...log, `[RECV] ${event.data}`]);
      console.log('[WS RECV]', event.data);
    };
    ws.onerror = (e) => {
      setWsLog((log) => [...log, `[ERROR] WebSocket error`]);
      console.error('[WS ERROR]', e);
    };
    ws.onclose = () => {
      wsRef.current = null;
      setIsWsOpen(false);
      setWsLog((log) => [...log, `[INFO] WebSocket closed`]);
      console.log('[WS CLOSE]');
    };
    return () => ws.close();
  }, [joinedRoom]);

  const handleJoin = () => {
    if (roomId.trim()) {
      setJoinedRoom(roomId.trim());
      setWsLog([]);
    }
  };

  const handleSend = () => {
    if (!wsRef.current || wsRef.current.readyState !== 1 || !sendMsg.trim()) return;
    let toSend = sendMsg;
    // Si c'est du JSON valide, on le stringifie pour homogénéité
    try {
      const parsed = JSON.parse(sendMsg);
      toSend = JSON.stringify(parsed);
    } catch (e) {
      // Ce n'est pas du JSON, on envoie tel quel
    }
    wsRef.current.send(toSend);
    setWsLog((log) => [...log, `[SEND] ${toSend}`]);
    setSendMsg('');
    console.log('[WS SEND]', toSend);
  };

  return (
    <div className="max-w-xl mx-auto p-4 flex flex-col gap-6">
      <h1 className="text-2xl font-bold mb-2">Room Log Viewer</h1>
      {!joinedRoom ? (
        <div className="flex gap-2 items-center">
          <input
            placeholder="Code de la partie"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            className="w-32 border rounded px-2 py-1"
          />
          <button onClick={handleJoin} className="bg-blue-500 text-white px-3 py-1 rounded">Voir les messages</button>
        </div>
      ) : (
        <>
          <div className="mb-2 text-sm">Room: <span className="font-mono">{joinedRoom}</span></div>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder='{"type":"start"}'
              value={sendMsg}
              onChange={e => setSendMsg(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-xs font-mono"
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              disabled={!isWsOpen}
            />
            <button
              onClick={handleSend}
              className="bg-green-500 text-white px-3 py-1 rounded text-xs"
              disabled={!isWsOpen || !sendMsg.trim()}
            >Envoyer</button>
          </div>
          <div className="bg-gray-100 border rounded p-2 max-h-96 overflow-y-auto text-xs">
            <div className="font-semibold mb-1">Log WebSocket</div>
            {wsLog.length === 0 ? <div className="text-gray-400">Aucun message</div> : wsLog.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </>
      )}
    </div>
  );
}
