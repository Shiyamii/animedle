import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Fuse from 'fuse.js';
import { createFuse, filterAnimeList } from '@/viewmodels/guessingViewModel';
import { useAnimeStore } from '@/stores/animeStore';
import type { AnimeItemDTO, GuessResultDTO } from '@/stores/animeStore';
import { useUserStore } from '@/stores/userStore';

type RoomAnime = {
  animeId: string;
  characterId: string;
  characterName: string;
  characterImageUrl?: string;
};

type WSProposalMsg = { type: 'proposal'; guess: GuessResultDTO };
type WSOpponentAttemptMsg = {
  type: 'challenge-attempt';
  playerKey: string;
  playerName: string;
  animeIdx: number;
  animeId: string;
  animeTitle: string;
  guessNumber: number;
};
type WSOpponentFoundMsg = {
  type: 'challenge-found';
  playerKey: string;
  playerName: string;
  animeIdx: number;
  animeId: string;
  animeTitle: string;
  guessNumber: number;
};
type WSJoinMsg = { type: 'join'; name: string };
type WSLeaveMsg = { type: 'leave'; name: string };
type WSJoinedMsg = { type: 'joined'; roomId: string };
type WSPlayersMsg = { type: 'players'; players: string[] };
type WSStartMsg = { type: 'start' };
type WSWinMsg = { type: 'win' };
type WSLooseMsg = { type: 'loose'; winner?: string };
type WSErrorMsg = { type: 'error'; error: string };
type WSMsg =
  | WSProposalMsg
  | WSOpponentAttemptMsg
  | WSOpponentFoundMsg
  | WSJoinMsg
  | WSLeaveMsg
  | WSJoinedMsg
  | WSPlayersMsg
  | WSStartMsg
  | WSWinMsg
  | WSLooseMsg
  | WSErrorMsg;
type GameOutcome = 'win' | 'loose' | null;

function getInitialUrlGameId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('gameid') || '';
}

function getInitialIsHost(urlGameId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const hostRoom = localStorage.getItem('challenge_host_room');
  return !!hostRoom && hostRoom === urlGameId;
}

