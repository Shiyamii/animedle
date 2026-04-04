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
type ErrorMsg = { type: "error"; error: string };
type WSMsg = ProposalMsg | JoinMsg | JoinedMsg | WelcomeMsg | ErrorMsg;

export default function ChallengePage() {
  const user = useUserStore((s) => s.user);
  const [roomId, setRoomId] = useState("");
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [animeLimit, setAnimeLimit] = useState(5);
  const [colors, setColors] = useState<string[][]>([]); // Tableau des couleurs reçues
  const wsRef = useRef<WebSocket | null>(null);
  const [gameStarted, setGameStarted] = useState(false);


  // Connexion WS
  useEffect(() => {
    if (!joinedRoom) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId: joinedRoom }));
    };
    ws.onmessage = (event) => {
      const msg: WSMsg = JSON.parse(event.data);
      if (msg.type === "proposal") {
        setColors((prev) => [...prev, msg.colors]);
      } else if (msg.type === "joined") {
        setIsHost(true); // À améliorer si plusieurs users
      } else if (msg.type === "start") {
        setGameStarted(true);
      }
    };
    ws.onerror = () => {
      alert("Erreur WebSocket");
    };
    ws.onclose = () => {
      wsRef.current = null;
    };
    return () => ws.close();
  }, [joinedRoom]);
  // Fonction pour démarrer la partie (réservée à l'hôte)
  const handleStartGame = () => {
    wsRef.current?.send(JSON.stringify({ type: "start" }));
  };

  // Création d'une room
  const handleCreate = () => {
    const id = Math.random().toString(36).slice(2, 8);
    setRoomId(id);
    setIsHost(true);
    setJoinedRoom(id);
  };

  // Rejoindre une room
  const handleJoin = () => {
    if (roomId.trim()) {
      setIsHost(false);
      setJoinedRoom(roomId.trim());
    }
  };

  // Envoi d'une proposition (dummy, à relier au guessing réel)
  const sendProposal = (colors: string[]) => {
    wsRef.current?.send(
      JSON.stringify({ type: "proposal", colors, from: user?.name || "anon" })
    );
  };

  // UI
  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto p-4 flex flex-col gap-6">
      <h1 className="text-2xl font-bold mb-2">Challenge multijoueur</h1>
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
            <Button color="primary" onClick={handleStartGame}>Démarrer la partie</Button>
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
