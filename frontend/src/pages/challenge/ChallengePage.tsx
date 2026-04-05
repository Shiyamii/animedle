import React, { useEffect, useState, useRef, useCallback } from "react";
import { useUserStore } from "@/stores/userStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GuessTable from "@/components/GuessTable";
import { AutocompleteTextInput } from '@/components/AutoComplete';


// Affichage avatars/historique des persos trouvés
function FoundCharactersHistory({ foundCharacters }: { foundCharacters: { id: string, name: string, imageUrl?: string }[] }) {
  if (!foundCharacters.length) return null;
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="font-semibold text-sm">Personnages trouvés :</span>
      {foundCharacters.map((c) => (
        <div key={c.id} className="flex flex-col items-center">
          {c.imageUrl ? (
            <img src={c.imageUrl} alt={c.name} className="w-8 h-8 rounded-full object-cover border" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs">?</div>
          )}
          <span className="text-xs max-w-[60px] truncate">{c.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChallengePage() {
  // All state and store hooks should be declared at the top
  const location = typeof window !== 'undefined' ? window.location : { search: '' };
  const user = useUserStore((s) => s.user);
  // Si gameid dans l'URL, on l'utilise pour auto-join
  const searchParams = new URLSearchParams(location.search);
  const urlGameId = searchParams.get("gameid") || "";
  const [roomId, setRoomId] = useState(urlGameId);
  const [joinedRoom, setJoinedRoom] = useState<string | null>(urlGameId ? urlGameId : null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [wsLog, setWsLog] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [animeLimit, setAnimeLimit] = useState(5);
  const [animeList, setAnimeList] = useState<any[]>([]); // Liste des 5 animes de la room (à remplir via API)
  const [inputValue, setInputValue] = useState('');
  const [filteredAnimeList, setFilteredAnimeList] = useState<any[]>([]);
  const [isFilteringLoading, setIsFilteringLoading] = useState(false);
  const [guessesByAnime, setGuessesByAnime] = useState<{ [animeIdx: number]: any[] }>({}); // guesses par anime
  const [currentAnimeIdx, setCurrentAnimeIdx] = useState(0); // index de l'anime courant
  const [foundCharacters, setFoundCharacters] = useState<{ id: string, name: string, imageUrl?: string }[]>([]); // persos trouvés par l'utilisateur
  const [colors, setColors] = useState<string[][]>([]); // Historique des couleurs (à adapter si besoin)
  const wsRef = useRef<WebSocket | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [isWsOpen, setIsWsOpen] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [players, setPlayers] = useState<string[]>([]); // Liste des joueurs dans la room
  const Backend_url = import.meta.env.VITE_API_URL || '';


  useEffect(() => {
    if (!joinedRoom || !user || !user.name || !gameStarted) return;
    fetch(`${Backend_url}/api/room/${joinedRoom}/remaining?user=${encodeURIComponent(user.name)}`)
      .then(res => res.json())
      .then(data => setRemaining(data.remaining))
      .catch(() => setRemaining(null));
  }, [joinedRoom, user, gameStarted, currentAnimeIdx, guessesByAnime]);

  const getWsUrl = () => {
    const envUrl = import.meta.env.VITE_BACKEND_WS_URL;
    // remove trailing slash if exists
    if (envUrl && envUrl.endsWith("/")) return envUrl.slice(0, -1);
    if (envUrl) return envUrl;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.hostname}:3001`;
  };
  const WS_URL = getWsUrl();
 
  type ProposalMsg = { type: "proposal"; colors: string[]; from: string };
  type JoinMsg = { type: "join"; name: string };
  type LeaveMsg = { type: "leave"; name: string };
  type JoinedMsg = { type: "joined"; roomId: string };
  type PlayersMsg = { type: "players"; players: string[] };
  type WelcomeMsg = { type: "welcome" };
  type StartMsg = { type: "start" };
  type ErrorMsg = { type: "error"; error: string };
  type WSMsg = ProposalMsg | JoinMsg | LeaveMsg | JoinedMsg | PlayersMsg | WelcomeMsg | StartMsg | ErrorMsg;


  // Connexion WS (uniquement pour guesses/couleurs)
  useEffect(() => {
    if (!joinedRoom || !user || !user.name) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    let closed = false;
    ws.onopen = () => {
      setIsWsOpen(true);
      const joinMsg = { type: "join", roomId: joinedRoom, name: user.name };
      ws.send(JSON.stringify(joinMsg));
      setWsLog((log) => [...log, `[SEND] ${JSON.stringify(joinMsg)}`]);
      setPlayers([user.name]);
    };
    ws.onmessage = (event) => {
      setWsLog((log) => [...log, `[RECV] ${event.data}`]);
      const msg = JSON.parse(event.data);
      if (msg.type === "proposal") {
        // Ajoute le guess à l'anime courant
        setGuessesByAnime(prev => {
          const arr = prev[currentAnimeIdx] ? [...prev[currentAnimeIdx]] : [];
          arr.push(msg.guess);
          return { ...prev, [currentAnimeIdx]: arr };
        });
        // Si le guess est correct, ajoute le perso trouvé et passe à l'anime suivant
        if (msg.guess && msg.guess.isCorrect && animeList[currentAnimeIdx]) {
          setFoundCharacters(prev => ([...prev, {
            id: animeList[currentAnimeIdx].characterId,
            name: animeList[currentAnimeIdx].characterName,
            imageUrl: animeList[currentAnimeIdx].characterImageUrl
          }]));
          setCurrentAnimeIdx(idx => idx + 1);
        }
      } else if (msg.type === "joined") {
        setHasJoinedRoom(true);
      } else if (msg.type === "players") {
        setPlayers(msg.players);
      } else if (msg.type === "start") {
        setGameStarted(true);
      } else if (msg.type === "join") {
        setPlayers((prev) => prev.includes(msg.name) ? prev : [...prev, msg.name]);
        setWsLog((log) => [...log, `[INFO] ${msg.name} a rejoint la partie`]);
      } else if (msg.type === "leave") {
        setPlayers((prev) => prev.filter((n) => n !== msg.name));
        setWsLog((log) => [...log, `[INFO] ${msg.name} a quitté la partie`]);
      }
    };
    ws.onerror = () => {
      alert("Erreur WebSocket");
    };
    ws.onclose = () => {
      wsRef.current = null;
      setIsWsOpen(false);
      setHasJoinedRoom(false);
      setPlayers([]);
      if (!closed) setWsLog((log) => [...log, `[INFO] Déconnecté du serveur`]);
    };
    return () => {
      closed = true;
      ws.close();
    };
  }, [joinedRoom, user, currentAnimeIdx, animeList]);

  // Charge la liste des animes de la room via API
  useEffect(() => {
    if (!joinedRoom) return;
    fetch(`${Backend_url}/api/room/${joinedRoom}/animes`)
      .then(res => res.json())
      .then(data => setAnimeList(data.animes || []));
  }, [joinedRoom]);

  // Charge la progression du joueur via API (uniquement si la partie a commencé)
  const fetchProgression = useCallback(() => {
    if (!joinedRoom || !user || !user.name || !gameStarted) return;
    fetch(`${Backend_url}/api/room/${joinedRoom}/progression?user=${encodeURIComponent(user.name)}`)
      .then(res => res.json())
      .then(data => {
        setGuessesByAnime(data.guessesByAnime || {});
        setCurrentAnimeIdx(data.currentAnimeIdx || 0);
        setFoundCharacters(data.foundCharacters || []);
      });
  }, [joinedRoom, user, gameStarted]);

  useEffect(() => {
    fetchProgression();
  }, [fetchProgression]);
  // Fonction pour démarrer la partie (réservée à l'hôte, min 2 joueurs)
  const handleStartGame = () => {
    console.log('[DEBUG] handleStartGame called', { isWsOpen, hasJoinedRoom, players });
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !hasJoinedRoom || players.length < 2) {
      return;
    }
    const startMsg = { type: "start", animeLimit };
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

  // Fonction pour copier le lien d'invitation (doit être dans le composant pour accéder à joinedRoom)
  const handleCopyInvite = useCallback(() => {
    if (!joinedRoom) return;
    const url = `${window.location.origin}${window.location.pathname}?gameid=${joinedRoom}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setWsLog((log) => [...log, `[INFO] Lien copié: ${url}`]);
    }
  }, [joinedRoom, setWsLog]);

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

  // Envoi d'une proposition (API REST, comme daily)
  const handleGuess = async (animeId: string) => {
    if (!joinedRoom || !user?.name || !animeId) return;
    try {
      const res = await fetch(`${Backend_url}/api/room/${joinedRoom}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user.name, animeId })
      });
      if (!res.ok) return;
      const guessResult = await res.json();
      setGuessesByAnime((prev) => {
        const arr = prev[currentAnimeIdx] ? [...prev[currentAnimeIdx]] : [];
        arr.push(guessResult);
        return { ...prev, [currentAnimeIdx]: arr };
      });
      setInputValue('');
      // Si correct, avancer
      if (guessResult.isCorrect && animeList[currentAnimeIdx]) {
        setFoundCharacters((prev) => ([
          ...prev,
          {
            id: animeList[currentAnimeIdx].characterId,
            name: animeList[currentAnimeIdx].characterName,
            imageUrl: animeList[currentAnimeIdx].characterImageUrl,
          },
        ]));
        setCurrentAnimeIdx((idx) => idx + 1);
      }
    } catch (e) {
      // Optionnel: gestion d'erreur
    }
  };

  // UI
  if (!user) return <div className="text-center text-red-500">Vous devez être connecté pour jouer.</div>;

  return (
    <div className="max-w-xl mx-auto p-4 flex flex-col gap-6">
      <h1 className="text-2xl font-bold mb-2">Challenge multijoueur</h1>
      {/* Historique des personnages trouvés */}
      <FoundCharactersHistory foundCharacters={foundCharacters} />
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
            <span className="font-semibold">Room:</span> <span>{joinedRoom || "-"}</span>
            {joinedRoom ? (
              <button
                className="ml-2 px-2 py-1 text-xs bg-blue-100 rounded hover:bg-blue-200 border border-blue-300"
                onClick={handleCopyInvite}
                title="Copier le lien d'invitation"
              >
                Copier le lien d'invitation
              </button>
            ) : null}
          </div>
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
                  disabled={gameStarted}
                />
              </>
            )}
          </div>
          {isHost && !gameStarted && (
            <Button disabled={!isWsOpen || !hasJoinedRoom || players.length < 2} onClick={handleStartGame}>
              Démarrer la partie {players.length < 2 ? "(min 2 joueurs)" : ""}
            </Button>
          )}
          <div>
            <h2 className="font-semibold">Joueurs ({players.length})</h2>
            <ul className="text-xs mb-2">
              {players.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
          {gameStarted && (
            <>
              <div className="text-green-600 font-bold">La partie a commencé !</div>
              <div className="flex gap-2 mb-2">
                <button
                  className="px-2 py-1 text-xs bg-gray-200 rounded border border-gray-300 hover:bg-gray-300"
                  onClick={fetchProgression}
                >
                  Mettre à jour la progression
                </button>
              </div>
              {/* Affichage progression réelle */}
              {remaining !== null && (
                <div className="mb-2 text-sm font-semibold">
                  {remaining > 0
                    ? `Animes restants à deviner : ${remaining}`
                    : 'Partie terminée !'}
                </div>
              )}
              {/* Affichage de l'autocomplétion et guesses si partie non terminée */}
              {remaining && remaining > 0 ? (
                <>
                  <AutocompleteTextInput
                    values={filteredAnimeList}
                    inputValue={inputValue}
                    setInputValue={setInputValue}
                    isFilteringLoading={isFilteringLoading}
                    onSelect={(animeId) => handleGuess(animeId)}
                  />
                  <GuessTable
                    guesses={guessesByAnime[currentAnimeIdx] || []}
                    mode="challenge"
                  />
                </>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
