import React, { useEffect, useState, useRef } from "react";
import { useUserStore } from "@/stores/userStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GuessTable from "@/components/GuessTable";

// Utilise une variable d'environnement ou fallback sur localhost:3000
const WS_URL = import.meta.env.VITE_BACKEND_WS_URL || `${window.location.protocol === "https:" ? "wss" : "ws"}://localhost:3000/ws/challenge`;

type ProposalMsg = { type: "proposal"; colors: string[]; from: string };
type JoinMsg = { type: "join"; roomId: string };
type JoinedMsg = { type: "joined"; roomId: string };
type WelcomeMsg = { type: "welcome" };
type StartMsg = { type: "start" };
type ErrorMsg = { type: "error"; error: string };
type WSMsg = ProposalMsg | JoinMsg | JoinedMsg | WelcomeMsg | StartMsg | ErrorMsg;

export default function ChallengePage() {
  // Pour lire les paramètres d'URL
  const location = typeof window !== 'undefined' ? window.location : { search: '' };
  const user = useUserStore((s) => s.user);
  // Si gameid dans l'URL, on l'utilise pour auto-join
  const searchParams = new URLSearchParams(location.search);
  const urlGameId = searchParams.get("gameid") || "";
  const [roomId, setRoomId] = useState(urlGameId);
  const [joinedRoom, setJoinedRoom] = useState<string | null>(urlGameId ? urlGameId : null);
    // Log de tous les messages WebSocket (reçus/envoyés)
    const [wsLog, setWsLog] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [animeLimit, setAnimeLimit] = useState(5);
  const [colors, setColors] = useState<string[][]>([]); // Tableau des couleurs reçues
  const wsRef = useRef<WebSocket | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [isWsOpen, setIsWsOpen] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);


  // Connexion WS
  useEffect(() => {
    if (!joinedRoom) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      setIsWsOpen(true);
      const joinMsg = { type: "join", roomId: joinedRoom };
      ws.send(JSON.stringify(joinMsg));
      setWsLog((log) => [...log, `[SEND] ${JSON.stringify(joinMsg)}`]);
    };
    ws.onmessage = (event) => {
      setWsLog((log) => [...log, `[RECV] ${event.data}`]);
      const msg: WSMsg = JSON.parse(event.data);
      if (msg.type === "proposal") {
        setColors((prev) => [...prev, msg.colors]);
      } else if (msg.type === "joined") {
        setHasJoinedRoom(true);
      } else if (msg.type === "start") {
        setGameStarted(true);
      }
    };
    ws.onerror = () => {
      alert("Erreur WebSocket");
    };
    ws.onclose = () => {
      wsRef.current = null;
      setIsWsOpen(false);
      setHasJoinedRoom(false);
    };
    return () => ws.close();
  }, [joinedRoom]);
  // Fonction pour démarrer la partie (réservée à l'hôte)
  const handleStartGame = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !hasJoinedRoom) {
      return;
    }
    const startMsg = { type: "start" };
    wsRef.current.send(JSON.stringify(startMsg));
    setWsLog((log) => [...log, `[SEND] ${JSON.stringify(startMsg)}`]);
  };

  // Création d'une room
  const handleCreate = () => {
    const id = Math.random().toString(36).slice(2, 8);
    setRoomId(id);
    setIsHost(true);
    setJoinedRoom(id);
    setGameStarted(false);
    setColors([]);
    setHasJoinedRoom(false);
    setWsLog([]);
  };

  // Rejoindre une room
  const handleJoin = () => {
    if (roomId.trim()) {
      setIsHost(false);
      setJoinedRoom(roomId.trim());
      setGameStarted(false);
      setColors([]);
      setHasJoinedRoom(false);
      setWsLog([]);
    }
  };

  // Envoi d'une proposition (dummy, à relier au guessing réel)
  const sendProposal = (colors: string[]) => {
    const msg = { type: "proposal", colors, from: user?.name || "anon" };
    wsRef.current?.send(JSON.stringify(msg));
    setWsLog((log) => [...log, `[SEND] ${JSON.stringify(msg)}`]);
  };

  // UI
  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto p-4 flex flex-col gap-6">
      <h1 className="text-2xl font-bold mb-2">Challenge multijoueur</h1>
      {/* Log WebSocket/chat */}
      <div className="bg-gray-100 border rounded p-2 mb-2 max-h-40 overflow-y-auto text-xs">
        <div className="font-semibold mb-1">Log WebSocket</div>
        {wsLog.length === 0 ? <div className="text-gray-400">Aucun message</div> : wsLog.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      {!joinedRoom ? (
        <div className="flex flex-col gap-2">
          <div>
            <Button onClick={handleCreate} className="mr-2">Créer une partie</Button>
            <span>ou</span>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Code de la partie"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              className="w-32"
            />
            <Button onClick={handleJoin}>Rejoindre</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Room:</span> <span>{joinedRoom}</span>
            {isHost && (
              <>
                <span className="ml-4">Limite d'animes:</span>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={animeLimit}
                  onChange={e => setAnimeLimit(Number(e.target.value))}
                  className="w-16"
                />
              </>
            )}
          </div>
          {isHost && !gameStarted && (
            <Button disabled={!isWsOpen || !hasJoinedRoom} onClick={handleStartGame}>Démarrer la partie</Button>
          )}
          {gameStarted && <div className="text-green-600 font-bold">La partie a commencé !</div>}
          {/* Zone guessing (à relier au vrai composant) */}
          <GuessTable
            guesses={[]}
            onGuess={sendProposal}
            colors={colors[colors.length - 1] || []}
            mode="challenge"
          />
          <div>
            <h2 className="font-semibold">Historique des couleurs</h2>
            <div className="flex flex-col gap-1">
              {colors.map((c, i) => (
                <div key={i} className="text-xs">{c.join(", ")}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
