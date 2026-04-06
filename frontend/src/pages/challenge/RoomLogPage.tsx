

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useUserStore } from "../../stores/userStore";

const getWsUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_WS_URL;
  if (envUrl) return envUrl;
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.hostname}:3001`;
};

type WsLogEntry = { type: "send" | "recv" | "info" | "error"; content: string };

export default function RoomLogPage() {
  const [roomId, setRoomId] = useState("");
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [wsLog, setWsLog] = useState<WsLogEntry[]>([]);
  const [sendMsg, setSendMsg] = useState("");
  const [isWsOpen, setIsWsOpen] = useState(false);
  const user = useUserStore((s) => s.user);
  const userName = user?.name || "Anonyme";
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!joinedRoom) return;
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setIsWsOpen(true);
      const joinMsg = { type: "join", roomId: joinedRoom, name: userName };
      ws.send(JSON.stringify(joinMsg));
      setWsLog((log) => [...log, { type: "send", content: JSON.stringify(joinMsg) }]);
    };
    ws.onmessage = (event) => {
      setWsLog((log) => [...log, { type: "recv", content: event.data }]);
    };
    ws.onerror = (e) => {
      setWsLog((log) => [...log, { type: "error", content: "WebSocket error" }]);
    };
    ws.onclose = () => {
      wsRef.current = null;
      setIsWsOpen(false);
      setWsLog((log) => [...log, { type: "info", content: "WebSocket closed" }]);
    };
    return () => ws.close();
  }, [joinedRoom, userName]);

  const handleSend = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== 1 || !sendMsg.trim()) return;
    let toSend = "";
    let displayContent = "";
    try {
      const parsed = JSON.parse(sendMsg);
      if (!parsed.name) parsed.name = userName;
      toSend = JSON.stringify(parsed);
      displayContent = `[${parsed.name}] ${parsed.content ?? sendMsg}`;
    } catch {
      toSend = JSON.stringify({ type: "message", content: sendMsg, name: userName });
      displayContent = `[${userName}] ${sendMsg}`;
    }
    wsRef.current.send(toSend);
    setWsLog((log) => [...log, { type: "send", content: displayContent }]);
    setSendMsg("");
  }, [sendMsg, userName]);

  const handleJoin = useCallback(() => {
    if (roomId.trim()) {
      setJoinedRoom(roomId.trim());
      setWsLog([]);
    }
  }, [roomId]);

  const handleLeave = useCallback(() => {
    setJoinedRoom(null);
    setIsWsOpen(false);
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md flex flex-col gap-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-500">Vous êtes : <span className="font-mono font-bold text-blue-700">{userName}</span></div>
        {joinedRoom && (
          <span className="text-xs text-gray-400">Room : <span className="font-mono text-black">{joinedRoom}</span></span>
        )}
      </div>
      <div className="flex items-center gap-3 mb-2">
        <input
          type="text"
          placeholder="ID de la room"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={!!joinedRoom}
          className="border px-3 py-2 rounded w-56 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
        />
        {!joinedRoom ? (
          <button onClick={handleJoin} disabled={!roomId.trim()} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow disabled:opacity-50 transition">Rejoindre</button>
        ) : (
          <button onClick={handleLeave} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow transition">Quitter</button>
        )}
      </div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder='Message à envoyer (ex: {"type":"message","content":"Hello"})'
          value={sendMsg}
          onChange={(e) => setSendMsg(e.target.value)}
          disabled={!isWsOpen}
          className="border px-3 py-2 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-green-300 transition font-mono"
        />
        <button onClick={handleSend} disabled={!isWsOpen || !sendMsg.trim()} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow disabled:opacity-50 transition">
          Envoyer
        </button>
      </div>
      <div className="h-72 overflow-y-auto border rounded-lg p-3 bg-gray-50 shadow-inner">
        {wsLog.length === 0 ? (
          <div className="text-gray-400 text-center mt-8">Aucun message</div>
        ) : wsLog.map((entry, idx) => {
          let display = entry.content;
          if (entry.type === "recv") {
            try {
              const parsed = JSON.parse(entry.content);
              if (parsed.name && parsed.content) {
                display = <><span className="font-bold text-blue-700">{parsed.name}</span> : {parsed.content}</>;
              }
            } catch {}
          }
          if (entry.type === "send") {
            display = <><span className="font-bold text-green-700">{userName}</span> : {entry.content.replace(/^\[[^\]]+\]\s*/, "")}</>;
          }
          return (
            <div key={idx} className={`mb-1 flex items-center gap-2 ${entry.type === "send" ? "text-green-700" : entry.type === "recv" ? "text-black" : entry.type === "error" ? "text-red-600" : "text-gray-600"}`}>
              <span className="font-mono text-xs px-1 py-0.5 rounded bg-gray-200 mr-1">{entry.type.toUpperCase()}</span> {display}
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-gray-500 text-center">* Les messages envoyés doivent être au format JSON ou du texte simple. Les messages reçus sont affichés avec le nom de l'expéditeur si possible.</div>
    </div>
  );
}