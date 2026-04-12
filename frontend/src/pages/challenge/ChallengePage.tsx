import { useTranslation } from 'react-i18next';
import { AutocompleteTextInput } from '@/components/AutoComplete';
import GuessTable from '@/components/GuessTable';
import { ModeMenu } from '@/components/ModeMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TooltipProvider } from '@/components/ui/tooltip';
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
    guessesByRound,
    currentRoundIndex,
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

  const currentRoundLiveAttempts = [
    ...currentRoundOpponentAttempts.map((attempt) => ({
      key: `attempt-${attempt.playerKey}-${attempt.guessedAnimeId}-${attempt.guessNumber}`,
      playerName: attempt.playerName,
      animeTitle: attempt.guessedAnimeTitle,
      guessNumber: attempt.guessNumber,
      attemptScore: attempt.attemptScore,
    })),
    ...currentRoundOpponentFound.map((found) => ({
      key: `found-${found.playerKey}-${found.foundAnimeId}-${found.guessNumber}`,
      playerName: found.playerName,
      animeTitle: t('challenge.liveGuessFoundAnime'),
      guessNumber: found.guessNumber,
      attemptScore: found.attemptScore,
    })),
  ].sort((left, right) => left.guessNumber - right.guessNumber || left.playerName.localeCompare(right.playerName));

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

          {joinedRoom ? (
            <div className="mt-6 flex flex-col gap-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-muted-foreground text-sm">{t('challenge.roomLabel')}</div>
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
                    <Button disabled={!(isWsOpen && hasJoinedRoom) || players.length < 2} onClick={handleStartGame}>
                      {t('challenge.startGame')} {players.length < 2 ? `(${t('challenge.minPlayers')})` : ''}
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <h2 className="font-semibold">
                  {t('challenge.players')} ({players.length})
                </h2>
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
                      <h3 className="mb-3 font-semibold">{t('challenge.liveGuessesTitle')}</h3>
                      <div className="w-full overflow-x-auto rounded-md border">
                        <Table className="min-w-[720px]">
                          <TableHeader className="bg-primary/8">
                            <TableRow>
                              <TableHead className="text-center font-semibold text-primary">
                                {t('challenge.liveGuessPlayer')}
                              </TableHead>
                              <TableHead className="text-center font-semibold text-primary">
                                {t('challenge.liveGuessAnime')}
                              </TableHead>
                              <TableHead className="text-center font-semibold text-primary">
                                {t('challenge.liveGuessScore')}
                              </TableHead>
                              <TableHead className="text-center font-semibold text-primary">
                                {t('challenge.liveGuessTry')}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentRoundLiveAttempts.map((entry) => (
                              <TableRow key={entry.key} className="hover:bg-transparent">
                                <TableCell className="text-center font-medium">{entry.playerName}</TableCell>
                                <TableCell className="text-center">{entry.animeTitle}</TableCell>
                                <TableCell className="text-center font-semibold text-primary">
                                  {entry.attemptScore}/8
                                </TableCell>
                                <TableCell className="text-center text-muted-foreground">
                                  {t('challenge.opponentTryNumber', { count: entry.guessNumber })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
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
                      <GuessTable guesses={guessesByRound[currentRoundIndex] || []} />
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
