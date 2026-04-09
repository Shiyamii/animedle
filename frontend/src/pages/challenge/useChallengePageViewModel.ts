import type Fuse from 'fuse.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnimeItemDTO, GuessResultDTO } from '@/stores/animeStore';
import { useAnimeStore } from '@/stores/animeStore';
import { useUserStore } from '@/stores/userStore';
import { createFuse, filterAnimeList } from '@/viewmodels/guessingViewModel';
import { useChallengeStore } from '../../stores/challengeStore';

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
  roundIndex: number;
  guessedAnimeId: string;
  guessedAnimeTitle: string;
  guessNumber: number;
};
type WSOpponentFoundMsg = {
  type: 'challenge-found';
  playerKey: string;
  playerName: string;
  roundIndex: number;
  foundAnimeId: string;
  foundAnimeTitle: string;
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

function getWsUrl(): string {
  const envUrl = import.meta.env.VITE_BACKEND_WS_URL;
  if (envUrl?.endsWith('/')) {
    return envUrl.slice(0, -1);
  }
  if (envUrl) {
    return envUrl;
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.hostname}:3001`;
}

function normalizeGuessesByRound(value: Record<string, GuessResultDTO[]>): { [roundIndex: number]: GuessResultDTO[] } {
  const normalized: { [roundIndex: number]: GuessResultDTO[] } = {};
  for (const [roundIndex, guesses] of Object.entries(value || {})) {
    normalized[Number(roundIndex)] = [...guesses].reverse();
  }
  return normalized;
}

export function useChallengePageViewModel() {
  const animeStore = useAnimeStore();
  const hostRoomId = useChallengeStore((s) => s.hostRoomId);
  const setHostRoomId = useChallengeStore((s) => s.setHostRoomId);
  const clearHostRoomId = useChallengeStore((s) => s.clearHostRoomId);
  const user = useUserStore((s) => s.user);
  const playerKey = user?.id || user?.name;
  const backendUrl = import.meta.env.VITE_API_URL || '';
  const wsRef = useRef<WebSocket | null>(null);

  const urlGameId = getInitialUrlGameId();

  const [roomId, setRoomId] = useState(urlGameId);
  const [joinedRoom, setJoinedRoom] = useState<string | null>(urlGameId || null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [wsLog, setWsLog] = useState<string[]>([]);
  const [animeLimit, setAnimeLimit] = useState(5);
  const [animeList, setAnimeList] = useState<RoomAnime[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [guessesByRound, setGuessesByRound] = useState<{ [roundIndex: number]: GuessResultDTO[] }>({});
  const [opponentAttemptsByRound, setOpponentAttemptsByRound] = useState<{
    [roundIndex: number]: Array<{
      playerKey: string;
      playerName: string;
      guessedAnimeId: string;
      guessedAnimeTitle: string;
      guessNumber: number;
    }>;
  }>({});
  const [opponentFoundByRound, setOpponentFoundByRound] = useState<{
    [roundIndex: number]: Array<{
      playerKey: string;
      playerName: string;
      foundAnimeId: string;
      foundAnimeTitle: string;
      guessNumber: number;
    }>;
  }>({});
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOutcome, setGameOutcome] = useState<GameOutcome>(null);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [isWsOpen, setIsWsOpen] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [players, setPlayers] = useState<string[]>([]);
  const currentRoundIndexRef = useRef(0);
  const gameStartedRef = useRef(false);

  useEffect(() => {
    currentRoundIndexRef.current = currentRoundIndex;
  }, [currentRoundIndex]);

  useEffect(() => {
    gameStartedRef.current = gameStarted;
  }, [gameStarted]);

  const fetchRemaining = useCallback(
    async (force = false) => {
      if (!(joinedRoom && playerKey && (force || gameStartedRef.current))) {
        return;
      }

      try {
        const res = await fetch(
          `${backendUrl}/api/room/${joinedRoom}/remaining?userId=${encodeURIComponent(playerKey)}`,
        );
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        setRemaining(data.remaining);
      } catch {
        // ignore request errors
      }
    },
    [joinedRoom, playerKey, backendUrl],
  );

  const fetchProgression = useCallback(async () => {
    if (!(joinedRoom && playerKey)) {
      return;
    }

    try {
      const res = await fetch(
        `${backendUrl}/api/room/${joinedRoom}/progression?userId=${encodeURIComponent(playerKey)}`,
      );
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      setGuessesByRound(normalizeGuessesByRound(data.guessesByRound || {}));
      setCurrentRoundIndex(data.currentRoundIndex || 0);
    } catch {
      // ignore request errors
    }
  }, [joinedRoom, playerKey, backendUrl]);

  const currentRoundGuessedAnimeIds = useMemo(() => {
    return new Set((guessesByRound[currentRoundIndex] || []).map((guess) => guess.anime.id));
  }, [guessesByRound, currentRoundIndex]);

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
    return Object.entries(guessesByRound)
      .map(([roundIndex, guesses]) => ({ roundIndex: Number(roundIndex), guesses }))
      .sort((a, b) => a.roundIndex - b.roundIndex)
      .map(({ guesses }) => guesses.find((guess) => guess.isCorrect))
      .filter((guess): guess is GuessResultDTO => !!guess);
  }, [guessesByRound]);

  const currentRoundOpponentAttempts = useMemo(
    () => opponentAttemptsByRound[currentRoundIndex] || [],
    [opponentAttemptsByRound, currentRoundIndex],
  );

  const currentRoundOpponentFound = useMemo(
    () => opponentFoundByRound[currentRoundIndex] || [],
    [opponentFoundByRound, currentRoundIndex],
  );

  const isHost = hostRoomId === joinedRoom;

  const isFilteringLoading = false;

  useEffect(() => {
    if (!(joinedRoom && user?.name)) {
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
        setGuessesByRound((prev) => {
          const roundIndex = currentRoundIndexRef.current;
          const arr = prev[roundIndex] ? [...prev[roundIndex]] : [];
          arr.push(msg.guess);
          return { ...prev, [roundIndex]: arr };
        });
      } else if (msg.type === 'challenge-attempt') {
        if (!playerKey || msg.playerKey === playerKey) {
          return;
        }
        setOpponentAttemptsByRound((prev) => {
          const arr = prev[msg.roundIndex] ? [...prev[msg.roundIndex]] : [];
          arr.push({
            playerKey: msg.playerKey,
            playerName: msg.playerName,
            guessedAnimeId: msg.guessedAnimeId,
            guessedAnimeTitle: msg.guessedAnimeTitle,
            guessNumber: msg.guessNumber,
          });
          return { ...prev, [msg.roundIndex]: arr };
        });
      } else if (msg.type === 'challenge-found') {
        if (!playerKey || msg.playerKey === playerKey) {
          return;
        }
        setOpponentFoundByRound((prev) => {
          const arr = prev[msg.roundIndex] ? [...prev[msg.roundIndex]] : [];
          arr.push({
            playerKey: msg.playerKey,
            playerName: msg.playerName,
            foundAnimeId: msg.foundAnimeId,
            foundAnimeTitle: msg.foundAnimeTitle,
            guessNumber: msg.guessNumber,
          });
          return { ...prev, [msg.roundIndex]: arr };
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
        setOpponentAttemptsByRound({});
        setOpponentFoundByRound({});
        fetchProgression().catch(() => {});
        fetchRemaining(true).catch(() => {});
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

    const loadRoomState = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/room/${joinedRoom}/animes`);
        const data = await res.json();
        setAnimeList(data.animes || []);
      } catch {
        setAnimeList([]);
      }

      try {
        const res = await fetch(`${backendUrl}/api/room/${joinedRoom}/status`);
        const data = await res.json();
        if (data.started) {
          setGameStarted(true);
        }
      } catch {
        // ignore request errors
      }
    };

    loadRoomState().catch(() => {
      // ignore request errors
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
    setHostRoomId(id);
    setJoinedRoom(id);
    setGameStarted(false);
    setGameOutcome(null);
    setWinnerName(null);
    setHasJoinedRoom(false);
    setWsLog([]);

    if (typeof window !== 'undefined') {
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
    setJoinedRoom(cleanRoomId);
    setGameStarted(false);
    setGameOutcome(null);
    setWinnerName(null);
    setHasJoinedRoom(false);
    setWsLog([]);

    if (typeof window !== 'undefined') {
      clearHostRoomId();
      window.location.href = `${window.location.pathname}?gameid=${cleanRoomId}`;
    }
  };

  const handleGuess = async (guessedAnimeId: string) => {
    setWsLog((log) => [...log, `[DEBUG] Selection guessedAnimeId=${guessedAnimeId}`]);

    if (currentRoundGuessedAnimeIds.has(guessedAnimeId)) {
      setWsLog((log) => [...log, `[WARN] Duplicate guess blocked guessedAnimeId=${guessedAnimeId}`]);
      return;
    }

    if (!joinedRoom) {
      setWsLog((log) => [...log, '[ERROR] Guess blocked: no joined room']);
      return;
    }

    if (!(playerKey && user?.name)) {
      setWsLog((log) => [...log, '[ERROR] Guess blocked: no user']);
      return;
    }

    if (!animeList[currentRoundIndex]) {
      setWsLog((log) => [...log, `[WARN] No target anime for roundIndex=${currentRoundIndex}, trying request anyway`]);
    }

    setWsLog((log) => [...log, `[SEND] POST /api/room/${joinedRoom}/guess guessedAnimeId=${guessedAnimeId}`]);
    let response: Response;
    try {
      response = await fetch(`${backendUrl}/api/room/${joinedRoom}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: playerKey, user: user.name, guessedAnimeId }),
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
    guessesByRound,
    currentRoundIndex,
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
