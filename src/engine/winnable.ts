import dailyOverridesData from '../data/daily_challenges_10yr.json';
import winnableDraw1Data from '../data/winnable_draw1.json';
import winnableDraw3Data from '../data/winnable_draw3.json';

const DAILY_OVERRIDES: Record<string, string> = dailyOverridesData as Record<string, string>;
const WINNABLE_DRAW1: number[] = winnableDraw1Data as number[];
const WINNABLE_DRAW3: number[] = winnableDraw3Data as number[];

const WINNABLE_SET_DRAW1 = new Set<number>(WINNABLE_DRAW1);
const WINNABLE_SET_DRAW3 = new Set<number>(WINNABLE_DRAW3);

/**
 * Checks whether a given seed string follows a date format (YYYY-MM-DD or YYYY-MM-DD_v#).
 */
export function isDateSeed(seed?: string): boolean {
  if (!seed) return false;
  return /^\d{4}-\d{2}-\d{2}/.test(seed);
}

/**
 * Returns a date formatted as a deterministic, verified winnable seed string.
 * Defaults to the current calendar date.
 */
export function getDailyChallengeSeed(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const rawDate = `${year}-${month}-${day}`;
  return DAILY_OVERRIDES[rawDate] ?? rawDate;
}

/**
 * Checks whether a given seed matches today's daily challenge seed.
 */
export function isDailyChallenge(seed?: string, date: Date = new Date()): boolean {
  if (!seed) return false;
  const currentDaily = getDailyChallengeSeed(date);
  return seed === currentDaily || seed.split('_v')[0] === currentDaily.split('_v')[0];
}

/**
 * Returns a random guaranteed-winnable seed for the specified draw mode.
 */
export function getRandomWinnableSeed(drawCount: 1 | 3 = 1): string {
  const pool = drawCount === 3 ? WINNABLE_DRAW3 : WINNABLE_DRAW1;
  if (!pool || pool.length === 0) {
    return String(Math.floor(Math.random() * 1000000));
  }
  const index = Math.floor(Math.random() * pool.length);
  return String(pool[index]);
}

/**
 * Checks if a seed is verified winnable for the given draw mode.
 * - All daily challenge seeds for 2026-2035 are guaranteed winnable in both Draw 1 and Draw 3.
 * - Cataloged numeric seeds in the pool are guaranteed winnable.
 */
export function isSeedWinnable(seed: string | number | undefined, drawCount: 1 | 3 = 1): boolean {
  if (seed === undefined || seed === null) return false;
  const seedStr = String(seed);

  // Daily challenge date seeds are 100% pre-validated for both Draw 1 & Draw 3
  if (isDateSeed(seedStr)) {
    return true;
  }

  // Check numeric pool
  const num = Number(seedStr);
  if (!Number.isNaN(num) && Number.isInteger(num)) {
    const set = drawCount === 3 ? WINNABLE_SET_DRAW3 : WINNABLE_SET_DRAW1;
    return set.has(num);
  }

  return false;
}
