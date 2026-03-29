import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimeEntity } from '../AnimeRepositories';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  db: {},
  ensureMongooseConnection: vi.fn().mockResolvedValue(undefined),
}));

const mocks = vi.hoisted(() => ({
  findAll: vi.fn(),
  findAllEnabled: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  saveCurrentAnime: vi.fn(),
  getCurrentAnime: vi.fn(),
}));

vi.mock('@/services/AnimeRepositories', () => ({
  AnimeRepository: class {
    findAll = mocks.findAll;
    findAllEnabled = mocks.findAllEnabled;
    findById = mocks.findById;
    create = mocks.create;
    update = mocks.update;
    delete = mocks.del;
  },
}));

vi.mock('@/services/CurrentAnimeRepositories', () => ({
  CurrentAnimeRepository: class {
    saveCurrentAnime = mocks.saveCurrentAnime;
    getCurrentAnime = mocks.getCurrentAnime;
    deleteCurrentAnime = vi.fn();
    recordGuess = vi.fn().mockResolvedValue(undefined);
    recordWin = vi.fn().mockResolvedValue(undefined);
    getStatsByAnimeIds = vi.fn().mockResolvedValue([]);
    getAllHistory = vi.fn().mockResolvedValue([]);
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { AnimeService } from '../AnimeService';

function makeEntity(overrides: Partial<AnimeEntity> = {}): AnimeEntity {
  return {
    _id: new Types.ObjectId(),
    titles: [
      { type: 'Default', title: 'Test Anime' },
      { type: 'Japanese', title: 'テストアニメ' },
    ],
    images_webp: {
      image_url: 'https://cdn.myanimelist.net/images/anime/1/1.webp',
      small_image_url: 'https://cdn.myanimelist.net/images/anime/1/1s.webp',
      large_image_url: 'https://cdn.myanimelist.net/images/anime/1/1l.webp',
    },
    anime_format: 'TV',
    genres: ['Action', 'Adventure'],
    demographic_type: 'Shounen',
    episodes: 24,
    season_start: 'Spring 2023',
    studio: 'MAPPA',
    source: 'Manga',
    score: 8.5,
    enabled: true,
    ...overrides,
  };
}

/** Réinitialise le singleton et retourne une nouvelle instance. */
function getService(): AnimeService {
  (AnimeService as unknown as { instance: unknown }).instance = undefined;
  return AnimeService.getInstance();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AnimeService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ── parseMALImageUrl ──────────────────────────────────────────────────────

  describe('parseMALImageUrl', () => {
    type WithParse = { parseMALImageUrl(u: string): object };

    it('dérive les 3 variantes webp depuis une URL cdn valide avec extension', () => {
      const parse = (getService() as unknown as WithParse).parseMALImageUrl.bind(getService());
      expect(parse('https://cdn.myanimelist.net/images/anime/4/19756.webp')).toEqual({
        image_url: 'https://cdn.myanimelist.net/images/anime/4/19756.webp',
        small_image_url: 'https://cdn.myanimelist.net/images/anime/4/19756s.webp',
        large_image_url: 'https://cdn.myanimelist.net/images/anime/4/19756l.webp',
      });
    });

    it("fonctionne sans extension dans l'URL", () => {
      const service = getService() as unknown as WithParse;
      expect(service.parseMALImageUrl('https://cdn.myanimelist.net/images/anime/4/19756')).toEqual({
        image_url: 'https://cdn.myanimelist.net/images/anime/4/19756.webp',
        small_image_url: 'https://cdn.myanimelist.net/images/anime/4/19756s.webp',
        large_image_url: 'https://cdn.myanimelist.net/images/anime/4/19756l.webp',
      });
    });

    it('fonctionne sans préfixe cdn.', () => {
      const service = getService() as unknown as WithParse;
      expect(service.parseMALImageUrl('https://myanimelist.net/images/anime/4/19756.jpg')).toEqual({
        image_url: 'https://myanimelist.net/images/anime/4/19756.webp',
        small_image_url: 'https://myanimelist.net/images/anime/4/19756s.webp',
        large_image_url: 'https://myanimelist.net/images/anime/4/19756l.webp',
      });
    });

    it('lève une erreur pour une URL non-MAL', () => {
      const service = getService() as unknown as WithParse;
      expect(() => service.parseMALImageUrl('https://invalid.com/image.jpg')).toThrow('URL MAL invalide');
    });

    it('lève une erreur pour une URL vide', () => {
      const service = getService() as unknown as WithParse;
      expect(() => service.parseMALImageUrl('')).toThrow('URL MAL invalide');
    });
  });

  // ── getAnimeList ──────────────────────────────────────────────────────────

  describe('getAnimeList', () => {
    it('retourne la liste des animes mappés en AnimeItemDTO', async () => {
      const entity = makeEntity();
      mocks.findAllEnabled.mockResolvedValue([entity]);

      const result = await getService().getAnimeList();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: entity._id?.toHexString(),
        title: 'Test Anime',
        alias: ['テストアニメ'],
        imageUrl: entity.images_webp.image_url,
      });
    });

    it('retourne un tableau vide quand le dépôt est vide', async () => {
      mocks.findAllEnabled.mockResolvedValue([]);
      expect(await getService().getAnimeList()).toEqual([]);
    });

    it('utilise le premier titre si aucun titre "Default" n\'existe', async () => {
      // Sans titre Default, le premier titre est utilisé comme titre principal.
      // getAliases retourne tous les titres non-Default, donc il figure aussi dans alias.
      const entity = makeEntity({ titles: [{ type: 'Japanese', title: 'タイトル' }] });
      mocks.findAllEnabled.mockResolvedValue([entity]);

      const [item] = await getService().getAnimeList();
      expect(item.title).toBe('タイトル');
      expect(item.alias).toEqual(['タイトル']);
    });
  });

  // ── getAdminAnimeList ─────────────────────────────────────────────────────

  describe('getAdminAnimeList', () => {
    it('retourne les données complètes incluant le tableau titles', async () => {
      const entity = makeEntity();
      mocks.findAll.mockResolvedValue([entity]);

      const [admin] = await getService().getAdminAnimeList();

      expect(admin.titles).toEqual(entity.titles);
      expect(admin.genres).toEqual(entity.genres);
      expect(admin.studio).toBe('MAPPA');
      expect(admin.imageUrl).toBe(entity.images_webp.image_url);
    });
  });

  // ── createAnime ───────────────────────────────────────────────────────────

  describe('createAnime', () => {
    it("crée un anime en dérivant les URL images depuis l'URL MAL", async () => {
      const created = makeEntity();
      mocks.create.mockResolvedValue(created);

      await getService().createAnime({
        imageUrl: 'https://cdn.myanimelist.net/images/anime/4/19756.webp',
        titles: [{ type: 'Default', title: 'Naruto' }],
        anime_format: 'TV',
        genres: ['Action'],
        demographic_type: 'Shounen',
        episodes: 220,
        season_start: 'Fall 2002',
        studio: 'Pierrot',
        source: 'Manga',
        score: 7.9,
      });

      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          images_webp: {
            image_url: 'https://cdn.myanimelist.net/images/anime/4/19756.webp',
            small_image_url: 'https://cdn.myanimelist.net/images/anime/4/19756s.webp',
            large_image_url: 'https://cdn.myanimelist.net/images/anime/4/19756l.webp',
          },
        }),
      );
    });

    it("lève une erreur si l'URL image est invalide", async () => {
      await expect(
        getService().createAnime({
          imageUrl: 'https://not-mal.com/image.png',
          titles: [{ type: 'Default', title: 'Test' }],
          anime_format: 'TV',
          genres: [],
          demographic_type: '',
          episodes: 0,
          season_start: '',
          studio: '',
          source: '',
          score: 0,
        }),
      ).rejects.toThrow('URL MAL invalide');
    });
  });

  // ── updateAnime ───────────────────────────────────────────────────────────

  describe('updateAnime', () => {
    const basePayload = {
      imageUrl: 'https://cdn.myanimelist.net/images/anime/1/1.webp',
      titles: [{ type: 'Default', title: 'Test' }],
      anime_format: 'TV',
      genres: ['Action'],
      demographic_type: 'Shounen',
      episodes: 12,
      season_start: 'Spring 2023',
      studio: 'MAPPA',
      source: 'Manga',
      score: 8.0,
    };

    it('retourne le DTO mis à jour', async () => {
      const updated = makeEntity({ studio: 'WIT Studio' });
      mocks.update.mockResolvedValue(updated);

      const result = await getService().updateAnime('someId', { ...basePayload, studio: 'WIT Studio' });
      expect(result?.studio).toBe('WIT Studio');
    });

    it("retourne null si l'anime n'existe pas", async () => {
      mocks.update.mockResolvedValue(null);
      expect(await getService().updateAnime('inexistant', basePayload)).toBeNull();
    });
  });

  // ── deleteAnime ───────────────────────────────────────────────────────────

  describe('deleteAnime', () => {
    it("retourne true si l'anime a été supprimé", async () => {
      mocks.del.mockResolvedValue(true);
      expect(await getService().deleteAnime('someId')).toBe(true);
      expect(mocks.del).toHaveBeenCalledWith('someId');
    });

    it("retourne false si l'anime n'existe pas", async () => {
      mocks.del.mockResolvedValue(false);
      expect(await getService().deleteAnime('inexistant')).toBe(false);
    });
  });

  // ── updateGoalAnime / setCurrentAnimeRandom ───────────────────────────────

  describe('updateGoalAnime', () => {
    it('sélectionne un anime au hasard et le sauvegarde comme anime du jour', async () => {
      const entities = [makeEntity(), makeEntity(), makeEntity()];
      mocks.findAllEnabled.mockResolvedValue(entities);
      mocks.saveCurrentAnime.mockResolvedValue(undefined);

      const result = await getService().updateGoalAnime();

      expect(mocks.saveCurrentAnime).toHaveBeenCalledTimes(1);
      expect(entities.some((e) => e._id?.toHexString() === result._id?.toHexString())).toBe(true);
    });

    it("lève une erreur si aucun anime n'est en base", async () => {
      mocks.findAllEnabled.mockResolvedValue([]);
      await expect(getService().updateGoalAnime()).rejects.toThrow('No animes found to update the goal anime.');
    });
  });

  describe('setCurrentAnimeRandom', () => {
    it('délègue à updateGoalAnime et retourne un AdminAnimeDTO', async () => {
      const entity = makeEntity();
      mocks.findAllEnabled.mockResolvedValue([entity]);
      mocks.saveCurrentAnime.mockResolvedValue(undefined);

      const result = await getService().setCurrentAnimeRandom();

      expect(result.id).toBe(entity._id?.toHexString());
      expect(result.titles).toEqual(entity.titles);
    });
  });

  // ── setCurrentAnimeById ───────────────────────────────────────────────────

  describe('setCurrentAnimeById', () => {
    it("retourne null si l'anime n'existe pas", async () => {
      mocks.findById.mockResolvedValue(null);

      expect(await getService().setCurrentAnimeById('inexistant')).toBeNull();
      expect(mocks.saveCurrentAnime).not.toHaveBeenCalled();
    });

    it("sauvegarde et retourne le DTO si l'anime existe", async () => {
      const entity = makeEntity();
      mocks.findById.mockResolvedValue(entity);
      mocks.saveCurrentAnime.mockResolvedValue(undefined);

      const result = await getService().setCurrentAnimeById(entity._id?.toHexString() ?? '');

      expect(mocks.saveCurrentAnime).toHaveBeenCalledWith(entity);
      expect(result?.title).toBe('Test Anime');
    });
  });

  // ── getCurrentAnimeAdmin ──────────────────────────────────────────────────

  describe('getCurrentAnimeAdmin', () => {
    it('retourne null si aucun anime courant', async () => {
      mocks.getCurrentAnime.mockResolvedValue(null);
      expect(await getService().getCurrentAnimeAdmin()).toBeNull();
    });

    it("retourne le DTO de l'anime courant", async () => {
      const entity = makeEntity();
      mocks.getCurrentAnime.mockResolvedValue({ anime: entity, date: new Date() });

      const result = await getService().getCurrentAnimeAdmin();
      expect(result?.title).toBe('Test Anime');
    });
  });

  // ── guessAnime ────────────────────────────────────────────────────────────

  describe('guessAnime', () => {
    function setupCurrentAnime(entity: AnimeEntity) {
      mocks.getCurrentAnime.mockResolvedValue({ anime: entity, date: new Date() });
    }

    it("retourne isCorrect=true quand l'anime deviné est le bon", async () => {
      const entity = makeEntity();
      setupCurrentAnime(entity);
      mocks.findById.mockResolvedValue(entity);

      const result = await getService().guessAnime(entity._id?.toHexString() ?? '', 1);

      expect(result.isCorrect).toBe(true);
      expect(result.guessNumber).toBe(1);
    });

    it('retourne isCorrect=false avec les bons résultats de comparaison', async () => {
      const current = makeEntity({
        _id: new Types.ObjectId(),
        episodes: 24,
        score: 8.5,
        season_start: 'Spring 2023',
        genres: ['Action', 'Adventure'],
        studio: 'MAPPA',
        source: 'Manga',
        anime_format: 'TV',
        demographic_type: 'Shounen',
      });
      const guessed = makeEntity({
        _id: new Types.ObjectId(),
        episodes: 12,
        score: 7.0,
        season_start: 'Fall 2020',
        genres: ['Action'],
        studio: 'WIT Studio',
        source: 'Original',
        anime_format: 'Movie',
        demographic_type: 'Seinen',
      });
      setupCurrentAnime(current);
      mocks.findById.mockResolvedValue(guessed);
      const guessedId = guessed._id?.toHexString() ?? '';
      const { isCorrect, guessNumber, results } = await getService().guessAnime(guessedId, 3);

      expect(isCorrect).toBe(false);
      expect(guessNumber).toBe(3);
      expect(results.episodes.isCorrect).toBe(false);
      expect(results.episodes.isHigher).toBe(true); // 12 < 24, need more
      expect(results.score.isCorrect).toBe(false);
      expect(results.score.isHigher).toBe(true); // 7.0 < 8.5, need more
      expect(results.studio.isCorrect).toBe(false);
      expect(results.source.isCorrect).toBe(false);
      expect(results.animeFormat.isCorrect).toBe(false);
      expect(results.demographicType.isCorrect).toBe(false);
    });

    it("expose l'anime deviné dans le résultat", async () => {
      const current = makeEntity();
      const guessed = makeEntity({ _id: new Types.ObjectId(), studio: 'Bones' });
      setupCurrentAnime(current);
      mocks.findById.mockResolvedValue(guessed);

      const result = await getService().guessAnime(guessed._id?.toHexString() ?? '', 2);
      expect(result.anime.studio).toBe('Bones');
    });
  });

  // ── compareGenreLists (via guessAnime) ────────────────────────────────────

  describe('compareGenreLists', () => {
    async function compareGenres(ref: string[], test: string[]) {
      const current = makeEntity({ _id: new Types.ObjectId(), genres: ref });
      const guessed = makeEntity({ _id: new Types.ObjectId(), genres: test });
      mocks.getCurrentAnime.mockResolvedValue({ anime: current, date: new Date() });
      mocks.findById.mockResolvedValue(guessed);
      return (await getService().guessAnime(guessed._id?.toHexString() ?? '', 1)).results.genres;
    }

    it('isCorrect=true pour des listes identiques', async () => {
      const genres = await compareGenres(['Action', 'Drama'], ['Action', 'Drama']);
      expect(genres).toEqual({ isCorrect: true, isPartiallyCorrect: false });
    });

    it('isPartiallyCorrect=true pour une correspondance partielle', async () => {
      const genres = await compareGenres(['Action', 'Drama'], ['Action', 'Comedy']);
      expect(genres).toEqual({ isCorrect: false, isPartiallyCorrect: true });
    });

    it('les deux false quand aucun genre ne correspond', async () => {
      const genres = await compareGenres(['Action', 'Drama'], ['Comedy', 'Romance']);
      expect(genres).toEqual({ isCorrect: false, isPartiallyCorrect: false });
    });

    it('isCorrect=false si mêmes genres mais pas la même taille', async () => {
      const genres = await compareGenres(['Action', 'Drama'], ['Action']);
      expect(genres.isCorrect).toBe(false);
    });
  });

  // ── compareDates (via guessAnime) ─────────────────────────────────────────

  describe('compareDates', () => {
    async function compareSeasons(ref: string, test: string) {
      const current = makeEntity({ _id: new Types.ObjectId(), season_start: ref });
      const guessed = makeEntity({ _id: new Types.ObjectId(), season_start: test });
      mocks.getCurrentAnime.mockResolvedValue({ anime: current, date: new Date() });
      mocks.findById.mockResolvedValue(guessed);
      return (await getService().guessAnime(guessed._id?.toHexString() ?? '', 1)).results.seasonStart;
    }

    it('isCorrect=true pour la même saison', async () => {
      expect(await compareSeasons('Spring 2023', 'Spring 2023')).toMatchObject({ isCorrect: true });
    });

    it('isEarlier=false quand la saison devinée est antérieure (aller plus loin)', async () => {
      // guessed Spring 2020 < ref Spring 2023 → hint: go later → isEarlier=false
      const season = await compareSeasons('Spring 2023', 'Spring 2020');
      expect(season).toMatchObject({ isCorrect: false, isEarlier: false });
    });

    it('isEarlier=true quand la saison devinée est postérieure (aller plus tôt)', async () => {
      // guessed Fall 2024 > ref Spring 2023 → hint: go earlier → isEarlier=true
      const season = await compareSeasons('Spring 2023', 'Fall 2024');
      expect(season).toMatchObject({ isCorrect: false, isEarlier: true });
    });

    it('distingue les saisons dans la même année (Winter < Fall)', async () => {
      // guessed Winter 2023 < ref Fall 2023 → go later → isEarlier=false
      const season = await compareSeasons('Fall 2023', 'Winter 2023');
      expect(season).toMatchObject({ isCorrect: false, isEarlier: false });
    });
  });

  // ── épisodes / score isHigher ─────────────────────────────────────────────

  describe('comparaison épisodes et score', () => {
    async function getResults(refEps: number, testEps: number, refScore: number, testScore: number) {
      const current = makeEntity({ _id: new Types.ObjectId(), episodes: refEps, score: refScore });
      const guessed = makeEntity({ _id: new Types.ObjectId(), episodes: testEps, score: testScore });
      mocks.getCurrentAnime.mockResolvedValue({ anime: current, date: new Date() });
      mocks.findById.mockResolvedValue(guessed);
      return (await getService().guessAnime(guessed._id?.toHexString() ?? '', 1)).results;
    }

    it('isHigher=true pour épisodes quand le deviné est trop bas', async () => {
      expect((await getResults(24, 12, 8.0, 8.0)).episodes.isHigher).toBe(true);
    });

    it('isHigher=false pour épisodes quand le deviné est trop haut', async () => {
      expect((await getResults(12, 24, 8.0, 8.0)).episodes.isHigher).toBe(false);
    });

    it('isCorrect=true pour épisodes identiques', async () => {
      expect((await getResults(12, 12, 8.0, 8.0)).episodes.isCorrect).toBe(true);
    });

    it('isHigher=true pour score quand le deviné est trop bas', async () => {
      expect((await getResults(12, 12, 9.0, 7.0)).score.isHigher).toBe(true);
    });

    it('isHigher=false pour score quand le deviné est trop haut', async () => {
      expect((await getResults(12, 12, 6.0, 8.0)).score.isHigher).toBe(false);
    });
  });
});
