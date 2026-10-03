import { findAvailableHints, findHint, formatCardShort } from '../hints';
import { Card, GameState } from '../types';

function createDummyCard(id: string, suit: 'spades' | 'hearts' | 'diamonds' | 'clubs', rank: number, faceUp = true): Card {
  return { id, suit, rank: rank as any, faceUp };
}

function createBaseState(): GameState {
  return {
    version: 1,
    id: 'test_hints',
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

describe('Hints Engine', () => {
  test('formatCardShort formats cards with symbols and ranks correctly', () => {
    expect(formatCardShort(createDummyCard('c1', 'spades', 1))).toBe('A♠');
    expect(formatCardShort(createDummyCard('c2', 'hearts', 10))).toBe('10♥');
    expect(formatCardShort(createDummyCard('c3', 'diamonds', 11))).toBe('J♦');
    expect(formatCardShort(createDummyCard('c4', 'clubs', 12))).toBe('Q♣');
    expect(formatCardShort(createDummyCard('c5', 'spades', 13))).toBe('K♠');
  });

  test('prioritizes Ace to Foundation as top priority', () => {
    const state = createBaseState();
    // Col 0 has an Ace of Spades
    state.tableau[0] = [createDummyCard('as', 'spades', 1)];
    // Col 1 has 7 of Hearts, Col 2 has 8 of Spades (valid tableau move)
    state.tableau[1] = [createDummyCard('7h', 'hearts', 7)];
    state.tableau[2] = [createDummyCard('8s', 'spades', 8)];

    const hint = findHint(state);
    expect(hint).not.toBeNull();
    expect(hint?.type).toBe('move');
    expect(hint?.to?.type).toBe('foundation');
    expect(hint?.cardIds).toEqual(['as']);
    expect(hint?.message).toBe('Move A♠ to Foundation');
  });

  test('prioritizes tableau move that uncovers face-down card over general tableau moves', () => {
    const state = createBaseState();
    // Col 0 has face-down card and 7 of Hearts on top
    state.tableau[0] = [
      createDummyCard('down1', 'clubs', 10, false),
      createDummyCard('7h', 'hearts', 7, true),
    ];
    // Col 1 has 8 of Spades
    state.tableau[1] = [createDummyCard('8s', 'spades', 8, true)];

    // Col 2 has fully face-up 3 of Clubs
    state.tableau[2] = [createDummyCard('3c', 'clubs', 3, true)];
    // Col 3 has 4 of Diamonds
    state.tableau[3] = [createDummyCard('4d', 'diamonds', 4, true)];

    const hints = findAvailableHints(state);
    expect(hints.length).toBeGreaterThanOrEqual(2);
    // 7h to 8s (uncovering face-down) should be ranked before 3c to 4d
    expect(hints[0].cardIds).toEqual(['7h']);
    expect(hints[0].to?.index).toBe(1);
    expect(hints[0].message).toBe('Move 7♥ onto 8♠');
  });

  test('suggests waste card to foundation and tableau', () => {
    const state = createBaseState();
    state.waste = [createDummyCard('w_as', 'spades', 1)];
    const hint = findHint(state);
    expect(hint?.type).toBe('move');
    expect(hint?.from.type).toBe('waste');
    expect(hint?.to?.type).toBe('foundation');
    expect(hint?.message).toBe('Move A♠ to Foundation');
  });

  test('suggests draw from stock when no board moves are available', () => {
    const state = createBaseState();
    state.stock = [createDummyCard('s1', 'spades', 9, false)];
    // Tableau cards that cannot move anywhere
    state.tableau[0] = [createDummyCard('k1', 'hearts', 13)];
    state.tableau[1] = [createDummyCard('k2', 'spades', 13)];

    const hint = findHint(state);
    expect(hint?.type).toBe('draw');
    expect(hint?.from.type).toBe('stock');
    expect(hint?.message).toBe('Draw from the stock pile');
  });

  test('suggests recycling waste when stock is empty and recycling is available', () => {
    const state = createBaseState();
    state.stock = [];
    state.waste = [createDummyCard('w1', 'hearts', 9)];
    state.tableau[0] = [createDummyCard('k1', 'hearts', 13)];

    const hint = findHint(state);
    expect(hint?.type).toBe('recycle');
    expect(hint?.from.type).toBe('waste');
    expect(hint?.to?.type).toBe('stock');
    expect(hint?.message).toBe('Reset waste back to stock');
  });

  test('returns null when game is won or no moves remain', () => {
    const state = createBaseState();
    state.status = 'won';
    expect(findHint(state)).toBeNull();

    const deadState = createBaseState();
    deadState.status = 'lost';
    expect(findHint(deadState)).toBeNull();

    const emptyDead = createBaseState();
    // No cards anywhere
    expect(findHint(emptyDead)).toBeNull();
  });
});
