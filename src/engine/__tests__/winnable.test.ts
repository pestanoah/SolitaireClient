import {
  getDailyChallengeSeed,
  getRandomWinnableSeed,
  isDailyChallenge,
  isDateSeed,
  isSeedWinnable,
} from '../winnable';
import { dealKlondike } from '../deck';

describe('Winnable Seeds & Daily Challenges Engine', () => {
  describe('isDateSeed', () => {
    it('identifies standard YYYY-MM-DD date seeds', () => {
      expect(isDateSeed('2026-10-11')).toBe(true);
      expect(isDateSeed('2030-01-01')).toBe(true);
    });

    it('identifies salted date seeds', () => {
      expect(isDateSeed('2026-01-05_v2')).toBe(true);
    });

    it('rejects non-date seeds', () => {
      expect(isDateSeed('42')).toBe(false);
      expect(isDateSeed('k8m2b1x4')).toBe(false);
      expect(isDateSeed(undefined)).toBe(false);
    });
  });

  describe('getDailyChallengeSeed & isDailyChallenge', () => {
    it('returns a verified seed for current date', () => {
      const seed = getDailyChallengeSeed();
      expect(typeof seed).toBe('string');
      expect(isDateSeed(seed)).toBe(true);
    });

    it('recognizes today as daily challenge', () => {
      const todaySeed = getDailyChallengeSeed();
      expect(isDailyChallenge(todaySeed)).toBe(true);
      expect(isDailyChallenge(todaySeed.split('_v')[0])).toBe(true);
      expect(isDailyChallenge('random_seed')).toBe(false);
    });
  });

  describe('getRandomWinnableSeed', () => {
    it('returns a non-empty string for Draw 1', () => {
      const seed = getRandomWinnableSeed(1);
      expect(seed).toBeDefined();
      expect(Number(seed)).toBeGreaterThan(0);
      expect(isSeedWinnable(seed, 1)).toBe(true);
    });

    it('returns a non-empty string for Draw 3', () => {
      const seed = getRandomWinnableSeed(3);
      expect(seed).toBeDefined();
      expect(Number(seed)).toBeGreaterThan(0);
      expect(isSeedWinnable(seed, 3)).toBe(true);
    });
  });

  describe('isSeedWinnable', () => {
    it('guarantees all daily challenge date seeds are winnable in both Draw 1 and Draw 3', () => {
      expect(isSeedWinnable('2026-10-11', 1)).toBe(true);
      expect(isSeedWinnable('2026-10-11', 3)).toBe(true);
      expect(isSeedWinnable('2030-05-20', 1)).toBe(true);
      expect(isSeedWinnable('2030-05-20', 3)).toBe(true);
    });

    it('identifies winnable seeds from catalog', () => {
      // Seeds in initial catalog
      expect(isSeedWinnable(2, 1)).toBe(true);
      expect(isSeedWinnable('2', 1)).toBe(true);
      expect(isSeedWinnable(2, 3)).toBe(true);
    });

    it('returns false for undefined or unverified arbitrary strings', () => {
      expect(isSeedWinnable(undefined, 1)).toBe(false);
      expect(isSeedWinnable('arbitrary_unknown_seed', 1)).toBe(false);
      expect(isSeedWinnable(999999999, 1)).toBe(false);
    });
  });

  describe('dealKlondike with winnableOnly', () => {
    it('deals a winnable seed by default', () => {
      const game = dealKlondike(1);
      expect(game.seed).toBeDefined();
      expect(isSeedWinnable(game.seed, 1)).toBe(true);
    });

    it('respects winnableOnly=false by generating a random alphanumeric seed', () => {
      const game = dealKlondike(1, undefined, false);
      expect(game.seed).toBeDefined();
      // Random seeds are strings like "k8m2b1x4"
      expect(typeof game.seed).toBe('string');
    });

    it('respects an explicit seed', () => {
      const game = dealKlondike(1, 'custom_seed');
      expect(game.seed).toBe('custom_seed');
    });
  });
});
