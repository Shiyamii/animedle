

import { Button } from "@/components/ui/button"
import { useHomePageViewModel } from "./useHomePageViewModel";
import { AutocompleteTextInput } from "@/components/AutoComplete";
import GuessTable from "@/components/GuessTable";
import { TooltipProvider } from "@/components/ui/tooltip";
import useConfetti from '@/hooks/useConfetti.ts';
import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/stores/userStore";
import { useNavigate } from "react-router";
import { WSClient } from "@/lib/ws-client";
import type { WSMessage } from "@/lib/ws-client";

function HomePage() {
    const user = useUserStore((s) => s.user);
    const navigate = useNavigate();
    const {
        filtredAnimeList,
        isGuessingStarted,
        setIsGuessingStarted,
        inputValue,
        setInputValue,
        isFilteringLoading,
        guessList,
        onAnimeSelect,
        foundAnime
    } = useHomePageViewModel();


    // Force login : si pas de user, redirige vers /login
    useEffect(() => {
        if (!user) navigate("/login");
    }, [user, navigate]);

    useConfetti(!!foundAnime);

    const [roomId, setRoomId] = useState("");
    const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
    const [wsMessages, setWsMessages] = useState<any[]>([]);
    const wsRef = useRef<WSClient | null>(null);

    // Couleurs possibles pour la propal test
    const colorChoices = ["⬛", "🟨", "🟩"];
    const [testColors, setTestColors] = useState<string[]>(Array(8).fill("⬛"));
    function handleColorChange(idx: number, value: string) {
        setTestColors((prev) => prev.map((c, i) => (i === idx ? value : c)));
    }
    function sendTestProposal() {
        if (wsRef.current && joinedRoom && user) {
            wsRef.current.sendProposal(testColors, user.name);
        }
    }

    function guessResultToColors(guessResult: any): string[] {
        const r = guessResult.results;
        return [
            r.demographicType.isCorrect ? "🟩" : "⬛",
            r.episodes.isCorrect ? "🟩" : "⬛",
            r.seasonStart.isCorrect ? "🟩" : "⬛",
            r.studio.isCorrect ? "🟩" : "⬛",
            r.source.isCorrect ? "🟩" : "⬛",
            r.score.isCorrect ? "🟩" : "⬛",
            r.genres.isCorrect ? "🟩" : (r.genres.isPartiallyCorrect ? "🟨" : "⬛"),
            r.animeFormat.isCorrect ? "🟩" : "⬛",
        ];
    }

    function sendGuessProposal(guessResult: any) {
        console.table({
            wsRef: !!wsRef.current,
            joinedRoom,
            user: !!user
        });
        if (wsRef.current && joinedRoom && user) {
            const colors = guessResultToColors(guessResult);
            console.log("Sending proposal with colors:", colors);
            wsRef.current.sendProposal(colors, user.name);
        }
    }

    useEffect(() => {
        const ws = new WSClient();
        ws.connect("ws://localhost:3001");
        ws.onMessage((msg: WSMessage) => {
            setWsMessages((prev) => [...prev, msg]);
            if (msg.type === "joined") {
                setJoinedRoom(msg.roomId);
            }
        });
        wsRef.current = ws;
        return () => {
            // Pas de close explicite ici, à améliorer si besoin
        };
    }, []);

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex min-h-svh w-full flex-col items-center justify-center flexw-rap">
                {/* Zone pour rejoindre une room */}
                <div className="w-full max-w-md mb-4 flex gap-2 items-center">
                    <input
                        type="text"
                        placeholder="Room ID"
                        value={roomId}
                        onChange={e => setRoomId(e.target.value)}
                        className="border rounded px-2 py-1 flex-1"
                        disabled={!!joinedRoom}
                    />
                    <Button
                        onClick={() => {
                            if (roomId && wsRef.current) {
                                wsRef.current.joinRoom(roomId);
                            }
                        }}
                        disabled={!roomId || !!joinedRoom}
                    >Join</Button>
                    {joinedRoom && <span className="text-xs text-green-600 ml-2">In room: {joinedRoom}</span>}
                </div>
                {/* Zone d'affichage des messages WebSocket */}
                <div className="w-full max-w-md mb-4">
                    <h3 className="font-bold mb-2">WebSocket Messages</h3>
                    <div className="bg-muted rounded p-2 min-h-12 max-h-40 overflow-y-auto">
                        {wsMessages.length === 0 && <div className="text-muted-foreground text-sm">Aucun message</div>}
                        {wsMessages.map((msg, i) => (
                            <div key={i} className="flex gap-2 items-center mb-1">
                                {msg.type === "proposal" && (
                                    <>
                                        {msg.from && <span className="text-xs text-muted-foreground">{msg.from}:</span>}
                                        {msg.colors && msg.colors.map((c: string, j: number) => <span key={j} style={{fontSize: 24}}>{c}</span>)}
                                    </>
                                )}
                                {msg.type === "text" && (
                                    <>
                                        {msg.from && <span className="text-xs text-blue-600">{msg.from}:</span>}
                                        <span className="text-base">{msg.text}</span>
                                    </>
                                )}
                                {msg.type === "joined" && (
                                    <span className="text-xs text-green-600">Joined room: {msg.roomId}</span>
                                )}
                                {msg.type === "error" && (
                                    <span className="text-xs text-red-600">Erreur: {msg.error}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                {/* Zone de test : choisir 8 couleurs et envoyer la propal */}
                <div className="w-full max-w-md mb-4 flex flex-col gap-2 items-center">
                    <div className="flex gap-1 flex-wrap">
                        {testColors.map((color, idx) => (
                            <select
                                key={idx}
                                value={color}
                                onChange={e => handleColorChange(idx, e.target.value)}
                                className="border rounded px-2 py-1 text-xl"
                                disabled={!joinedRoom}
                            >
                                {colorChoices.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        onClick={sendTestProposal}
                        disabled={!joinedRoom}
                    >Envoyer cette propal</Button>
                </div>
                {/* Partie jeu existante */}
                {!isGuessingStarted ? (
                    <div className='w-full max-w-md bg-card text-card-foreground rounded-xl p-8 shadow-md border border-border'>
                        <div className="mt-4 flex flex-col items-center gap-4">
                            <h1 className="text-2xl font-bold text-primary">Start Guessing Today's Anime!</h1>
                            <Button onClick={() => setIsGuessingStarted(true)} className="mt-4">Start</Button>
                        </div>
                    </div>
                ) : (
                    <div className='w-full flex flex-col items-center max-w-6xl bg-card text-card-foreground rounded-xl p-8 shadow-md border border-border mt-24'>
                        {
                            foundAnime ? (
                                <div className="my-4 max-w-lg">
                                    <h2 className="text-2xl font-semibold">Congratulations! You found the anime:</h2>
                                    <p className="mt-2 text-center text-xl font-bold">{foundAnime.title}</p>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-2xl font-bold text-primary">Guess Today's Anime!</h1>
                                    <div className="my-4 max-w-lg w-full items-center gap-4 flex flex-col flex-wrap">
                                        <AutocompleteTextInput values={filtredAnimeList}
                                                               inputValue={inputValue}
                                                               setInputValue={setInputValue}
                                                               isFilteringLoading={isFilteringLoading}
                                                               onSelect={async (animeId) => {
                                                                   const guessResult = await onAnimeSelect(animeId);
                                                                   console.log("onSelect called, guessResult:", guessResult);
                                                                   if (guessResult) {
                                                                       sendGuessProposal(guessResult);
                                                                   }
                                                               }}/>
                                    </div>
                                </>

                            )
                        }
                        {guessList.length > 0 && (
                            <GuessTable guesses={guessList}/>
                        )}
                    </div>
                )}
            </div>
        </TooltipProvider>
    )
}

export default HomePage;