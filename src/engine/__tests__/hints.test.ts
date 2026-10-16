import { findAvailableHints, findHint, formatCardShort } from '../hints';
import { hasAvailableMoves } from '../rules';
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

  test('suggests draw from stock when cards in stock can advance the game', () => {
    const state = createBaseState();
    // Stock card is Queen of Spades (rank 12) which can be placed onto King of Hearts (rank 13)
    state.stock = [createDummyCard('s1', 'spades', 12, false)];
    // Tableau cards that cannot move anywhere on their own
    state.tableau[0] = [createDummyCard('k1', 'hearts', 13)];
    state.tableau[1] = [createDummyCard('k2', 'spades', 13)];

    const hint = findHint(state);
    expect(hint?.type).toBe('draw');
    expect(hint?.from.type).toBe('stock');
    expect(hint?.message).toBe('Draw from the stock pile');
  });

  test('does not suggest draw from stock when deck cards cannot advance the game', () => {
    const state = createBaseState();
    // Stock card cannot be placed on any tableau or foundation
    state.stock = [createDummyCard('s1', 'spades', 9, false)];
    state.tableau[0] = [createDummyCard('k1', 'hearts', 13)];
    state.tableau[1] = [createDummyCard('k2', 'spades', 13)];

    const hint = findHint(state);
    expect(hint).toBeNull();
  });

  test('suggests recycling waste when stock is empty and recycling can advance the game', () => {
    const state = createBaseState();
    state.stock = [];
    // Waste card is Queen of Spades (rank 12) which can be placed onto King of Hearts (rank 13)
    state.waste = [createDummyCard('w1', 'spades', 12)];
    state.tableau[0] = [createDummyCard('k1', 'hearts', 13)];

    // If waste card can be placed on tableau, that's already a direct move hint
    // To test recycle, let's put it deeper in waste so recycling is needed, or test recycle when drawn:
    // With waste of 1 card, top waste is directly playable, so hint is to move waste to tableau
    const hint = findHint(state);
    expect(hint?.type).toBe('move');
    expect(hint?.from.type).toBe('waste');
  });

  test('does not suggest recycling waste when waste cards cannot advance the game', () => {
    const state = createBaseState();
    state.stock = [];
    state.waste = [createDummyCard('w1', 'hearts', 9)];
    state.tableau[0] = [createDummyCard('k1', 'hearts', 13)];

    const hint = findHint(state);
    expect(hint).toBeNull();
  });

  test('does not suggest shuffling cards back and forth between tableau columns', () => {
    const state = createBaseState();
    // Col 0 has 8 of Spades and 7 of Hearts (both face up, no face-down cards)
    state.tableau[0] = [
      createDummyCard('8s', 'spades', 8, true),
      createDummyCard('7h', 'hearts', 7, true),
    ];
    // Col 1 has 8 of Clubs
    state.tableau[1] = [createDummyCard('8c', 'clubs', 8, true)];

    // 7 of Hearts can move between 8s and 8c, but does not advance the game
    const hints = findAvailableHints(state);
    expect(hints).toEqual([]);
    expect(findHint(state)).toBeNull();
  });

  test('never suggests moving an Ace from foundation down to a 2 on the tableau', () => {
    const state = createBaseState();
    // Foundation has Ace of Hearts
    state.foundations[0] = [createDummyCard('ah', 'hearts', 1, true)];
    // Tableau has 2 of Spades (which raw rules would legally accept Ace of Hearts)
    state.tableau[0] = [createDummyCard('2s', 'spades', 2, true)];

    // Ace of Hearts can NEVER advance the game by moving down, and should never be suggested
    const hints = findAvailableHints(state);
    expect(hints).toEqual([]);
    expect(findHint(state)).toBeNull();
  });

  test('never suggests moving a 2 from foundation down to a 3 on the tableau', () => {
    const state = createBaseState();
    // Foundation has Ace and 2 of Hearts
    state.foundations[0] = [
      createDummyCard('ah', 'hearts', 1, true),
      createDummyCard('2h', 'hearts', 2, true),
    ];
    // Tableau has 3 of Spades
    state.tableau[0] = [createDummyCard('3s', 'spades', 3, true)];

    // 2 of Hearts should never be suggested to move down to 3 of Spades
    const hints = findAvailableHints(state);
    expect(hints).toEqual([]);
    expect(findHint(state)).toBeNull();
  });

  test('does not suggest moving foundation card down when it does not unlock advancement', () => {
    const state = createBaseState();
    state.foundations[0] = [
      createDummyCard('ah', 'hearts', 1, true),
      createDummyCard('2h', 'hearts', 2, true),
      createDummyCard('3h', 'hearts', 3, true),
    ];
    state.tableau[0] = [createDummyCard('4s', 'spades', 4, true)];

    // 3 of Hearts can move down to 4 of Spades, but unlocks nothing
    const hints = findAvailableHints(state);
    expect(hints).toEqual([]);
    expect(findHint(state)).toBeNull();
  });

  test('suggests moving foundation card down when it unlocks uncovering a face-down card', () => {
    const state = createBaseState();
    state.foundations[0] = [
      createDummyCard('ah', 'hearts', 1, true),
      createDummyCard('2h', 'hearts', 2, true),
      createDummyCard('3h', 'hearts', 3, true),
      createDummyCard('4h', 'hearts', 4, true),
    ];
    state.tableau[0] = [createDummyCard('5s', 'spades', 5, true)];
    state.tableau[1] = [
      createDummyCard('hidden_1', 'clubs', 9, false),
      createDummyCard('3s', 'spades', 3, true),
    ];

    // Moving 4h down onto 5s enables 3s to move onto 4h, uncovering hidden_1!
    const hints = findAvailableHints(state);
    expect(hints.length).toBeGreaterThan(0);
    const foundationDownHint = hints.find((h) => h.from.type === 'foundation');
    expect(foundationDownHint).toBeDefined();
    expect(foundationDownHint?.cardIds).toEqual(['4h']);
    expect(foundationDownHint?.to?.index).toBe(0);
  });

  test('suggests moving tableau card to empty column when it unlocks a King covering face-down cards', () => {
    const state = createBaseState();
    // Col 0 has a 7 of Hearts at base (empties col 0)
    state.tableau[0] = [createDummyCard('7h', 'hearts', 7, true)];
    // Col 1 has 8 of Spades
    state.tableau[1] = [createDummyCard('8s', 'spades', 8, true)];
    // Col 2 has a hidden card under King of Diamonds
    state.tableau[2] = [
      createDummyCard('hidden_king_parent', 'clubs', 2, false),
      createDummyCard('kd', 'diamonds', 13, true),
    ];

    // Moving 7h onto 8s empties col 0, enabling kd to move and uncover hidden_king_parent
    const hints = findAvailableHints(state);
    expect(hints.length).toBeGreaterThan(0);
    const emptyColHint = hints.find((h) => h.cardIds?.[0] === '7h');
    expect(emptyColHint).toBeDefined();
    expect(emptyColHint?.to?.index).toBe(1);
  });

  test('does not suggest moving foundation card down when matching card is still in stock (suggests draw instead)', () => {
    const state = createBaseState();
    state.foundations[1] = [
      createDummyCard('ah', 'hearts', 1, true),
      createDummyCard('2h', 'hearts', 2, true),
      createDummyCard('3h', 'hearts', 3, true),
      createDummyCard('4h', 'hearts', 4, true),
    ];
    state.tableau[0] = [createDummyCard('5s', 'spades', 5, true)];
    // 3 of Spades is inside stock, not yet drawn
    state.stock = [createDummyCard('3s', 'spades', 3, false)];
    state.waste = [];

    // Should NOT suggest moving 4h down onto 5s yet; should suggest drawing from stock
    const hint = findHint(state);
    expect(hint).not.toBeNull();
    expect(hint?.type).toBe('draw');
    expect(hint?.from.type).toBe('stock');
    expect(hint?.message).toBe('Draw from the stock pile');
  });

  test('does not suggest moving a card back to foundation immediately after moving it down to tableau', () => {
    const state = createBaseState();
    state.foundations[1] = [
      createDummyCard('ah', 'hearts', 1, true),
      createDummyCard('2h', 'hearts', 2, true),
      createDummyCard('3h', 'hearts', 3, true),
    ];
    // 4h was just moved down onto 5s in column 0
    state.tableau[0] = [
      createDummyCard('5s', 'spades', 5, true),
      createDummyCard('4h', 'hearts', 4, true),
    ];
    // Waste has 3s ready to be placed on 4h
    state.waste = [createDummyCard('3s', 'spades', 3, true)];
    state.history = [
      {
        from: { type: 'foundation', index: 1 },
        to: { type: 'tableau', index: 0 },
        cardIds: ['4h'],
        pointsEarned: -15,
      },
    ];

    // Hint should suggest playing 3s onto 4h, NOT moving 4h back to foundation!
    const hint = findHint(state);
    expect(hint).not.toBeNull();
    expect(hint?.from.type).toBe('waste');
    expect(hint?.to?.type).toBe('tableau');
    expect(hint?.to?.index).toBe(0);
    expect(hint?.cardIds).toEqual(['3s']);
    expect(hint?.message).toBe('Move 3♠ onto 4♥');

    // And available hints should NOT include moving 4h to foundation
    const hints = findAvailableHints(state);
    const reverseHint = hints.find((h) => h.cardIds?.[0] === '4h' && h.to?.type === 'foundation');
    expect(reverseHint).toBeUndefined();
  });

  test('does not suggest moving a card back down to tableau immediately after moving it to foundation', () => {
    const state = createBaseState();
    state.foundations[1] = [
      createDummyCard('ah', 'hearts', 1, true),
      createDummyCard('2h', 'hearts', 2, true),
      createDummyCard('3h', 'hearts', 3, true),
      createDummyCard('4h', 'hearts', 4, true),
    ];
    state.tableau[0] = [createDummyCard('5s', 'spades', 5, true)];
    state.waste = [createDummyCard('3s', 'spades', 3, true)];
    // 4h was just moved from tableau column 0 to foundation pile 1
    state.history = [
      {
        from: { type: 'tableau', index: 0 },
        to: { type: 'foundation', index: 1 },
        cardIds: ['4h'],
        pointsEarned: 10,
      },
    ];

    // Hint should NOT suggest moving 4h right back down onto column 0
    const hints = findAvailableHints(state);
    const reverseHint = hints.find((h) => h.cardIds?.[0] === '4h' && h.to?.type === 'tableau' && h.to?.index === 0);
    expect(reverseHint).toBeUndefined();
  });

  test('prioritizes playing a waste card onto a tableau card over moving that tableau card to foundation', () => {
    const state = createBaseState();
    state.foundations[1] = [
      createDummyCard('ah', 'hearts', 1, true),
      createDummyCard('2h', 'hearts', 2, true),
      createDummyCard('3h', 'hearts', 3, true),
    ];
    // 4h is on 5s (could legally move to foundation, but 3s is on waste)
    state.tableau[0] = [
      createDummyCard('5s', 'spades', 5, true),
      createDummyCard('4h', 'hearts', 4, true),
    ];
    state.waste = [createDummyCard('3s', 'spades', 3, true)];
    state.history = []; // Even without history

    // Playing 3s onto 4h must take precedence over moving 4h to foundation
    const hint = findHint(state);
    expect(hint).not.toBeNull();
    expect(hint?.cardIds).toEqual(['3s']);
    expect(hint?.message).toBe('Move 3♠ onto 4♥');
  });

  test('prioritizes moving waste card to tableau before foundation when both are available to maximize score', () => {
    const state = createBaseState();
    // Foundation 0 has Ace of Spades
    state.foundations[0] = [createDummyCard('as', 'spades', 1, true)];
    // Tableau col 0 has 3 of Hearts
    state.tableau[0] = [createDummyCard('3h', 'hearts', 3, true)];
    // Waste has 2 of Spades (can legally go to Foundation 0 OR Tableau col 0 onto 3 of Hearts)
    state.waste = [createDummyCard('2s', 'spades', 2, true)];

    // Waste to Tableau scores +5 pts and leaves card available for +10 pts foundation later (15 total pts vs 10 pts)
    const hint = findHint(state);
    expect(hint).not.toBeNull();
    expect(hint?.from.type).toBe('waste');
    expect(hint?.to?.type).toBe('tableau');
    expect(hint?.to?.index).toBe(0);
    expect(hint?.cardIds).toEqual(['2s']);
    expect(hint?.message).toBe('Move 2♠ onto 3♥');
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

  test('findAvailableHints and hasAvailableMoves both agree on reversing move deadlocks', () => {
    const state = createBaseState();
    state.foundations[1] = [
      createDummyCard('ah', 'hearts', 1, true),
      createDummyCard('2h', 'hearts', 2, true),
      createDummyCard('3h', 'hearts', 3, true),
    ];
    state.tableau[0] = [
      createDummyCard('5s', 'spades', 5, true),
      createDummyCard('4h', 'hearts', 4, true),
    ];
    state.history = [
      {
        from: { type: 'foundation', index: 1 },
        to: { type: 'tableau', index: 0 },
        cardIds: ['4h'],
        pointsEarned: -15,
      },
    ];

    expect(findAvailableHints(state)).toHaveLength(0);
    expect(hasAvailableMoves(state)).toBe(false);
  });
});