function getWsUrl(): string {
  const envUrl = import.meta.env.VITE_BACKEND_WS_URL;
  if (envUrl && envUrl.endsWith('/')) {
    return envUrl.slice(0, -1);
  }
  if (envUrl) {
    return envUrl;
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.hostname}:3001`;
}

function normalizeGuessesByAnime(value: Record<string, GuessResultDTO[]>): { [animeIdx: number]: GuessResultDTO[] } {
  const normalized: { [animeIdx: number]: GuessResultDTO[] } = {};
  for (const [animeIdx, guesses] of Object.entries(value || {})) {
    normalized[Number(animeIdx)] = [...guesses].reverse();
  }
  return normalized;
}

export function useChallengePageViewModel() {
  const animeStore = useAnimeStore();
  const user = useUserStore((s) => s.user);
  const playerKey = user?.id || user?.name;
  const backendUrl = import.meta.env.VITE_API_URL || '';
  const wsRef = useRef<WebSocket | null>(null);

  const urlGameId = getInitialUrlGameId();

  const [roomId, setRoomId] = useState(urlGameId);
  const [joinedRoom, setJoinedRoom] = useState<string | null>(urlGameId || null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [wsLog, setWsLog] = useState<string[]>([]);
  const [isHost, setIsHost] = useState<boolean>(() => getInitialIsHost(urlGameId));
  const [animeLimit, setAnimeLimit] = useState(5);
  const [animeList, setAnimeList] = useState<RoomAnime[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [guessesByAnime, setGuessesByAnime] = useState<{ [animeIdx: number]: GuessResultDTO[] }>({});
  const [opponentAttemptsByAnime, setOpponentAttemptsByAnime] = useState<{
    [animeIdx: number]: Array<{ playerKey: string; playerName: string; animeId: string; animeTitle: string; guessNumber: number }>;
  }>({});
  const [opponentFoundByAnime, setOpponentFoundByAnime] = useState<{
    [animeIdx: number]: Array<{ playerKey: string; playerName: string; animeId: string; animeTitle: string; guessNumber: number }>;
  }>({});
  const [currentAnimeIdx, setCurrentAnimeIdx] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOutcome, setGameOutcome] = useState<GameOutcome>(null);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [isWsOpen, setIsWsOpen] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [players, setPlayers] = useState<string[]>([]);
  const currentAnimeIdxRef = useRef(0);

  useEffect(() => {
    currentAnimeIdxRef.current = currentAnimeIdx;
  }, [currentAnimeIdx]);

  const fetchRemaining = useCallback(async () => {
    if (!joinedRoom || !playerKey || !gameStarted) {
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/api/room/${joinedRoom}/remaining?userId=${encodeURIComponent(playerKey)}`);
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      setRemaining(data.remaining);
    } catch {
      // no-op
    }
  }, [joinedRoom, playerKey, gameStarted, backendUrl]);

  const fetchProgression = useCallback(async () => {
    if (!joinedRoom || !playerKey) {
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/api/room/${joinedRoom}/progression?userId=${encodeURIComponent(playerKey)}`);
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      setGuessesByAnime(normalizeGuessesByAnime(data.guessesByAnime || {}));
      setCurrentAnimeIdx(data.currentAnimeIdx || 0);
    } catch {
      // no-op
    }
  }, [joinedRoom, playerKey, backendUrl]);

  const currentRoundGuessedAnimeIds = useMemo(() => {
    return new Set((guessesByAnime[currentAnimeIdx] || []).map((guess) => guess.anime.id));
  }, [guessesByAnime, currentAnimeIdx]);

  const guessableAnimeList = useMemo(() => {
    return animeStore.animeList.filter((anime: AnimeItemDTO) => !currentRoundGuessedAnimeIds.has(anime.id));
  }, [animeStore.animeList, currentRoundGuessedAnimeIds]);

  const fuse: Fuse<AnimeItemDTO> = useMemo(() => createFuse(guessableAnimeList), [guessableAnimeList]);

  const filteredAnimeList = useMemo(() => {
    if (!inputValue) {
      return [];
    }
    return filterAnimeList(fuse, inputValue);
  }, [inputValue, fuse]);

  const correctGuessesHistory = useMemo(() => {
    return Object.entries(guessesByAnime)
      .map(([animeIdx, guesses]) => ({ animeIdx: Number(animeIdx), guesses }))
      .sort((a, b) => a.animeIdx - b.animeIdx)
      .map(({ guesses }) => guesses.find((guess) => guess.isCorrect))
      .filter((guess): guess is GuessResultDTO => !!guess);
  }, [guessesByAnime]);

  const currentRoundOpponentAttempts = useMemo(
    () => opponentAttemptsByAnime[currentAnimeIdx] || [],
    [opponentAttemptsByAnime, currentAnimeIdx],
  );

  const currentRoundOpponentFound = useMemo(
    () => opponentFoundByAnime[currentAnimeIdx] || [],
    [opponentFoundByAnime, currentAnimeIdx],
  );

  const isFilteringLoading = false;

  useEffect(() => {
    if (!joinedRoom || !user?.name) {
      return;
    }

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    let closed = false;

    ws.onopen = () => {
      setIsWsOpen(true);
      const joinMsg = { type: 'join', roomId: joinedRoom, name: user.name, userId: user.id };
      ws.send(JSON.stringify(joinMsg));
      setWsLog((log) => [...log, `[SEND] ${JSON.stringify(joinMsg)}`]);
      setPlayers([user.name]);
    };

    ws.onmessage = (event) => {
      setWsLog((log) => [...log, `[RECV] ${event.data}`]);
      const msg = JSON.parse(event.data) as WSMsg;

      if (msg.type === 'proposal') {
        setGuessesByAnime((prev) => {
          const animeIdx = currentAnimeIdxRef.current;
          const arr = prev[animeIdx] ? [...prev[animeIdx]] : [];
          arr.push(msg.guess);
          return { ...prev, [animeIdx]: arr };
        });
      } else if (msg.type === 'challenge-attempt') {
        if (!playerKey || msg.playerKey === playerKey) {
          return;
        }
        setOpponentAttemptsByAnime((prev) => {
          const arr = prev[msg.animeIdx] ? [...prev[msg.animeIdx]] : [];
          arr.push({
            playerKey: msg.playerKey,
            playerName: msg.playerName,
            animeId: msg.animeId,
            animeTitle: msg.animeTitle,
            guessNumber: msg.guessNumber,
          });
          return { ...prev, [msg.animeIdx]: arr };
        });
      } else if (msg.type === 'challenge-found') {
        if (!playerKey || msg.playerKey === playerKey) {
          return;
        }
        setOpponentFoundByAnime((prev) => {
          const arr = prev[msg.animeIdx] ? [...prev[msg.animeIdx]] : [];
          arr.push({
            playerKey: msg.playerKey,
            playerName: msg.playerName,
            animeId: msg.animeId,
            animeTitle: msg.animeTitle,
            guessNumber: msg.guessNumber,
          });
          return { ...prev, [msg.animeIdx]: arr };
        });
      } else if (msg.type === 'joined') {
        setHasJoinedRoom(true);
      } else if (msg.type === 'players') {
        setPlayers(msg.players);
      } else if (msg.type === 'start') {
        setWsLog((log) => [...log, '[DEBUG] Message WS "start" reçu, on démarre la partie']);
        setGameStarted(true);
        setGameOutcome(null);
        setWinnerName(null);
        setOpponentAttemptsByAnime({});
        setOpponentFoundByAnime({});
        fetchProgression().catch(() => {});
        fetchRemaining().catch(() => {});
      } else if (msg.type === 'win') {
        setWsLog((log) => [...log, '[GAME] You win']);
        setGameOutcome('win');
        setWinnerName(user?.name || null);
        setRemaining(0);
      } else if (msg.type === 'loose') {
        setWsLog((log) => [...log, `[GAME] You loose${msg.winner ? ` (winner: ${msg.winner})` : ''}`]);
        setGameOutcome('loose');
        setWinnerName(msg.winner || null);
        setRemaining(0);
      } else if (msg.type === 'join') {
        setPlayers((prev) => (prev.includes(msg.name) ? prev : [...prev, msg.name]));
        setWsLog((log) => [...log, `[INFO] ${msg.name} a rejoint la partie`]);
      } else if (msg.type === 'leave') {
        setPlayers((prev) => prev.filter((n) => n !== msg.name));
        setWsLog((log) => [...log, `[INFO] ${msg.name} a quitté la partie`]);
      }
    };

    ws.onerror = () => {
      alert('Erreur WebSocket');
    };

    ws.onclose = () => {
      wsRef.current = null;
      setIsWsOpen(false);
      setHasJoinedRoom(false);
      setPlayers([]);
      if (!closed) {
        setWsLog((log) => [...log, '[INFO] Déconnecté du serveur']);
      }
    };

    return () => {
      closed = true;
      ws.close();
    };
  }, [joinedRoom, user?.name, user?.id, playerKey, fetchProgression, fetchRemaining]);

  useEffect(() => {
    if (!joinedRoom) {
      return;
    }

    fetch(`${backendUrl}/api/room/${joinedRoom}/animes`)
      .then((res) => res.json())
      .then((data) => {
        setAnimeList(data.animes || []);
      })
      .catch(() => {
        setAnimeList([]);
      });
  }, [joinedRoom, backendUrl]);


  useEffect(() => {
    if (animeStore.animeList.length === 0) {
      animeStore.loadAnimeList().catch(() => {});
    }
  }, [animeStore]);

  useEffect(() => {
    fetchProgression().catch(() => {});
  }, [fetchProgression]);

  useEffect(() => {
    fetchRemaining().catch(() => {});
  }, [fetchRemaining]);

  useEffect(() => {
    if (!joinedRoom) {
      return;
    }

    fetch(`${backendUrl}/api/room/${joinedRoom}/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data.started) {
          setGameStarted(true);
        }
      })
      .catch(() => {});
  }, [joinedRoom, backendUrl]);

  const handleStartGame = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !hasJoinedRoom || players.length < 2) {
      return;
    }

    const startMsg = { type: 'start', animeLimit };
    wsRef.current.send(JSON.stringify(startMsg));
    setWsLog((log) => [...log, `[SEND] ${JSON.stringify(startMsg)}`]);
  };

  const handleCreate = () => {
    const id = Math.random().toString(36).slice(2, 8);
    setRoomId(id);
    setIsHost(true);
    setJoinedRoom(id);
    setGameStarted(false);
    setGameOutcome(null);
    setWinnerName(null);
    setHasJoinedRoom(false);
    setWsLog([]);

    if (typeof window !== 'undefined') {
      localStorage.setItem('challenge_host_room', id);
      window.location.href = `${window.location.pathname}?gameid=${id}`;
    }
  };

  const handleCopyInvite = useCallback(() => {
    if (!joinedRoom) {
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}?gameid=${joinedRoom}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setWsLog((log) => [...log, `[INFO] Lien copié: ${url}`]);
    }
  }, [joinedRoom]);

  const handleJoin = () => {
    if (!roomId.trim()) {
      return;
    }

    const cleanRoomId = roomId.trim();
    setIsHost(false);
    setJoinedRoom(cleanRoomId);
    setGameStarted(false);
    setGameOutcome(null);
    setWinnerName(null);
    setHasJoinedRoom(false);
    setWsLog([]);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('challenge_host_room');
      window.location.href = `${window.location.pathname}?gameid=${cleanRoomId}`;
    }
  };

  const handleGuess = async (animeId: string) => {
    setWsLog((log) => [...log, `[DEBUG] Selection animeId=${animeId}`]);

    if (currentRoundGuessedAnimeIds.has(animeId)) {
      setWsLog((log) => [...log, `[WARN] Duplicate guess blocked animeId=${animeId}`]);
      return;
    }

    if (!joinedRoom) {
      setWsLog((log) => [...log, '[ERROR] Guess blocked: no joined room']);
      return;
    }

    if (!playerKey || !user?.name) {
      setWsLog((log) => [...log, '[ERROR] Guess blocked: no user']);
      return;
    }

    if (!animeList[currentAnimeIdx]) {
      setWsLog((log) => [...log, `[WARN] No target anime for index=${currentAnimeIdx}, trying request anyway`]);
    }

    setWsLog((log) => [...log, `[SEND] POST /api/room/${joinedRoom}/guess animeId=${animeId}`]);
    let response: Response;
    try {
      response = await fetch(`${backendUrl}/api/room/${joinedRoom}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: playerKey, user: user.name, animeId }),
      });
    } catch (error) {
      setWsLog((log) => [...log, `[ERROR] Guess request crashed: ${String(error)}`]);
      return;
    }

    if (!response.ok) {
      setWsLog((log) => [...log, `[ERROR] Guess failed status=${response.status}`]);
      return;
    }

    const guessResult: GuessResultDTO = await response.json();
    setWsLog((log) => [...log, `[RECV] Guess success isCorrect=${guessResult.isCorrect}`]);

    setInputValue('');
    await fetchProgression();
    await fetchRemaining();
  };

  return {
    user,
    roomId,
    setRoomId,
    joinedRoom,
    remaining,
    wsLog,
    isHost,
    animeLimit,
    setAnimeLimit,
    inputValue,
    setInputValue,
    filteredAnimeList,
    isFilteringLoading,
    correctGuessesHistory,
    guessesByAnime,
    currentAnimeIdx,
    gameStarted,
    gameOutcome,
    winnerName,
    isWsOpen,
    hasJoinedRoom,
    players,
    currentRoundOpponentAttempts,
    currentRoundOpponentFound,
    animeStore,
    fetchProgression,
    handleStartGame,
    handleCreate,
    handleCopyInvite,
    handleJoin,
    handleGuess,
  };
}
