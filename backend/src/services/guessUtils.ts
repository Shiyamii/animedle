// Fonctions utilitaires pour factoriser la logique de guess entre daily/challenge
const { AnimeService } = require('./AnimeService');

async function compareGuessToAnime(guessedAnimeId, refAnimeId, guessNumber, animeServiceInstance) {
  // Utilise la logique existante de compareAnimes
  const guessedAnime = await animeServiceInstance.repository.findById(guessedAnimeId);
  const refAnime = await animeServiceInstance.repository.findById(refAnimeId);
  if (!(refAnime && guessedAnime)) {
    throw new Error('Reference anime or guessed anime not found');
  }
  return animeServiceInstance.compareAnimes(refAnime, guessedAnime, guessNumber);
}

module.exports = { compareGuessToAnime };
