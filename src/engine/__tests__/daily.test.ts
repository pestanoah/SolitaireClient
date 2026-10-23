import {
  calculateDailyStreak,
  extractDailyDate,
  formatDateKey,
  getMonthCalendarData,
  isDateCompleted,
  isFutureDate,
  parseDateKey,
} from '../daily';

describe('Daily Challenge Engine', () => {
  describe('formatDateKey & parseDateKey', () => {
    test('formatDateKey formats date to YYYY-MM-DD with zero-padding', () => {
      const d1 = new Date(2026, 0, 5); // Jan 5, 2026
      expect(formatDateKey(d1)).toBe('2026-01-05');

      const d2 = new Date(2026, 9, 22); // Oct 22, 2026
      expect(formatDateKey(d2)).toBe('2026-10-22');
    });

    test('parseDateKey parses YYYY-MM-DD safely into local midnight date', () => {
      const parsed = parseDateKey('2026-04-15');
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(3); // April is index 3
      expect(parsed.getDate()).toBe(15);
    });

    test('round-trip parse and format preserves date', () => {
      const original = '2027-11-08';
      expect(formatDateKey(parseDateKey(original))).toBe(original);
    });
  });

  describe('extractDailyDate', () => {
    test('extracts date from simple date seed', () => {
      expect(extractDailyDate('2026-10-22')).toBe('2026-10-22');
    });

    test('extracts date from versioned daily seed', () => {
      expect(extractDailyDate('2026-01-05_v2')).toBe('2026-01-05');
    });

    test('returns null for non-date seeds or undefined', () => {
      expect(extractDailyDate('random-seed-123')).toBeNull();
      expect(extractDailyDate('12345')).toBeNull();
      expect(extractDailyDate(undefined)).toBeNull();
      expect(extractDailyDate('')).toBeNull();
    });
  });

  describe('isFutureDate', () => {
    const today = new Date(2026, 9, 22); // Oct 22, 2026

    test('returns false for today or past dates', () => {
      expect(isFutureDate('2026-10-22', today)).toBe(false);
      expect(isFutureDate('2026-10-21', today)).toBe(false);
      expect(isFutureDate('2025-12-31', today)).toBe(false);
    });

    test('returns true for tomorrow or future dates', () => {
      expect(isFutureDate('2026-10-23', today)).toBe(true);
      expect(isFutureDate('2027-01-01', today)).toBe(true);
    });
  });

  describe('isDateCompleted', () => {
    test('works with array of date strings', () => {
      const dates = ['2026-10-20', '2026-10-22'];
      expect(isDateCompleted('2026-10-20', dates)).toBe(true);
      expect(isDateCompleted('2026-10-21', dates)).toBe(false);
      expect(isDateCompleted('2026-10-22', dates)).toBe(true);
    });

    test('works with Set of date strings', () => {
      const set = new Set(['2026-10-20', '2026-10-22']);
      expect(isDateCompleted('2026-10-20', set)).toBe(true);
      expect(isDateCompleted('2026-10-21', set)).toBe(false);
    });

    test('works with DailyChallengeHistory record object', () => {
      const history = {
        '2026-10-20': { completed: true, score: 500, moves: 80, elapsedSeconds: 120, completedAt: '2026-10-20T12:00:00Z' },
        '2026-10-21': { completed: false, score: 0, moves: 0, elapsedSeconds: 0, completedAt: '' },
      };
      expect(isDateCompleted('2026-10-20', history)).toBe(true);
      expect(isDateCompleted('2026-10-21', history)).toBe(false);
      expect(isDateCompleted('2026-10-22', history)).toBe(false);
    });

    test('returns false for null or undefined', () => {
      expect(isDateCompleted('2026-10-22', null)).toBe(false);
      expect(isDateCompleted('2026-10-22', undefined)).toBe(false);
    });
  });

  describe('calculateDailyStreak', () => {
    const today = new Date(2026, 9, 22); // Oct 22, 2026 (YYYY-MM-DD: 2026-10-22)

    test('returns 0 streak when history is empty or null', () => {
      expect(calculateDailyStreak([], today)).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        totalCompleted: 0,
      });

      expect(calculateDailyStreak(null, today)).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        totalCompleted: 0,
      });
    });

    test('completing today only gives streak of 1', () => {
      const dates = ['2026-10-22'];
      expect(calculateDailyStreak(dates, today)).toEqual({
        currentStreak: 1,
        longestStreak: 1,
        totalCompleted: 1,
      });
    });

    test('completing yesterday keeps streak alive before playing today', () => {
      const dates = ['2026-10-21'];
      expect(calculateDailyStreak(dates, today)).toEqual({
        currentStreak: 1,
        longestStreak: 1,
        totalCompleted: 1,
      });
    });

    test('completing consecutive days leading up to today increments current streak', () => {
      const dates = ['2026-10-20', '2026-10-21', '2026-10-22'];
      expect(calculateDailyStreak(dates, today)).toEqual({
        currentStreak: 3,
        longestStreak: 3,
        totalCompleted: 3,
      });
    });

    test('consecutive days ending yesterday maintains active streak of length', () => {
      const dates = ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21'];
      expect(calculateDailyStreak(dates, today)).toEqual({
        currentStreak: 4,
        longestStreak: 4,
        totalCompleted: 4,
      });
    });

    test('missed both yesterday and today resets current streak to 0, preserves longest', () => {
      const dates = ['2026-10-18', '2026-10-19', '2026-10-20']; // Ended Oct 20, missed 21 and 22
      expect(calculateDailyStreak(dates, today)).toEqual({
        currentStreak: 0,
        longestStreak: 3,
        totalCompleted: 3,
      });
    });

    test('handles multiple separated streaks correctly', () => {
      // 5-day streak early Oct, gap, 2-day streak ending today
      const dates = [
        '2026-10-01',
        '2026-10-02',
        '2026-10-03',
        '2026-10-04',
        '2026-10-05',
        '2026-10-21',
        '2026-10-22',
      ];
      expect(calculateDailyStreak(dates, today)).toEqual({
        currentStreak: 2,
        longestStreak: 5,
        totalCompleted: 7,
      });
    });

    test('backfilling a missed past day connects two streaks', () => {
      // User did 19, 20, missed 21, did 22
      const beforeBackfill = ['2026-10-19', '2026-10-20', '2026-10-22'];
      expect(calculateDailyStreak(beforeBackfill, today)).toEqual({
        currentStreak: 1,
        longestStreak: 2,
        totalCompleted: 3,
      });

      // User navigates back to Oct 21 and completes it:
      const afterBackfill = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'];
      expect(calculateDailyStreak(afterBackfill, today)).toEqual({
        currentStreak: 4,
        longestStreak: 4,
        totalCompleted: 4,
      });
    });

    test('handles month boundaries seamlessly', () => {
      const endOfJan = new Date(2026, 1, 2); // Feb 2, 2026
      const dates = ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02'];
      expect(calculateDailyStreak(dates, endOfJan)).toEqual({
        currentStreak: 4,
        longestStreak: 4,
        totalCompleted: 4,
      });
    });

    test('handles leap year seamlessly (Feb 28 -> Feb 29 -> Mar 1 in 2028)', () => {
      const marchFirstLeap = new Date(2028, 2, 1); // Mar 1, 2028
      const dates = ['2028-02-28', '2028-02-29', '2028-03-01'];
      expect(calculateDailyStreak(dates, marchFirstLeap)).toEqual({
        currentStreak: 3,
        longestStreak: 3,
        totalCompleted: 3,
      });
    });

    test('duplicate dates in input do not double count or corrupt streak', () => {
      const dates = ['2026-10-22', '2026-10-22', '2026-10-21', '2026-10-22'];
      expect(calculateDailyStreak(dates, today)).toEqual({
        currentStreak: 2,
        longestStreak: 2,
        totalCompleted: 2,
      });
    });
  });

  describe('getMonthCalendarData', () => {
    test('returns correct day count and start day for October 2026', () => {
      // Oct 2026 has 31 days. Oct 1, 2026 is a Thursday (index 4)
      const data = getMonthCalendarData(2026, 9);
      expect(data.daysInMonth).toBe(31);
      expect(data.firstDayOfWeek).toBe(4);
    });

    test('returns 28 days for February in non-leap year (2026)', () => {
      const data = getMonthCalendarData(2026, 1);
      expect(data.daysInMonth).toBe(28);
    });

    test('returns 29 days for February in leap year (2028)', () => {
      const data = getMonthCalendarData(2028, 1);
      expect(data.daysInMonth).toBe(29);
    });
  });
});
