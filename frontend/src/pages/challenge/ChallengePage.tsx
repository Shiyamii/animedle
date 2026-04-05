import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import GuessTable from '@/components/GuessTable';
import { AutocompleteTextInput } from '@/components/AutoComplete';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useChallengePageViewModel } from './useChallengePageViewModel';

function FoundCharactersHistory({ foundCharacters }: { foundCharacters: { id: string; name: string; imageUrl?: string }[] }) {
  if (!foundCharacters.length) return null;
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="font-semibold text-sm">Personnages trouves :</span>
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
  const {
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
    fetchProgression,
    handleStartGame,
    handleCreate,
    handleCopyInvite,
    handleJoin,
    handleGuess,
  } = useChallengePageViewModel();

  if (!user) return <div className="text-center text-red-500">Vous devez etre connecte pour jouer.</div>;

  return (
    <TooltipProvider>
      <div className="max-w-xl mx-auto p-4 flex flex-col gap-6">
        <h1 className="text-2xl font-bold mb-2">Challenge multijoueur</h1>
        <FoundCharactersHistory foundCharacters={foundCharacters} />

        <div className="bg-gray-100 border rounded p-2 mb-2 max-h-40 overflow-y-auto text-xs">
          <div className="font-semibold mb-1">Log WebSocket</div>
          {wsLog.length === 0 ? <div className="text-gray-400">Aucun message</div> : wsLog.map((l, i) => <div key={i}>{l}</div>)}
        </div>

        {!joinedRoom ? (
          <div className="flex flex-col gap-2">
            <div>
              <Button onClick={handleCreate} className="mr-2">
                Creer une partie
              </Button>
              <span>ou</span>
            </div>
            <div className="flex gap-2 items-center">
              <Input placeholder="Code de la partie" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-32" />
              <Button onClick={handleJoin}>Rejoindre</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Room:</span> <span>{joinedRoom || '-'}</span>
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
                    onChange={(e) => setAnimeLimit(Number(e.target.value))}
                    className="w-16"
                    disabled={gameStarted}
                  />
                </>
              )}
            </div>

            {isHost && !gameStarted && (
              <Button disabled={!isWsOpen || !hasJoinedRoom || players.length < 2} onClick={handleStartGame}>
                Demarrer la partie {players.length < 2 ? '(min 2 joueurs)' : ''}
              </Button>
            )}

            <div>
              <h2 className="font-semibold">Joueurs ({players.length})</h2>
              <ul className="text-xs mb-2">{players.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>

            {gameStarted && (
              <>
                <div className="text-green-600 font-bold">La partie a commence !</div>
                <div className="flex gap-2 mb-2">
                  <button
                    className="px-2 py-1 text-xs bg-gray-200 rounded border border-gray-300 hover:bg-gray-300"
                    onClick={fetchProgression}
                  >
                    Mettre a jour la progression
                  </button>
                </div>

                {remaining !== null && (
                  <div className="mb-2 text-sm font-semibold">
                    {remaining > 0 ? `Animes restants a deviner : ${remaining}` : 'Partie terminee !'}
                  </div>
                )}

                {remaining && remaining > 0 ? (
                  <>
                    <AutocompleteTextInput
                      values={filteredAnimeList}
                      inputValue={inputValue}
                      setInputValue={setInputValue}
                      isFilteringLoading={isFilteringLoading}
                      onSelect={(animeId) => {
                        console.log('[CHALLENGE_UI] onSelect animeId=', animeId);
                        handleGuess(animeId);
                      }}
                    />
                    <GuessTable guesses={guessesByAnime[currentAnimeIdx] || []} />
                  </>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
