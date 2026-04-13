/** biome-ignore-all lint/style/useNamingConvention: Tkt c fine */
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CharacterEntity } from '../CharacterRepository';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  db: {},
  ensureMongooseConnection: vi.fn().mockResolvedValue(undefined),
}));

const mocks = vi.hoisted(() => ({
  findAll: vi.fn(),
  findOneByAnimeId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  saveCurrentCharacter: vi.fn().mockResolvedValue(undefined),
  getCurrentCharacter: vi.fn(),
  recordGuess: vi.fn().mockResolvedValue(undefined),
  recordWin: vi.fn().mockResolvedValue(undefined),
  animesFindById: vi.fn(),
}));

vi.mock('@/services/CharacterRepository', () => ({
  CharacterRepository: class {
    findAll = mocks.findAll;
    findOneByAnimeId = mocks.findOneByAnimeId;
    create = mocks.create;
    update = mocks.update;
    delete = mocks.del;
  },
}));

vi.mock('@/services/CurrentCharacterRepositories', () => ({
  CurrentCharacterRepository: class {
    saveCurrentCharacter = mocks.saveCurrentCharacter;
    getCurrentCharacter = mocks.getCurrentCharacter;
    recordGuess = mocks.recordGuess;
    recordWin = mocks.recordWin;
  },
}));

