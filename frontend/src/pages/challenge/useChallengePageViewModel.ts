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

type FoundCharacter = {
  id: string;
  name: string;
  imageUrl?: string;
};

type WSProposalMsg = { type: 'proposal'; guess: GuessResultDTO };
type WSJoinMsg = { type: 'join'; name: string };
type WSLeaveMsg = { type: 'leave'; name: string };
type WSJoinedMsg = { type: 'joined'; roomId: string };
type WSPlayersMsg = { type: 'players'; players: string[] };
type WSStartMsg = { type: 'start' };
type WSErrorMsg = { type: 'error'; error: string };
type WSMsg = WSProposalMsg | WSJoinMsg | WSLeaveMsg | WSJoinedMsg | WSPlayersMsg | WSStartMsg | WSErrorMsg;

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
  const [currentAnimeIdx, setCurrentAnimeIdx] = useState(0);
  const [foundCharacters, setFoundCharacters] = useState<FoundCharacter[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isWsOpen, setIsWsOpen] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [players, setPlayers] = useState<string[]>([]);

  const fetchProgression = useCallback(() => {
    if (!joinedRoom || !user?.name || !gameStarted) {
      return;
    }

    fetch(`${backendUrl}/api/room/${joinedRoom}/progression?user=${encodeURIComponent(user.name)}`)
      .then((res) => res.json())
      .then((data) => {
        setGuessesByAnime(normalizeGuessesByAnime(data.guessesByAnime || {}));
        setCurrentAnimeIdx(data.currentAnimeIdx || 0);
        setFoundCharacters(data.foundCharacters || []);
      })
      .catch(() => {});
  }, [joinedRoom, user, gameStarted, backendUrl]);

  const fuse: Fuse<AnimeItemDTO> = useMemo(() => createFuse(animeStore.animeList), [animeStore.animeList]);

  const filteredAnimeList = useMemo(() => {
    if (!inputValue) {
      return [];
    }
    return filterAnimeList(fuse, inputValue);
  }, [inputValue, fuse]);

  const isFilteringLoading = false;

  useEffect(() => {
    if (!joinedRoom || !user?.name || !gameStarted) {
      return;
    }

    fetch(`${backendUrl}/api/room/${joinedRoom}/remaining?user=${encodeURIComponent(user.name)}`)
      .then((res) => res.json())
      .then((data) => setRemaining(data.remaining))
      .catch(() => setRemaining(null));
  }, [joinedRoom, user?.name, gameStarted, currentAnimeIdx, guessesByAnime, backendUrl]);

  useEffect(() => {
    if (!joinedRoom || !user?.name) {
      return;
    }

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    let closed = false;

    ws.onopen = () => {
      setIsWsOpen(true);
      const joinMsg = { type: 'join', roomId: joinedRoom, name: user.name };
      ws.send(JSON.stringify(joinMsg));
      setWsLog((log) => [...log, `[SEND] ${JSON.stringify(joinMsg)}`]);
      setPlayers([user.name]);
    };

    ws.onmessage = (event) => {
      setWsLog((log) => [...log, `[RECV] ${event.data}`]);
      const msg = JSON.parse(event.data) as WSMsg;

      if (msg.type === 'proposal') {
        setGuessesByAnime((prev) => {
          const arr = prev[currentAnimeIdx] ? [...prev[currentAnimeIdx]] : [];
          arr.push(msg.guess);
          return { ...prev, [currentAnimeIdx]: arr };
        });

        if (msg.guess && msg.guess.isCorrect && animeList[currentAnimeIdx]) {
          setFoundCharacters((prev) => [
            ...prev,
            {
              id: animeList[currentAnimeIdx].characterId,
              name: animeList[currentAnimeIdx].characterName,
              imageUrl: animeList[currentAnimeIdx].characterImageUrl,
            },
          ]);
          setCurrentAnimeIdx((idx) => idx + 1);
        }
      } else if (msg.type === 'joined') {
        setHasJoinedRoom(true);
      } else if (msg.type === 'players') {
        setPlayers(msg.players);
      } else if (msg.type === 'start') {
        setWsLog((log) => [...log, '[DEBUG] Message WS "start" reçu, on démarre la partie']);
        setGameStarted(true);
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
  }, [joinedRoom, user?.name, currentAnimeIdx, animeList]);

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
    fetchProgression();
  }, [fetchProgression]);

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
    setHasJoinedRoom(false);
    setWsLog([]);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('challenge_host_room');
      window.location.href = `${window.location.pathname}?gameid=${cleanRoomId}`;
    }
  };

  const handleGuess = async (animeId: string) => {
    setWsLog((log) => [...log, `[DEBUG] Selection animeId=${animeId}`]);

    if (!joinedRoom) {
      setWsLog((log) => [...log, '[ERROR] Guess blocked: no joined room']);
      return;
    }

    if (!user?.name) {
      setWsLog((log) => [...log, '[ERROR] Guess blocked: no user']);
      return;
    }

    const targetAnime = animeList[currentAnimeIdx];
    if (!targetAnime) {
      setWsLog((log) => [...log, `[WARN] No target anime for index=${currentAnimeIdx}, trying request anyway`]);
    }

    setWsLog((log) => [...log, `[SEND] POST /api/room/${joinedRoom}/guess animeId=${animeId}`]);
    let response: Response;
    try {
      response = await fetch(`${backendUrl}/api/room/${joinedRoom}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user.name, animeId }),
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

    setGuessesByAnime((prev) => {
      const arr = prev[currentAnimeIdx] ? [...prev[currentAnimeIdx]] : [];
      return { ...prev, [currentAnimeIdx]: [guessResult, ...arr] };
    });

    setInputValue('');

    if (guessResult.isCorrect && targetAnime) {
      setFoundCharacters((prev) => [
        ...prev,
        {
          id: targetAnime.characterId,
          name: targetAnime.characterName,
          imageUrl: targetAnime.characterImageUrl,
        },
      ]);
      setCurrentAnimeIdx((idx) => idx + 1);
    }

    fetchProgression();
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
    guessesByAnime,
    currentAnimeIdx,
    foundCharacters,
    gameStarted,
    isWsOpen,
    hasJoinedRoom,
    players,
    animeStore,
    fetchProgression,
    handleStartGame,
    handleCreate,
    handleCopyInvite,
    handleJoin,
    handleGuess,
  };
}
