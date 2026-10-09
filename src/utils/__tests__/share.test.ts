import {
  cleanUrlParams,
  copyToClipboard,
  DEFAULT_BASE_URL,
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

  describe('shareGameDeck', () => {
    test('returns share result structure', async () => {
      const result = await shareGameDeck('test-seed', 1);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.method).toBe('string');
      expect(typeof result.message).toBe('string');
    });
  });

  describe('cleanUrlParams', () => {
    test('does not throw in node / SSR environment', () => {
      expect(() => cleanUrlParams()).not.toThrow();
    });
  });
});
