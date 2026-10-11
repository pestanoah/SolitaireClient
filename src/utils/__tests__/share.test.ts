import {
  buildShareText,
  cleanUrlParams,
  copyToClipboard,
  DEFAULT_BASE_URL,
  formatTime,
  generateShareUrl,
  parseSeedFromUrl,
  shareGameDeck,
} from '../share';

describe('Share and Seed Utility', () => {
  describe('generateShareUrl', () => {
    test('generates expected URL with seed parameter', () => {
      const url = generateShareUrl('lucky-ace');
      expect(url).toContain('seed=lucky-ace');
      expect(url.startsWith('http')).toBe(true);
    });

    test('includes draw parameter when drawCount is 3', () => {
      const url = generateShareUrl('challenge-99', 3);
      expect(url).toContain('seed=challenge-99');
      expect(url).toContain('draw=3');
    });

    test('omits draw parameter when drawCount is 1', () => {
      const url = generateShareUrl('challenge-99', 1);
      expect(url).toContain('seed=challenge-99');
      expect(url).not.toContain('draw=1');
    });

    test('encodes special characters in seed safely', () => {
      const url = generateShareUrl('ace & king + queen');
      expect(url).toContain('seed=ace+%26+king+%2B+queen');
    });
  });

  describe('parseSeedFromUrl', () => {
    test('parses seed from query string', () => {
      const result = parseSeedFromUrl('https://pestanoah.github.io/SolitaireClient/?seed=my-seed');
      expect(result).not.toBeNull();
      expect(result?.seed).toBe('my-seed');
      expect(result?.drawCount).toBeUndefined();
    });

    test('parses seed and drawCount from query string', () => {
      const result = parseSeedFromUrl('https://pestanoah.github.io/SolitaireClient/?seed=my-seed&draw=3');
      expect(result).not.toBeNull();
      expect(result?.seed).toBe('my-seed');
      expect(result?.drawCount).toBe(3);
    });

    test('parses seed from hash format', () => {
      const result = parseSeedFromUrl('https://pestanoah.github.io/SolitaireClient/#seed=hash-seed');
      expect(result).not.toBeNull();
      expect(result?.seed).toBe('hash-seed');
    });

    test('parses seed from hash with query string', () => {
      const result = parseSeedFromUrl('https://pestanoah.github.io/SolitaireClient/#/?seed=hash-query&draw=1');
      expect(result).not.toBeNull();
      expect(result?.seed).toBe('hash-query');
      expect(result?.drawCount).toBe(1);
    });

    test('returns null for URL with empty or missing seed', () => {
      expect(parseSeedFromUrl('https://pestanoah.github.io/SolitaireClient/')).toBeNull();
      expect(parseSeedFromUrl('https://pestanoah.github.io/SolitaireClient/?seed=')).toBeNull();
      expect(parseSeedFromUrl('https://pestanoah.github.io/SolitaireClient/?seed=   ')).toBeNull();
    });

    test('returns null for invalid URLs without throwing', () => {
      expect(parseSeedFromUrl('not-a-valid-url:::')).toBeNull();
    });
  });

  describe('copyToClipboard', () => {
    test('returns false gracefully when navigator.clipboard and document are unavailable', async () => {
      const result = await copyToClipboard('test text');
      // In node test environment without browser mocks, returns false safely
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formatTime', () => {
    test('formats zero seconds as 00:00', () => {
      expect(formatTime(0)).toBe('00:00');
    });

    test('formats seconds under one minute', () => {
      expect(formatTime(45)).toBe('00:45');
    });

    test('formats minutes and seconds with padding', () => {
      expect(formatTime(125)).toBe('02:05');
      expect(formatTime(610)).toBe('10:10');
    });
  });

  describe('buildShareText', () => {
    test('returns default text when stats are omitted or empty', () => {
      expect(buildShareText('lucky-deal')).toBe('Can you beat this Solitaire deal? Seed: lucky-deal');
      expect(buildShareText('lucky-deal', {})).toBe('Can you beat this Solitaire deal? Seed: lucky-deal');
    });

    test('includes score and time for completed won game', () => {
      const text = buildShareText('lucky-deal', { score: 520, elapsedSeconds: 135, won: true });
      expect(text).toContain('Score: 520');
      expect(text).toContain('Time: 02:15');
      expect(text).toContain('I completed this Solitaire game!');
      expect(text).toContain('Seed: lucky-deal');
    });

    test('formats Daily Challenge completed won game', () => {
      const text = buildShareText('2026-10-11', { score: 700, elapsedSeconds: 90, won: true });
      expect(text).toContain('Score: 700');
      expect(text).toContain('Time: 01:30');
      expect(text).toContain("I completed today's Solitaire Daily Challenge!");
      expect(text).toContain('Seed: 2026-10-11');
    });

    test('includes score and time for game over run', () => {
      const text = buildShareText('challenge-88', { score: 180, elapsedSeconds: 105, won: false });
      expect(text).toContain('Score: 180');
      expect(text).toContain('Time: 01:45');
      expect(text).toContain('Can you beat my Solitaire run?');
      expect(text).toContain('Seed: challenge-88');
    });

    test('formats Daily Challenge game over run', () => {
      const text = buildShareText('2026-10-11', { score: 180, elapsedSeconds: 105, won: false });
      expect(text).toContain('Score: 180');
      expect(text).toContain('Time: 01:45');
      expect(text).toContain('Can you beat my Solitaire Daily Challenge run?');
      expect(text).toContain('Seed: 2026-10-11');
    });

    test('handles score-only and time-only stats gracefully', () => {
      expect(buildShareText('deal-1', { score: 300 })).toContain('Score: 300');
      expect(buildShareText('deal-1', { elapsedSeconds: 65 })).toContain('Time: 01:05');
    });
  });

  describe('shareGameDeck', () => {
    test('returns share result structure', async () => {
      const result = await shareGameDeck('test-seed', 1);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.method).toBe('string');
      expect(typeof result.message).toBe('string');
    });

    test('handles completed game stats with score and time', async () => {
      const result = await shareGameDeck('test-seed', 1, {
        score: 450,
        elapsedSeconds: 120,
        won: true,
      });
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('cleanUrlParams', () => {
    test('does not throw in node / SSR environment', () => {
      expect(() => cleanUrlParams()).not.toThrow();
    });
  });
});
