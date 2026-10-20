import { Card, GameState } from '../types';
import {
  applySafeFoundationMoves,
  checkWinnable,
  getCanonicalStateKey,
  isSafeFoundationMove,
} from '../solver';
import { dealKlondikeFromDeck } from '../deck';

function makeCard(
  id: string,
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs',
  rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13,
  faceUp = true
): Card {
  return { id, suit, rank, faceUp };
}

function makeWonFoundations(): Card[][] {
  const suits: ('spades' | 'hearts' | 'diamonds' | 'clubs')[] = [
    'spades',
    'hearts',
    'diamonds',
    'clubs',
  ];
  return suits.map((suit) =>
    Array.from({ length: 13 }, (_, i) => makeCard(`${suit}_${i + 1}`, suit, (i + 1) as any, true))
  );
}

function makeBaseState(): GameState {
  return {
    version: 1,
    id: 'test_game',
    drawCount: 1,
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    score: 0,
    moves: 0,
    elapsedSeconds: 0,
    status: 'playing',
    history: [],
    createdAt: Date.now(),
  };
}

describe('solver', () => {
  describe('isSafeFoundationMove', () => {
    it('returns true for Aces and Twos regardless of foundations', () => {
      const emptyFoundations: Card[][] = [[], [], [], []];
      expect(isSafeFoundationMove(makeCard('c1', 'spades', 1), emptyFoundations)).toBe(true);
      expect(isSafeFoundationMove(makeCard('c2', 'hearts', 2), emptyFoundations)).toBe(true);
    });

    it('returns false for rank 3 if opposite-color foundations are not at rank 2+', () => {
      // 3 of Spades (black). Opposite suits are hearts and diamonds (red).
      const foundations: Card[][] = [
        [makeCard('s1', 'spades', 1), makeCard('s2', 'spades', 2)], // spades
        [makeCard('h1', 'hearts', 1)], // hearts at 1
        [makeCard('d1', 'diamonds', 1), makeCard('d2', 'diamonds', 2)], // diamonds at 2
        [], // clubs
      ];
      // Hearts is only at 1, so 3 of Spades is not safe yet
      expect(isSafeFoundationMove(makeCard('s3', 'spades', 3), foundations)).toBe(false);
    });

    it('returns true for rank 3 when both opposite-color foundations are at rank 2+', () => {
      const foundations: Card[][] = [
        [], // spades
        [makeCard('h1', 'hearts', 1), makeCard('h2', 'hearts', 2)], // hearts at 2
        [makeCard('d1', 'diamonds', 1), makeCard('d2', 'diamonds', 2)], // diamonds at 2
        [], // clubs
      ];
      expect(isSafeFoundationMove(makeCard('s3', 'spades', 3), foundations)).toBe(true);
    });
  });

  describe('applySafeFoundationMoves', () => {
    it('automatically moves Aces and Twos from tableau to foundations', () => {
      const state = makeBaseState();
      state.tableau[0] = [makeCard('s1', 'spades', 1, true)];
      state.tableau[1] = [makeCard('s2', 'spades', 2, true)];

      const { state: reduced, moves } = applySafeFoundationMoves(state);
      expect(reduced.foundations[0]).toHaveLength(2);
      expect(reduced.tableau[0]).toHaveLength(0);
      expect(reduced.tableau[1]).toHaveLength(0);
      expect(moves).toHaveLength(2);
    });

    it('uncovers face-down cards underneath promoted safe cards', () => {
      const state = makeBaseState();
      // Column 0 has a face-down card and an Ace on top
      state.tableau[0] = [
        makeCard('hidden', 'hearts', 5, false),
        makeCard('s1', 'spades', 1, true),
      ];

      const { state: reduced } = applySafeFoundationMoves(state);
      expect(reduced.foundations[0]).toHaveLength(1);
      expect(reduced.tableau[0]).toHaveLength(1);
      expect(reduced.tableau[0][0].faceUp).toBe(true);
      expect(reduced.tableau[0][0].id).toBe('hidden');
    });
  });

  describe('getCanonicalStateKey', () => {
    it('produces identical keys when empty columns are in different positions', () => {
      const state1 = makeBaseState();
      state1.tableau[0] = [makeCard('k1', 'spades', 13, true)];
      // columns 1-6 are empty

      const state2 = makeBaseState();
      state2.tableau[6] = [makeCard('k1', 'spades', 13, true)];
      // columns 0-5 are empty

      expect(getCanonicalStateKey(state1)).toBe(getCanonicalStateKey(state2));
    });

    it('distinguishes different face-up card configurations', () => {
      const state1 = makeBaseState();
      state1.tableau[0] = [makeCard('k1', 'spades', 13, true)];

      const state2 = makeBaseState();
      state2.tableau[0] = [makeCard('k2', 'hearts', 13, true)];

      expect(getCanonicalStateKey(state1)).not.toBe(getCanonicalStateKey(state2));
    });
  });

  describe('checkWinnable', () => {
    it('returns winnable immediately for an already-won state', async () => {
      const state = makeBaseState();
      state.foundations = makeWonFoundations();

      const result = await checkWinnable(state);
      expect(result.status).toBe('winnable');
      expect(result.statesEvaluated).toBe(0);
    });

    it('returns winnable for an auto-completable state (cards all face up and ready)', async () => {
      const state = makeBaseState();
      // 4 Kings on tableau
      state.tableau[0] = [makeCard('s13', 'spades', 13, true)];
      state.tableau[1] = [makeCard('h13', 'hearts', 13, true)];
      state.tableau[2] = [makeCard('d13', 'diamonds', 13, true)];
      state.tableau[3] = [makeCard('c13', 'clubs', 13, true)];

      // All remaining cards already on foundations (rank 1 to 12)
      const suits: ('spades' | 'hearts' | 'diamonds' | 'clubs')[] = [
        'spades',
        'hearts',
        'diamonds',
        'clubs',
      ];
      state.foundations = suits.map((suit) =>
        Array.from({ length: 12 }, (_, i) => makeCard(`${suit}_${i + 1}`, suit, (i + 1) as any, true))
      );

      const result = await checkWinnable(state);
      expect(result.status).toBe('winnable');
      expect(result.solutionMoves).toBeDefined();
    });

    it('returns unwinnable for a deadlocked state with zero advancing moves', async () => {
      const state = makeBaseState();
      // A state with only 2 cards: King of Spades on col 0, King of Clubs on col 1
      // No stock, no waste, no moves possible
      state.tableau[0] = [makeCard('k1', 'spades', 13, true)];
      state.tableau[1] = [makeCard('k2', 'clubs', 13, true)];

      const result = await checkWinnable(state);
      expect(result.status).toBe('unwinnable');
    });

    it('finds a multi-step win path where moving a King to an empty column uncovers a needed card', async () => {
      const state = makeBaseState();
      // Column 0: Jack of Spades (11, faceDown), King of Spades (13, faceUp)
      state.tableau[0] = [
        makeCard('s11', 'spades', 11, false),
        makeCard('s13', 'spades', 13, true),
      ];
      // Column 1: empty
      state.tableau[1] = [];
      // Column 2: Queen of Spades (12, faceUp)
      state.tableau[2] = [makeCard('s12', 'spades', 12, true)];

      // Spades foundation has 1..10; Hearts, Diamonds, Clubs have 1..13
      const suits: ('spades' | 'hearts' | 'diamonds' | 'clubs')[] = [
        'spades',
        'hearts',
        'diamonds',
        'clubs',
      ];
      state.foundations = suits.map((suit) => {
        const count = suit === 'spades' ? 10 : 13;
        return Array.from({ length: count }, (_, i) =>
          makeCard(`${suit}_${i + 1}`, suit, (i + 1) as any, true)
        );
      });

      const result = await checkWinnable(state);
      expect(result.status).toBe('winnable');
    });

    it('returns unwinnable when an essential card is trapped and no moves unlock it', async () => {
      const state = makeBaseState();
      // Column 0 has 2 of Hearts face-down, with King of Hearts face-up on top.
      // No empty columns, no queens, no stock, no waste.
      // King cannot move anywhere, so the 2 of Hearts can never be uncovered.
      state.tableau[0] = [
        makeCard('h2', 'hearts', 2, false),
        makeCard('kh', 'hearts', 13, true),
      ];
      state.tableau[1] = [makeCard('kd', 'diamonds', 13, true)];
      state.tableau[2] = [makeCard('ks', 'spades', 13, true)];
      state.tableau[3] = [makeCard('kc', 'clubs', 13, true)];

      const result = await checkWinnable(state);
      expect(result.status).toBe('unwinnable');
    });

    it('returns timeout when search state limit is exceeded', async () => {
      const state = makeBaseState();
      // Setup a game with several branching moves
      state.tableau[0] = [makeCard('s1', 'spades', 1, false), makeCard('h7', 'hearts', 7, true)];
      state.tableau[1] = [makeCard('s8', 'spades', 8, true)];
      state.stock = [
        makeCard('c1', 'clubs', 5, false),
        makeCard('c2', 'clubs', 6, false),
        makeCard('c3', 'clubs', 7, false),
      ];

      // Limit maxStates to 1
      const result = await checkWinnable(state, { maxStates: 1, timeoutMs: 50 });
      expect(result.status).toBe('timeout');
    });

    it('evaluates a full dealt game seed without throwing errors', async () => {
      const game = dealKlondikeFromDeck(
        // Use a known deal seed
        require('../deck').shuffleCards(require('../deck').createStandardDeck(), '10688'),
        1,
        '10688'
      );
      const result = await checkWinnable(game, { maxStates: 30000, timeoutMs: 3000 });
      expect(result.status).toBe('winnable');
      expect(result.statesEvaluated).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('solves another verified winnable seed rapidly', async () => {
      const game = dealKlondikeFromDeck(
        require('../deck').shuffleCards(require('../deck').createStandardDeck(), '10690'),
        1,
        '10690'
      );
      const result = await checkWinnable(game, { maxStates: 100000, timeoutMs: 8000 });
      expect(result.status).toBe('winnable');
    });
  });
});
