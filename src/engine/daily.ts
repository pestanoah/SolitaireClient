import { isDateSeed } from './winnable';

export interface DailyChallengeRecord {
  completed: boolean;
  score: number;
  moves: number;
  elapsedSeconds: number;
  completedAt: string;
}

export type DailyChallengeHistory = Record<string, DailyChallengeRecord>;

export interface DailyStreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
}

/**
 * Formats a Date object into a YYYY-MM-DD string according to local calendar time.
 */
export function formatDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date object at midnight.
 */
export function parseDateKey(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Extracts the YYYY-MM-DD date component from a seed string.
 * Returns null if the seed is not a date-based seed.
 */
export function extractDailyDate(seed?: string): string | null {
  if (!seed || !isDateSeed(seed)) return null;
  const match = seed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Checks whether a given date is strictly in the future compared to reference date.
 */
export function isFutureDate(dateOrKey: Date | string, referenceDate: Date = new Date()): boolean {
  const targetKey = typeof dateOrKey === 'string' ? dateOrKey.slice(0, 10) : formatDateKey(dateOrKey);
  const refKey = formatDateKey(referenceDate);
  return targetKey > refKey;
}

/**
 * Checks whether a specific date has been completed in the daily history.
 */
export function isDateCompleted(
  dateOrKey: Date | string,
  historyOrDates?: DailyChallengeHistory | Set<string> | string[] | null
): boolean {
  if (!historyOrDates) return false;
  const key = typeof dateOrKey === 'string' ? dateOrKey.slice(0, 10) : formatDateKey(dateOrKey);

  if (Array.isArray(historyOrDates)) {
    return historyOrDates.some((d) => d.slice(0, 10) === key);
  }
  if (historyOrDates instanceof Set) {
    return historyOrDates.has(key);
  }

  const record = historyOrDates[key];
  return Boolean(record && record.completed);
}

/**
 * Normalizes any history representation into a unique Set of completed YYYY-MM-DD strings.
 */
function extractCompletedDateSet(
  completed: DailyChallengeHistory | Set<string> | string[] | null | undefined
): Set<string> {
  const set = new Set<string>();
  if (!completed) return set;

  if (Array.isArray(completed)) {
    for (const d of completed) {
      if (typeof d === 'string' && d.length >= 10) {
        set.add(d.slice(0, 10));
      }
    }
  } else if (completed instanceof Set) {
    for (const d of completed) {
      if (typeof d === 'string' && d.length >= 10) {
        set.add(d.slice(0, 10));
      }
    }
  } else {
    for (const [key, rec] of Object.entries(completed)) {
      if (rec && rec.completed) {
        set.add(key.slice(0, 10));
      }
    }
  }

  return set;
}

/**
 * Calculates current consecutive streak, longest consecutive streak, and total completed challenges.
 * - Current streak: Number of consecutive days completed up to today.
 *   If today is not yet completed, but yesterday was, the streak is maintained until the end of today.
 * - Longest streak: Highest number of consecutive days ever completed.
 * - Total completed: Count of unique calendar days completed.
 */
export function calculateDailyStreak(
  completed?: DailyChallengeHistory | Set<string> | string[] | null,
  referenceDate: Date = new Date()
): DailyStreakInfo {
  const completedSet = extractCompletedDateSet(completed);
  const totalCompleted = completedSet.size;

  if (totalCompleted === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalCompleted: 0,
    };
  }

  // 1. Calculate longest streak across all completed dates
  const sortedDates = Array.from(completedSet).sort();
  let longestStreak = 1;
  let currentRun = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = parseDateKey(sortedDates[i - 1]);
    const curr = parseDateKey(sortedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentRun++;
      if (currentRun > longestStreak) {
        longestStreak = currentRun;
      }
    } else if (diffDays > 1) {
      currentRun = 1;
    }
  }

  // 2. Calculate current active streak ending today or yesterday
  const todayKey = formatDateKey(referenceDate);
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  let startKey: string | null = null;
  if (completedSet.has(todayKey)) {
    startKey = todayKey;
  } else if (completedSet.has(yesterdayKey)) {
    startKey = yesterdayKey;
  }

  let currentStreak = 0;
  if (startKey) {
    let streakCount = 0;
    const cursor = parseDateKey(startKey);

    while (completedSet.has(formatDateKey(cursor))) {
      streakCount++;
      cursor.setDate(cursor.getDate() - 1);
    }
    currentStreak = streakCount;
  }

  // Ensure longest streak is at least as large as current streak
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return {
    currentStreak,
    longestStreak,
    totalCompleted,
  };
}

/**
 * Returns month calendar metadata: number of days in the given month and the weekday of the 1st.
 * @param year e.g. 2026
 * @param monthIndex 0-11 (0 = January, 11 = December)
 */
export function getMonthCalendarData(year: number, monthIndex: number): {
  daysInMonth: number;
  firstDayOfWeek: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
} {
  // Day 0 of next month gives the last day of monthIndex
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();

  return {
    daysInMonth,
    firstDayOfWeek,
  };
}
