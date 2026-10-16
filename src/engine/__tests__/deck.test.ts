import {
  createEmptyGame,
  createPrng,
  createStandardDeck,
  dealKlondike,
  dealKlondikeFromDeck,
  generateKlondikeDealSteps,
  generateRandomSeed,
  getDailyChallengeSeed,
  hashStringToSeed,
  isDailyChallenge,
  isDateSeed,
  shuffleCards,
} from '../deck';

describe('Deck and Seed Engine', () => {
  describe('hashStringToSeed', () => {
    test('produces deterministic 32-bit unsigned integer hashes', () => {
      const h1 = hashStringToSeed('test-seed');
      const h2 = hashStringToSeed('test-seed');
      expect(h1).toBe(h2);
      expect(h1).toBeGreaterThan(0);
    });

    test('produces distinct hashes for different seeds (avalanche effect)', () => {
      const h1 = hashStringToSeed('solitaire-1');
      const h2 = hashStringToSeed('solitaire-2');
      const h3 = hashStringToSeed('challenge-deal');
      expect(h1).not.toBe(h2);
      expect(h1).not.toBe(h3);
      expect(h2).not.toBe(h3);
    });
  });

  describe('createPrng (Mulberry32)', () => {
    test('produces deterministic sequence for numeric seed', () => {
      const prng1 = createPrng(42);
      const prng2 = createPrng(42);

      const seq1 = [prng1(), prng1(), prng1(), prng1()];
      const seq2 = [prng2(), prng2(), prng2(), prng2()];

      expect(seq1).toEqual(seq2);
      expect(seq1.every((val) => val >= 0 && val < 1)).toBe(true);
    });

    test('produces deterministic sequence for string seed', () => {
      const prng1 = createPrng('custom-word-seed');
      const prng2 = createPrng('custom-word-seed');

      const seq1 = [prng1(), prng1(), prng1(), prng1()];
      const seq2 = [prng2(), prng2(), prng2(), prng2()];

      expect(seq1).toEqual(seq2);
    });

    test('different string seeds yield different sequences', () => {
      const prngA = createPrng('seedA');
      const prngB = createPrng('seedB');

      expect(prngA()).not.toBe(prngB());
    });
  });

  describe('generateRandomSeed', () => {
    test('generates valid non-empty alphanumeric strings', () => {
      const s1 = generateRandomSeed();
      const s2 = generateRandomSeed();

      expect(typeof s1).toBe('string');
      expect(s1.length).toBeGreaterThanOrEqual(4);
      expect(s1).not.toBe(s2);
    });
  });

  describe('shuffleCards with string & numeric seeds', () => {
    test('produces full 52 cards without duplicates or loss', () => {
      const deck = createStandardDeck();
      const shuffled = shuffleCards(deck, 'my-seed');

      expect(shuffled.length).toBe(52);
      const uniqueIds = new Set(shuffled.map((c) => c.id));
      expect(uniqueIds.size).toBe(52);
    });

    test('shuffling with identical string seed is 100% deterministic', () => {
      const deck1 = createStandardDeck();
      const deck2 = createStandardDeck();

      const shuffled1 = shuffleCards(deck1, 'daily-challenge-2026');
      const shuffled2 = shuffleCards(deck2, 'daily-challenge-2026');

      expect(shuffled1.map((c) => c.id)).toEqual(shuffled2.map((c) => c.id));
      expect(shuffled1.map((c) => `${c.rank}_${c.suit}`)).toEqual(
        shuffled2.map((c) => `${c.rank}_${c.suit}`)
      );
    });

    test('shuffling with different string seeds yields different card layouts', () => {
      const deck1 = createStandardDeck();
      const deck2 = createStandardDeck();

      const shuffled1 = shuffleCards(deck1, 'seed-alpha');
      const shuffled2 = shuffleCards(deck2, 'seed-beta');

      expect(shuffled1.map((c) => c.id)).not.toEqual(shuffled2.map((c) => c.id));
    });

    test('supports numeric seeds deterministically', () => {
      const deck1 = createStandardDeck();
      const deck2 = createStandardDeck();

      const shuffled1 = shuffleCards(deck1, 99999);
      const shuffled2 = shuffleCards(deck2, 99999);

      expect(shuffled1.map((c) => c.id)).toEqual(shuffled2.map((c) => c.id));
    });

    test('unseeded shuffle uses random distribution', () => {
      const deck1 = createStandardDeck();
      const deck2 = createStandardDeck();

      const shuffled1 = shuffleCards(deck1);
      const shuffled2 = shuffleCards(deck2);

      // Statistically virtually impossible for two 52-card unseeded shuffles to match
      expect(shuffled1.map((c) => c.id)).not.toEqual(shuffled2.map((c) => c.id));
    });
  });

  describe('dealKlondike with seeds', () => {
    test('stores seed on returned GameState', () => {
      const game1 = dealKlondike(1, 'super-lucky-deal');
      expect(game1.seed).toBe('super-lucky-deal');

      const game2 = dealKlondike(3, 12345);
      expect(game2.seed).toBe('12345');

      const randomGame = dealKlondike(1);
      expect(randomGame.seed).toBeDefined();
      expect(typeof randomGame.seed).toBe('string');
      expect(randomGame.seed!.length).toBeGreaterThan(0);
    });

    test('deals exact same tableau and stock cards for identical string seed', () => {
      const game1 = dealKlondike(1, 'shared-friend-seed');
      const game2 = dealKlondike(1, 'shared-friend-seed');

      for (let col = 0; col < 7; col++) {
        expect(game1.tableau[col].map((c) => c.id)).toEqual(
          game2.tableau[col].map((c) => c.id)
        );
        expect(game1.tableau[col].map((c) => c.faceUp)).toEqual(
          game2.tableau[col].map((c) => c.faceUp)
        );
      }

      expect(game1.stock.map((c) => c.id)).toEqual(game2.stock.map((c) => c.id));
      expect(game1.initialDeck!.map((c) => c.id)).toEqual(game2.initialDeck!.map((c) => c.id));
    });

    test('dealKlondikeFromDeck preserves seed if provided', () => {
      const deck = createStandardDeck();
      const game = dealKlondikeFromDeck(deck, 1, 'my-manual-seed');
      expect(game.seed).toBe('my-manual-seed');
    });
  });

  describe('Daily Challenge Helpers', () => {
    test('getDailyChallengeSeed formats date to YYYY-MM-DD', () => {
      const fixedDate = new Date(2026, 9, 9); // October 9, 2026
      expect(getDailyChallengeSeed(fixedDate)).toBe('2026-10-09');

      const dateWithPaddedParts = new Date(2025, 0, 5); // January 5, 2025
      expect(getDailyChallengeSeed(dateWithPaddedParts)).toBe('2025-01-05');

      const todaySeed = getDailyChallengeSeed();
      expect(isDateSeed(todaySeed)).toBe(true);
    });

    test('isDailyChallenge matches date seed', () => {
      const fixedDate = new Date(2026, 9, 9);
      expect(isDailyChallenge('2026-10-09', fixedDate)).toBe(true);
      expect(isDailyChallenge('2026-10-10', fixedDate)).toBe(false);
      expect(isDailyChallenge('random-seed', fixedDate)).toBe(false);
      expect(isDailyChallenge(undefined, fixedDate)).toBe(false);
      expect(isDailyChallenge('')).toBe(false);
    });

    test('isDateSeed checks YYYY-MM-DD pattern', () => {
      expect(isDateSeed('2026-10-09')).toBe(true);
      expect(isDateSeed('1999-12-31')).toBe(true);
      expect(isDateSeed('random-seed')).toBe(false);
      expect(isDateSeed('2026-1-1')).toBe(false);
      expect(isDateSeed('')).toBe(false);
      expect(isDateSeed(undefined)).toBe(false);
    });
  });

  describe('generateKlondikeDealSteps (Initial Game Deal)', () => {
    test('generates exactly 29 deal steps in Draw 1 mode (28 tableau + 1 waste)', () => {
      const game = dealKlondike(1, 'deal-test-seed');
      const steps = generateKlondikeDealSteps(game);

      expect(steps.length).toBe(29);

      // Verify all 7 rounds of tableau dealing
      const roundCounts = [0, 0, 0, 0, 0, 0, 0, 0];
      for (const step of steps) {
        roundCounts[step.round]++;
      }

      expect(roundCounts[0]).toBe(7); // cols 0..6
      expect(roundCounts[1]).toBe(6); // cols 1..6
      expect(roundCounts[2]).toBe(5); // cols 2..6
      expect(roundCounts[3]).toBe(4); // cols 3..6
      expect(roundCounts[4]).toBe(3); // cols 4..6
      expect(roundCounts[5]).toBe(2); // cols 5..6
      expect(roundCounts[6]).toBe(1); // col 6
      expect(roundCounts[7]).toBe(1); // waste

      // Round 0: Col 0 face up, Cols 1..6 face down
      const round0 = steps.filter((s) => s.round === 0);
      expect(round0[0].faceUp).toBe(true);
      expect(round0[0].targetPile).toEqual({ type: 'tableau', index: 0 });
      for (let i = 1; i < 7; i++) {
        expect(round0[i].faceUp).toBe(false);
        expect(round0[i].targetPile).toEqual({ type: 'tableau', index: i });
      }

      // Final step is the initial auto-drawn waste card
      const wasteStep = steps[steps.length - 1];
      expect(wasteStep.targetPile).toEqual({ type: 'waste', index: 0 });
      expect(wasteStep.targetIndexInPile).toBe(0);
      expect(wasteStep.faceUp).toBe(true);
      expect(wasteStep.card.id).toBe(game.waste[0].id);
    });

    test('generates exactly 31 deal steps in Draw 3 mode (28 tableau + 3 waste)', () => {
      const game = dealKlondike(3, 'deal-test-seed-3');
      const steps = generateKlondikeDealSteps(game);

      expect(steps.length).toBe(31);

      // 28 tableau steps
      const tableauSteps = steps.filter((s) => s.targetPile.type === 'tableau');
      expect(tableauSteps.length).toBe(28);

      // 3 waste steps
      const wasteSteps = steps.filter((s) => s.targetPile.type === 'waste');
      expect(wasteSteps.length).toBe(3);
      for (let i = 0; i < 3; i++) {
        expect(wasteSteps[i].targetIndexInPile).toBe(i);
        expect(wasteSteps[i].faceUp).toBe(true);
        expect(wasteSteps[i].card.id).toBe(game.waste[i].id);
      }
    });

    test('all tableau cards from GameState are represented with matching faceUp status', () => {
      const game = dealKlondike(1, 'card-matching-test');
      const steps = generateKlondikeDealSteps(game);

      for (let col = 0; col < 7; col++) {
        for (let row = 0; row <= col; row++) {
          const card = game.tableau[col][row];
          const matchedStep = steps.find(
            (s) =>
              s.targetPile.type === 'tableau' &&
              s.targetPile.index === col &&
              s.targetIndexInPile === row
          );

          expect(matchedStep).toBeDefined();
          expect(matchedStep!.card.id).toBe(card.id);
          expect(matchedStep!.faceUp).toBe(card.faceUp);
        }
      }
    });
  });

  describe('createEmptyGame', () => {
    test('creates an idle state with completely empty board piles', () => {
      const state = createEmptyGame();

      expect(state.status).toBe('idle');
      expect(state.drawCount).toBe(1);
      expect(state.score).toBe(0);
      expect(state.moves).toBe(0);
      expect(state.elapsedSeconds).toBe(0);
      expect(state.stock).toEqual([]);
      expect(state.waste).toEqual([]);
      expect(state.foundations).toHaveLength(4);
      for (const pile of state.foundations) {
        expect(pile).toEqual([]);
      }
      expect(state.tableau).toHaveLength(7);
      for (const col of state.tableau) {
        expect(col).toEqual([]);
      }
      expect(state.history).toEqual([]);
    });

    test('respects specified drawCount', () => {
      const state3 = createEmptyGame(3);
      expect(state3.drawCount).toBe(3);
      expect(state3.status).toBe('idle');
    });
  });
});