vi.mock('@/services/AnimeRepositories', () => ({
  AnimeRepository: class {
    findById = mocks.animesFindById;
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { CharacterService } from '../CharacterService';

function makeCharacterEntity(overrides: Partial<CharacterEntity> = {}): CharacterEntity {
  return {
    _id: new Types.ObjectId(),
    name: 'Naruto Uzumaki',
    anime_id: 'anime-123',
    images_webp: {
      image_url: 'https://cdn.myanimelist.net/images/characters/1/1.webp',
      small_image_url: 'https://cdn.myanimelist.net/images/characters/1/1s.webp',
      large_image_url: 'https://cdn.myanimelist.net/images/characters/1/1l.webp',
    },
    anime_titles: [
      { type: 'Default', title: 'Naruto' },
      { type: 'Japanese', title: 'ナルト' },
    ],
    anime_genres: ['Action', 'Adventure'],
    demographic_type: 'Shounen',
    ...overrides,
  };
}

/** Réinitialise le singleton et retourne une nouvelle instance. */
function getService(): CharacterService {
  (CharacterService as unknown as { instance: unknown }).instance = undefined;
  return CharacterService.getInstance();
}

/** Configure getCurrentCharacter pour retourner un personnage avec la date d'aujourd'hui. */
function setupCurrentCharacter(entity: CharacterEntity): void {
  mocks.getCurrentCharacter.mockResolvedValue({ character: entity, date: new Date() });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CharacterService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.saveCurrentCharacter.mockResolvedValue(undefined);
    mocks.recordGuess.mockResolvedValue(undefined);
    mocks.recordWin.mockResolvedValue(undefined);
  });

  // ── getDailyCharacters ────────────────────────────────────────────────────

  describe('getDailyCharacters', () => {
    it('retourne la liste des personnages mappés en DailyCharacterItemDTO', async () => {
      const entity = makeCharacterEntity();
      mocks.findAll.mockResolvedValue([entity]);

      const result = await getService().getDailyCharacters();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: entity._id?.toHexString(),
        animeId: 'anime-123',
        name: 'Naruto Uzumaki',
        animeTitle: 'Naruto',
        imageUrl: 'https://cdn.myanimelist.net/images/characters/1/1.webp',
      });
    });

    it('retourne un tableau vide si aucun personnage en base', async () => {
      mocks.findAll.mockResolvedValue([]);
      expect(await getService().getDailyCharacters()).toEqual([]);
    });

    it('utilise le premier titre si aucun titre "Default" n\'existe', async () => {
      const entity = makeCharacterEntity({
        anime_titles: [{ type: 'Japanese', title: 'ワンピース' }],
      });
      mocks.findAll.mockResolvedValue([entity]);

      const [item] = await getService().getDailyCharacters();
      expect(item.animeTitle).toBe('ワンピース');
    });

    it('retourne une imageUrl vide si images_webp est invalide', async () => {
      const entity = makeCharacterEntity({ images_webp: null });
      mocks.findAll.mockResolvedValue([entity]);

      const [item] = await getService().getDailyCharacters();
      expect(item.imageUrl).toBe('');
    });
  });

  // ── getDailyCharacterHintConfig ───────────────────────────────────────────

  describe('getDailyCharacterHintConfig', () => {
    it('retourne la configuration des indices avec les paliers par défaut', async () => {
      const entity = makeCharacterEntity();
      setupCurrentCharacter(entity);

      const config = await getService().getDailyCharacterHintConfig();

      expect(config.hintTiers).toEqual(CharacterService.DEFAULT_HINT_TIERS);
      expect(config.imageBlur.totalGuessesUntilClear).toBe(CharacterService.DEFAULT_IMAGE_BLUR_TOTAL_GUESSES);
      expect(config.mysteryImageUrl).toBe('https://cdn.myanimelist.net/images/characters/1/1.webp');
      expect(config.mysteryCharacterName).toBe('Naruto Uzumaki');
    });

    it('imageBlur.totalGuessesUntilClear vaut au minimum 1', async () => {
      const entity = makeCharacterEntity();
      setupCurrentCharacter(entity);

      const service = getService();
      service.imageBlurTotalGuesses = 0;
      const config = await service.getDailyCharacterHintConfig();

      expect(config.imageBlur.totalGuessesUntilClear).toBe(1);
    });

    it('retourne les paliers personnalisés si modifiés', async () => {
      const entity = makeCharacterEntity();
      setupCurrentCharacter(entity);

      const service = getService();
      service.hintTiers = [{ afterGuessCount: 5, revealAttributes: ['demographicType'] }];
      const config = await service.getDailyCharacterHintConfig();

      expect(config.hintTiers).toEqual([{ afterGuessCount: 5, revealAttributes: ['demographicType'] }]);
    });

    it('actualise le personnage du jour si aucun en base', async () => {
      const entity = makeCharacterEntity();
      // Pas de personnage courant → updateGoalCharacter est appelé
      mocks.getCurrentCharacter.mockResolvedValue(null);
      mocks.findAll.mockResolvedValue([entity]);

      const config = await getService().getDailyCharacterHintConfig();

      expect(mocks.saveCurrentCharacter).toHaveBeenCalledTimes(1);
      expect(config.mysteryCharacterName).toBe('Naruto Uzumaki');
    });
  });

  // ── getRandomCharacterEndlessTarget ──────────────────────────────────────

  describe('getRandomCharacterEndlessTarget', () => {
    it('retourne un objet cible avec id, imageUrl et nom du personnage', async () => {
      const entity = makeCharacterEntity();
      mocks.findAll.mockResolvedValue([entity]);

      const target = await getService().getRandomCharacterEndlessTarget();

      expect(target).not.toBeNull();
      expect(target?.id).toBe('anime-123');
      expect(target?.mysteryCharacterName).toBe('Naruto Uzumaki');
      expect(target?.mysteryImageUrl).toBe('https://cdn.myanimelist.net/images/characters/1/1.webp');
    });

    it('retourne null si aucun personnage en base', async () => {
      mocks.findAll.mockResolvedValue([]);

      const target = await getService().getRandomCharacterEndlessTarget();
      expect(target).toBeNull();
    });

    it('retourne null si le dépôt lève une exception', async () => {
      mocks.findAll.mockRejectedValue(new Error('DB error'));

      const target = await getService().getRandomCharacterEndlessTarget();
      expect(target).toBeNull();
    });
  });

  // ── guessEndlessCharacter ─────────────────────────────────────────────────

  describe('guessEndlessCharacter', () => {
    it("retourne isCorrect=true quand l'anime deviné correspond à la référence", async () => {
      const ref = makeCharacterEntity({ anime_id: 'anime-abc' });
      mocks.findOneByAnimeId.mockResolvedValue(ref);

      const result = await getService().guessEndlessCharacter('anime-abc', 1, 'anime-abc');

      expect(result.isCorrect).toBe(true);
      expect(result.guessNumber).toBe(1);
      expect(result.guessedAnimeId).toBe('anime-abc');
    });

    it("retourne isCorrect=false quand l'anime deviné ne correspond pas", async () => {
      const ref = makeCharacterEntity({ anime_id: 'anime-abc' });
      mocks.findOneByAnimeId.mockResolvedValue(ref);

      const result = await getService().guessEndlessCharacter('anime-other', 2, 'anime-abc');

      expect(result.isCorrect).toBe(false);
      expect(result.guessedAnimeId).toBe('anime-other');
    });

    it('lève une erreur si le personnage de référence est introuvable', async () => {
      mocks.findOneByAnimeId.mockResolvedValue(null);

      await expect(getService().guessEndlessCharacter('anime-x', 1, 'anime-unknown')).rejects.toThrow(
        'Reference character not found',
      );
    });
  });

  // ── updateGoalCharacter ───────────────────────────────────────────────────

  describe('updateGoalCharacter', () => {
    it('sélectionne un personnage au hasard et le sauvegarde', async () => {
      const entities = [makeCharacterEntity(), makeCharacterEntity(), makeCharacterEntity()];
      mocks.findAll.mockResolvedValue(entities);

      const result = await getService().updateGoalCharacter();

      expect(mocks.saveCurrentCharacter).toHaveBeenCalledTimes(1);
      expect(entities.some((e) => e._id?.toHexString() === result._id?.toHexString())).toBe(true);
    });

    it("lève une erreur si aucun personnage n'est en base", async () => {
      mocks.findAll.mockResolvedValue([]);

      await expect(getService().updateGoalCharacter()).rejects.toThrow(
        'No characters found to update the goal character.',
      );
    });
  });

  // ── guessDailyCharacter ───────────────────────────────────────────────────

  describe('guessDailyCharacter', () => {
    it("retourne isCorrect=true quand l'anime deviné est le bon", async () => {
      const entity = makeCharacterEntity({ anime_id: 'anime-correct' });
      setupCurrentCharacter(entity);

      const result = await getService().guessDailyCharacter('anime-correct', 1);

      expect(result.isCorrect).toBe(true);
      expect(result.guessNumber).toBe(1);
      expect(mocks.recordGuess).toHaveBeenCalledWith('anime-correct');
      expect(mocks.recordWin).toHaveBeenCalledWith(1);
    });

    it("retourne isCorrect=false quand l'anime deviné est faux", async () => {
      const entity = makeCharacterEntity({ anime_id: 'anime-correct' });
      setupCurrentCharacter(entity);

      const result = await getService().guessDailyCharacter('anime-wrong', 3);

      expect(result.isCorrect).toBe(false);
      expect(result.guessNumber).toBe(3);
      expect(mocks.recordGuess).toHaveBeenCalledWith('anime-wrong');
      expect(mocks.recordWin).not.toHaveBeenCalled();
    });

    it('fournit tous les indices en cas de victoire', async () => {
      const entity = makeCharacterEntity({
        anime_id: 'anime-win',
        demographic_type: 'Shounen',
        anime_genres: ['Action', 'Adventure'],
      });
      setupCurrentCharacter(entity);

      const result = await getService().guessDailyCharacter('anime-win', 1);

      expect(result.hints.demographicType).toBe('Shounen');
      expect(result.hints.animeGenres).toEqual(['Action', 'Adventure']);
    });

    it("ne fournit aucun indice avant les paliers en cas d'échec", async () => {
      const entity = makeCharacterEntity({ anime_id: 'anime-target' });
      setupCurrentCharacter(entity);

      const result = await getService().guessDailyCharacter('anime-wrong', 1);

      expect(result.hints.demographicType).toBeUndefined();
      expect(result.hints.animeGenres).toBeUndefined();
    });
  });

  // ── buildHintsForGuess (via guessDailyCharacter) ──────────────────────────

  describe('indices selon les paliers', () => {
    it('révèle demographicType après le palier afterGuessCount=9', async () => {
      const entity = makeCharacterEntity({
        anime_id: 'anime-target',
        demographic_type: 'Seinen',
        anime_genres: ['Mystery'],
      });
      setupCurrentCharacter(entity);

      const result = await getService().guessDailyCharacter('anime-wrong', 9);

      expect(result.hints.demographicType).toBe('Seinen');
      expect(result.hints.animeGenres).toBeUndefined();
    });

    it('révèle animeGenres après le palier afterGuessCount=12', async () => {
      const entity = makeCharacterEntity({
        anime_id: 'anime-target',
        demographic_type: 'Seinen',
        anime_genres: ['Mystery', 'Thriller'],
      });
      setupCurrentCharacter(entity);

      const result = await getService().guessDailyCharacter('anime-wrong', 12);

      expect(result.hints.demographicType).toBe('Seinen');
      expect(result.hints.animeGenres).toEqual(['Mystery', 'Thriller']);
    });

    it('ne révèle aucun indice pour guessNumber < premier palier', async () => {
      const entity = makeCharacterEntity({ anime_id: 'anime-target' });
      setupCurrentCharacter(entity);

      const result = await getService().guessDailyCharacter('anime-wrong', 8);

      expect(result.hints).toEqual({});
    });
  });

  // ── getAdminCharacterList ─────────────────────────────────────────────────

  describe('getAdminCharacterList', () => {
    it('retourne la liste complète des personnages avec toutes leurs données', async () => {
      const entity = makeCharacterEntity();
      mocks.findAll.mockResolvedValue([entity]);

      const [admin] = await getService().getAdminCharacterList();

      expect(admin.id).toBe(entity._id?.toHexString());
      expect(admin.name).toBe('Naruto Uzumaki');
      expect(admin.animeId).toBe('anime-123');
      expect(admin.animeTitle).toBe('Naruto');
      expect(admin.demographicType).toBe('Shounen');
      expect(admin.animeGenres).toEqual(['Action', 'Adventure']);
    });
  });

  // ── createCharacter ───────────────────────────────────────────────────────

  describe('createCharacter', () => {
    const animeData = {
      _id: new Types.ObjectId(),
      titles: [{ type: 'Default', title: 'Bleach' }],
      genres: ['Action'],
      demographic_type: 'Shounen',
    };

    it("crée un personnage avec les données de l'anime associé", async () => {
      const created = makeCharacterEntity({ anime_id: 'anime-bleach' });
      mocks.animesFindById.mockResolvedValue(animeData);
      mocks.create.mockResolvedValue(created);

      await getService().createCharacter({
        name: 'Ichigo Kurosaki',
        imageUrl: 'https://cdn.myanimelist.net/images/characters/2/2.webp',
        animeId: 'anime-bleach',
      });

      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ichigo Kurosaki',
          anime_id: 'anime-bleach',
          anime_titles: animeData.titles,
          anime_genres: animeData.genres,
          demographic_type: 'Shounen',
        }),
      );
    });

    it("lève une erreur si l'anime n'existe pas", async () => {
      mocks.animesFindById.mockResolvedValue(null);

      await expect(
        getService().createCharacter({ name: 'Test', imageUrl: 'https://x.com/img.webp', animeId: 'inexistant' }),
      ).rejects.toThrow('Anime non trouvé');
    });
  });

  // ── updateCharacter ───────────────────────────────────────────────────────

  describe('updateCharacter', () => {
    const animeData = {
      titles: [{ type: 'Default', title: 'One Piece' }],
      genres: ['Adventure'],
      demographic_type: 'Shounen',
    };

    it('retourne le DTO mis à jour si le personnage existe', async () => {
      const updated = makeCharacterEntity({ name: 'Roronoa Zoro' });
      mocks.animesFindById.mockResolvedValue(animeData);
      mocks.update.mockResolvedValue(updated);

      const result = await getService().updateCharacter('char-id', {
        name: 'Roronoa Zoro',
        imageUrl: 'https://cdn.myanimelist.net/images/characters/3/3.webp',
        animeId: 'anime-op',
      });

      expect(result?.name).toBe('Roronoa Zoro');
    });

    it("retourne null si le personnage n'existe pas", async () => {
      mocks.animesFindById.mockResolvedValue(animeData);
      mocks.update.mockResolvedValue(null);

      const result = await getService().updateCharacter('inexistant', {
        name: 'Test',
        imageUrl: 'https://cdn.myanimelist.net/images/characters/3/3.webp',
        animeId: 'anime-op',
      });

      expect(result).toBeNull();
    });

    it("lève une erreur si l'anime associé n'existe pas", async () => {
      mocks.animesFindById.mockResolvedValue(null);

      await expect(
        getService().updateCharacter('char-id', {
          name: 'Test',
          imageUrl: 'https://x.com/img.webp',
          animeId: 'inexistant',
        }),
      ).rejects.toThrow('Anime non trouvé');
    });
  });

  // ── deleteCharacter ───────────────────────────────────────────────────────

  describe('deleteCharacter', () => {
    it('retourne true si le personnage a été supprimé', async () => {
      mocks.del.mockResolvedValue(true);

      expect(await getService().deleteCharacter('char-id')).toBe(true);
      expect(mocks.del).toHaveBeenCalledWith('char-id');
    });

    it("retourne false si le personnage n'existe pas", async () => {
      mocks.del.mockResolvedValue(false);

      expect(await getService().deleteCharacter('inexistant')).toBe(false);
    });
  });

  // ── actualisation automatique du personnage du jour ───────────────────────

  describe('actualisation du personnage du jour', () => {
    it("actualise le personnage si la date est différente d'aujourd'hui", async () => {
      const oldEntity = makeCharacterEntity({ name: 'Old Character' });
      const newEntity = makeCharacterEntity({ name: 'New Character' });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mocks.getCurrentCharacter.mockResolvedValue({ character: oldEntity, date: yesterday });
      mocks.findAll.mockResolvedValue([newEntity]);

      const config = await getService().getDailyCharacterHintConfig();

      expect(mocks.saveCurrentCharacter).toHaveBeenCalledTimes(1);
      expect(config.mysteryCharacterName).toBe('New Character');
    });
  });
});
