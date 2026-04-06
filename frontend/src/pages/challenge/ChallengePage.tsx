import { AutocompleteTextInput } from '@/components/AutoComplete';
import GuessTable from '@/components/GuessTable';
import { ModeMenu } from '@/components/ModeMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { useChallengePageViewModel } from './useChallengePageViewModel';

export default function ChallengePage() {
  const { t } = useTranslation();
  const {
    user,
    roomId,
    setRoomId,
    joinedRoom,
    remaining,
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
    currentRoundOpponentAttempts,
    currentRoundOpponentFound,
    gameStarted,
    gameOutcome,
    winnerName,
    isWsOpen,
    hasJoinedRoom,
    players,
    handleStartGame,
    handleCreate,
    handleCopyInvite,
    handleJoin,
    handleGuess,
  } = useChallengePageViewModel();

  if (!user) {
    return <div className="text-center text-red-500">{t('challenge.mustBeLoggedIn')}</div>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-svh w-full flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-6xl rounded-xl border border-border bg-card p-4 text-card-foreground shadow-md">
          <ModeMenu orientation="horizontal" />
        </div>

        <div className="mt-4 w-full max-w-6xl rounded-xl border border-border bg-card p-6 text-card-foreground shadow-md">
          <h1 className="text-center font-bold text-2xl text-primary">{t('challenge.title')}</h1>

          {!joinedRoom ? (
            <div className="mx-auto mt-6 flex w-full max-w-xl flex-col gap-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <h2 className="font-semibold text-lg">{t('challenge.createRoomTitle')}</h2>
                <p className="mt-1 text-muted-foreground text-sm">{t('challenge.createRoomDesc')}</p>
                <Button onClick={handleCreate} className="mt-3 w-full">
                  {t('challenge.createGame')}
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <h2 className="font-semibold text-lg">{t('challenge.joinRoomTitle')}</h2>
                <p className="mt-1 text-muted-foreground text-sm">{t('challenge.joinRoomDesc')}</p>
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder={t('challenge.roomCodePlaceholder')}
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full"
                  />
                  <Button onClick={handleJoin}>{t('challenge.join')}</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-muted-foreground">{t('challenge.roomLabel')}</div>
                    <div className="font-bold text-lg">{joinedRoom}</div>
                  </div>
                  <Button variant="outline" onClick={handleCopyInvite}>
                    {t('challenge.copyInvite')}
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {isHost && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{t('challenge.animeLimit')}</span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={animeLimit}
                        onChange={(e) => setAnimeLimit(Number(e.target.value))}
                        className="w-20"
                        disabled={gameStarted}
                      />
                    </div>
                  )}

                  {isHost && !gameStarted && (
                    <Button disabled={!isWsOpen || !hasJoinedRoom || players.length < 2} onClick={handleStartGame}>
                      {t('challenge.startGame')} {players.length < 2 ? `(${t('challenge.minPlayers')})` : ''}
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <h2 className="font-semibold">{t('challenge.players')} ({players.length})</h2>
                <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                  {players.map((p) => (
                    <li key={p} className="rounded-full border border-border px-3 py-1">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {gameStarted && (
                <>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="font-bold text-green-600">{t('challenge.gameStarted')}</div>
                    {gameOutcome === 'win' && (
                      <div className="mt-3 rounded-md border border-emerald-400 bg-emerald-50 p-3 text-center font-semibold text-emerald-700 dark:bg-emerald-950/30">
                        {t('challenge.winMessage')}
                      </div>
                    )}
                    {gameOutcome === 'loose' && (
                      <div className="mt-3 rounded-md border border-rose-400 bg-rose-50 p-3 text-center font-semibold text-rose-700 dark:bg-rose-950/30">
                        {winnerName
                          ? t('challenge.loseMessageWithWinner', { winner: winnerName })
                          : t('challenge.loseMessage')}
                      </div>
                    )}

                    {remaining !== null && (
                      <div className="mt-3 font-semibold text-sm">
                        {remaining > 0
                          ? t('challenge.remainingToGuess', { count: remaining })
                          : t('challenge.gameFinished')}
                      </div>
                    )}
                  </div>

                  {correctGuessesHistory.length > 0 && (
                    <div className="rounded-lg border border-border bg-background p-4">
                      <h3 className="mb-3 font-semibold">{t('challenge.foundHistoryTitle')}</h3>
                      <GuessTable guesses={correctGuessesHistory} showGuessNumber />
                    </div>
                  )}

                  {(currentRoundOpponentAttempts.length > 0 || currentRoundOpponentFound.length > 0) && (
                    <div className="rounded-lg border border-border bg-background p-4">
                      <h3 className="mb-3 font-semibold">{t('challenge.opponentAttemptsTitle')}</h3>
                      <div className="flex flex-col gap-2">
                        {currentRoundOpponentAttempts.map((attempt, index) => (
                          <div
                            key={`${attempt.playerKey}-${attempt.animeId}-${index}`}
                            className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                          >
                            <span className="font-medium">{attempt.animeTitle}</span>
                            <span className="text-muted-foreground">
                              {t('challenge.opponentAttemptBy', {
                                player: attempt.playerName,
                                count: attempt.guessNumber,
                              })}
                            </span>
                          </div>
                        ))}
                        {currentRoundOpponentFound.map((found, index) => (
                          <div
                            key={`${found.playerKey}-${found.animeId}-found-${index}`}
                            className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                          >
                            <span className="font-medium">
                              {t('challenge.opponentFoundGeneric', { player: found.playerName })}
                            </span>
                            <span className="text-muted-foreground">
                              {t('challenge.opponentTryNumber', { count: found.guessNumber })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(remaining === null || remaining > 0) && (
                    <div className="rounded-lg border border-border bg-background p-4">
                      <h3 className="mb-3 font-semibold">{t('challenge.currentGuessTitle')}</h3>
                      <div className="mb-4">
                        <AutocompleteTextInput
                          values={filteredAnimeList}
                          inputValue={inputValue}
                          setInputValue={setInputValue}
                          isFilteringLoading={isFilteringLoading}
                          onSelect={handleGuess}
                        />
                      </div>
                      <GuessTable guesses={guessesByAnime[currentAnimeIdx] || []} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
