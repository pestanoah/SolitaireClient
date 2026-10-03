import { createStandardDeck, dealKlondike, shuffleCards } from '../deck';
import {
  canPlaceOnFoundation,
  canPlaceOnTableau,
  isGameWon,
  canAutoComplete,
  hasAvailableMoves,
  hasExhaustedStockCycles,
} from '../rules';
import { drawCards, moveCards, undo, findSmartMove, autoCompleteStep } from '../klondike';
import { Card, GameState, getCardColor } from '../types';

describe('Deck and Card Utilities', () => {
  test('createStandardDeck creates 52 unique cards with 13 in each suit', () => {
    const deck = createStandardDeck();
    expect(deck.length).toBe(52);

    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(52);

    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    for (const suit of suits) {
      const count = deck.filter((c) => c.suit === suit).length;
      expect(count).toBe(13);
    }
  });

  test('getCardColor correctly identifies red vs black suits', () => {
    expect(getCardColor('hearts')).toBe('red');
    expect(getCardColor('diamonds')).toBe('red');
    expect(getCardColor('spades')).toBe('black');
    expect(getCardColor('clubs')).toBe('black');
  });

  test('dealKlondike deals correct columns and stock', () => {
    const game = dealKlondike(1, 12345);
    expect(game.tableau.length).toBe(7);

    for (let i = 0; i < 7; i++) {
      expect(game.tableau[i].length).toBe(i + 1);
      // Top card is face up
      expect(game.tableau[i][i].faceUp).toBe(true);
      // Other cards are face down
      for (let j = 0; j < i; j++) {
        expect(game.tableau[i][j].faceUp).toBe(false);
      }
    }

    expect(game.stock.length).toBe(24);
    expect(game.stock.every((c) => !c.faceUp)).toBe(true);
    expect(game.waste.length).toBe(0);
    expect(game.foundations.length).toBe(4);
    expect(game.foundations.every((f) => f.length === 0)).toBe(true);
    expect(game.score).toBe(0);
    expect(game.moves).toBe(0);
  });
});

describe('Rules Validation', () => {
  test('canPlaceOnTableau validates alternating colors and descending rank', () => {
    const black7: Card = { id: 'c_1', suit: 'spades', rank: 7, faceUp: true };
    const red6: Card = { id: 'c_2', suit: 'hearts', rank: 6, faceUp: true };
    const black6: Card = { id: 'c_3', suit: 'clubs', rank: 6, faceUp: true };
    const red8: Card = { id: 'c_4', suit: 'diamonds', rank: 8, faceUp: true };

    expect(canPlaceOnTableau(red6, [black7])).toBe(true);
    expect(canPlaceOnTableau(black6, [black7])).toBe(false);
    expect(canPlaceOnTableau(red8, [black7])).toBe(false);

    // Empty column allows only King
    const king: Card = { id: 'c_k', suit: 'spades', rank: 13, faceUp: true };
    const queen: Card = { id: 'c_q', suit: 'hearts', rank: 12, faceUp: true };
    expect(canPlaceOnTableau(king, [])).toBe(true);
    expect(canPlaceOnTableau(queen, [])).toBe(false);
  });

  test('canPlaceOnFoundation validates matching suit and ascending rank starting at Ace', () => {
    const aceHearts: Card = { id: 'c_ah', suit: 'hearts', rank: 1, faceUp: true };
    const twoHearts: Card = { id: 'c_2h', suit: 'hearts', rank: 2, faceUp: true };
    const twoSpades: Card = { id: 'c_2s', suit: 'spades', rank: 2, faceUp: true };
    const threeHearts: Card = { id: 'c_3h', suit: 'hearts', rank: 3, faceUp: true };

    // Empty foundation accepts Ace
    expect(canPlaceOnFoundation(aceHearts, [])).toBe(true);
    expect(canPlaceOnFoundation(twoHearts, [])).toBe(false);

    // 2 of Hearts on Ace of Hearts
    expect(canPlaceOnFoundation(twoHearts, [aceHearts])).toBe(true);
    // Wrong suit
    expect(canPlaceOnFoundation(twoSpades, [aceHearts])).toBe(false);
    // Wrong rank
    expect(canPlaceOnFoundation(threeHearts, [aceHearts])).toBe(false);
  });

  test('canPlaceOnFoundation validates designated foundation pile suits (0:spades, 1:hearts, 2:diamonds, 3:clubs)', () => {
    const aceSpades: Card = { id: 'as', suit: 'spades', rank: 1, faceUp: true };
    const aceHearts: Card = { id: 'ah', suit: 'hearts', rank: 1, faceUp: true };
    const aceDiamonds: Card = { id: 'ad', suit: 'diamonds', rank: 1, faceUp: true };
    const aceClubs: Card = { id: 'ac', suit: 'clubs', rank: 1, faceUp: true };

    // Foundation 0 is Spades
    expect(canPlaceOnFoundation(aceSpades, [], 0)).toBe(true);
    expect(canPlaceOnFoundation(aceHearts, [], 0)).toBe(false);

    // Foundation 1 is Hearts
    expect(canPlaceOnFoundation(aceHearts, [], 1)).toBe(true);
    expect(canPlaceOnFoundation(aceSpades, [], 1)).toBe(false);

    // Foundation 2 is Diamonds
    expect(canPlaceOnFoundation(aceDiamonds, [], 2)).toBe(true);
    expect(canPlaceOnFoundation(aceClubs, [], 2)).toBe(false);

    // Foundation 3 is Clubs
    expect(canPlaceOnFoundation(aceClubs, [], 3)).toBe(true);
    expect(canPlaceOnFoundation(aceDiamonds, [], 3)).toBe(false);
  });

  test('isGameWon checks for 52 cards across foundations', () => {
    const fullPile = Array.from({ length: 13 }, (_, i) => ({
      id: `f_${i}`,
      suit: 'spades' as const,
      rank: (i + 1) as any,
      faceUp: true,
    }));

    const incomplete = [fullPile, fullPile, fullPile, []];
    expect(isGameWon(incomplete)).toBe(false);

    const complete = [fullPile, fullPile, fullPile, fullPile];
    expect(isGameWon(complete)).toBe(true);
  });
});

describe('State Transitions & Gameplay', () => {
  test('drawCards draws 1 card in Turn 1 and recycles with penalty', () => {
    let state = dealKlondike(1, 42);
    expect(state.stock.length).toBe(24);
    expect(state.waste.length).toBe(0);

    state = drawCards(state);
    expect(state.stock.length).toBe(23);
    expect(state.waste.length).toBe(1);
    expect(state.waste[0].faceUp).toBe(true);
    expect(state.moves).toBe(1);

    // Draw all remaining 23 cards
    for (let i = 0; i < 23; i++) {
      state = drawCards(state);
    }
    expect(state.stock.length).toBe(0);
    expect(state.waste.length).toBe(24);

    // Recycle waste to stock
    state.score = 50;
    state = drawCards(state);
    expect(state.stock.length).toBe(24);
    expect(state.waste.length).toBe(0);
    expect(state.score).toBe(30); // 50 - 20 penalty
  });

  test('drawCards draws 3 cards in Turn 3 mode', () => {
    let state = dealKlondike(3, 42);
    state = drawCards(state);
    expect(state.stock.length).toBe(21);
    expect(state.waste.length).toBe(3);
  });

  test('moveCards transfers card from tableau to foundation and flips exposed card', () => {
    let state = dealKlondike(1);
    // Set up deterministic tableau state
    state.tableau[0] = [
      { id: 'down_card', suit: 'clubs', rank: 10, faceUp: false },
      { id: 'ace_card', suit: 'spades', rank: 1, faceUp: true },
    ];
    state.foundations[0] = [];

    const nextState = moveCards(
      state,
      { type: 'tableau', index: 0 },
      { type: 'foundation', index: 0 },
      ['ace_card']
    );

    expect(nextState).not.toBeNull();
    expect(nextState!.foundations[0].length).toBe(1);
    expect(nextState!.foundations[0][0].id).toBe('ace_card');
    expect(nextState!.tableau[0].length).toBe(1);
    // Exposed card was flipped face-up
    expect(nextState!.tableau[0][0].id).toBe('down_card');
    expect(nextState!.tableau[0][0].faceUp).toBe(true);
    // Score earned: 10 (foundation) + 5 (flip) = 15
    expect(nextState!.score).toBe(15);
  });

  test('undo restores previous state accurately', () => {
    let state = dealKlondike(1);
    state.tableau[0] = [
      { id: 'down_card', suit: 'clubs', rank: 10, faceUp: false },
      { id: 'ace_card', suit: 'spades', rank: 1, faceUp: true },
    ];

    const afterMove = moveCards(
      state,
      { type: 'tableau', index: 0 },
      { type: 'foundation', index: 0 },
      ['ace_card']
    )!;

    expect(afterMove.score).toBe(15);
    expect(afterMove.tableau[0][0].faceUp).toBe(true);

    const afterUndo = undo(afterMove);
    expect(afterUndo.foundations[0].length).toBe(0);
    expect(afterUndo.tableau[0].length).toBe(2);
    expect(afterUndo.tableau[0][0].faceUp).toBe(false); // Reflipped face down
    expect(afterUndo.tableau[0][1].id).toBe('ace_card');
    expect(afterUndo.score).toBe(0);
    // Undoing counts as a move, increasing the total moves count
    expect(afterUndo.moves).toBe(afterMove.moves + 1);
  });

  test('undoing a stock draw increments moves', () => {
    let state = dealKlondike(1, 42);
    expect(state.moves).toBe(0);
    const afterDraw = drawCards(state);
    expect(afterDraw.moves).toBe(1);
    const afterUndo = undo(afterDraw);
    expect(afterUndo.moves).toBe(2);
    expect(afterUndo.stock.length).toBe(state.stock.length);
    expect(afterUndo.waste.length).toBe(0);
  });

  test('findSmartMove finds foundation and tableau placements', () => {
    let state = dealKlondike(1);
    state.waste = [{ id: 'ace_spades', suit: 'spades', rank: 1, faceUp: true }];

    const smartMove = findSmartMove(state, 'ace_spades');
    expect(smartMove).not.toBeNull();
    expect(smartMove!.to.type).toBe('foundation');

    // Tableau smart move
    state.tableau = [[], [], [], [], [], [], []];
    state.waste = [{ id: 'red_5', suit: 'hearts', rank: 5, faceUp: true }];
    state.tableau[3] = [{ id: 'black_6', suit: 'spades', rank: 6, faceUp: true }];

    const smartMove2 = findSmartMove(state, 'red_5');
    expect(smartMove2).not.toBeNull();
    expect(smartMove2!.to.type).toBe('tableau');
    expect(smartMove2!.to.index).toBe(3);
  });

  test('findSmartMove targets the designated foundation pile matching card suit (0:♠, 1:♥, 2:♦, 3:♣)', () => {
    const state = dealKlondike(1);
    state.foundations = [[], [], [], []];

    // Ace of Spades -> Foundation 0
    state.waste = [{ id: 'as', suit: 'spades', rank: 1, faceUp: true }];
    expect(findSmartMove(state, 'as')?.to).toEqual({ type: 'foundation', index: 0 });

    // Ace of Hearts -> Foundation 1
    state.waste = [{ id: 'ah', suit: 'hearts', rank: 1, faceUp: true }];
    expect(findSmartMove(state, 'ah')?.to).toEqual({ type: 'foundation', index: 1 });

    // Ace of Diamonds -> Foundation 2
    state.waste = [{ id: 'ad', suit: 'diamonds', rank: 1, faceUp: true }];
    expect(findSmartMove(state, 'ad')?.to).toEqual({ type: 'foundation', index: 2 });

    // Ace of Clubs -> Foundation 3
    state.waste = [{ id: 'ac', suit: 'clubs', rank: 1, faceUp: true }];
    expect(findSmartMove(state, 'ac')?.to).toEqual({ type: 'foundation', index: 3 });
  });

  test('moveCards rejects placing an Ace on a foundation pile with the wrong suit watermark', () => {
    const state = dealKlondike(1);
    state.foundations = [[], [], [], []];
    state.waste = [{ id: 'ah', suit: 'hearts', rank: 1, faceUp: true }];

    // Trying to move Ace of Hearts into Foundation 0 (Spades) must be rejected
    const invalidMove = moveCards(state, { type: 'waste', index: 0 }, { type: 'foundation', index: 0 }, ['ah']);
    expect(invalidMove).toBeNull();

    // Moving Ace of Hearts into Foundation 1 (Hearts) must succeed
    const validMove = moveCards(state, { type: 'waste', index: 0 }, { type: 'foundation', index: 1 }, ['ah']);
    expect(validMove).not.toBeNull();
    expect(validMove!.foundations[1].length).toBe(1);
  });

  test('canAutoComplete and autoCompleteStep advance cards to foundation', () => {
    let state = dealKlondike(1);
    state.stock = [];
    state.waste = [];
    // All cards in tableau face-up
    state.tableau = [
      [{ id: 'c_ace', suit: 'diamonds', rank: 1, faceUp: true }],
      [],
      [],
      [],
      [],
      [],
      [],
    ];

    expect(canAutoComplete(state)).toBe(true);

    const nextState = autoCompleteStep(state);
    expect(nextState).not.toBeNull();
    // One of the foundations received the diamond Ace
    const totalFoundations = nextState!.foundations.reduce((acc, f) => acc + f.length, 0);
    expect(totalFoundations).toBe(1);
    expect(nextState!.tableau[0].length).toBe(0);
  });

  test('moveCards transfers card from foundation back down to tableau with penalty and undo restores it', () => {
    let state = dealKlondike(1);
    const red5: Card = { id: 'red_5', suit: 'hearts', rank: 5, faceUp: true };
    const black6: Card = { id: 'black_6', suit: 'spades', rank: 6, faceUp: true };

    state.foundations[0] = [
      { id: 'h_1', suit: 'hearts', rank: 1, faceUp: true },
      { id: 'h_2', suit: 'hearts', rank: 2, faceUp: true },
      { id: 'h_3', suit: 'hearts', rank: 3, faceUp: true },
      { id: 'h_4', suit: 'hearts', rank: 4, faceUp: true },
      red5,
    ];
    state.tableau[2] = [black6];
    state.score = 50;

    const nextState = moveCards(
      state,
      { type: 'foundation', index: 0 },
      { type: 'tableau', index: 2 },
      ['red_5']
    );

    expect(nextState).not.toBeNull();
    expect(nextState!.foundations[0].length).toBe(4);
    expect(nextState!.foundations[0][3].id).toBe('h_4');
    expect(nextState!.tableau[2].length).toBe(2);
    expect(nextState!.tableau[2][1].id).toBe('red_5');
    // Score penalty is -15 points
    expect(nextState!.score).toBe(35);

    // Undo restores the card back to foundation and restores score
    const restored = undo(nextState!);
    expect(restored.foundations[0].length).toBe(5);
    expect(restored.foundations[0][4].id).toBe('red_5');
    expect(restored.tableau[2].length).toBe(1);
    expect(restored.tableau[2][0].id).toBe('black_6');
    expect(restored.score).toBe(50);
    expect(restored.moves).toBe(nextState!.moves + 1);
  });

  test('findSmartMove finds legal tableau placement for card in foundation', () => {
    let state = dealKlondike(1);
    const red5: Card = { id: 'red_5', suit: 'hearts', rank: 5, faceUp: true };
    const black6: Card = { id: 'black_6', suit: 'spades', rank: 6, faceUp: true };

    state.foundations[1] = [red5];
    state.tableau = [[], [], [], [], [], [], []];
    state.tableau[4] = [black6];

    const smart = findSmartMove(state, 'red_5');
    expect(smart).not.toBeNull();
    expect(smart!.from).toEqual({ type: 'foundation', index: 1 });
    expect(smart!.to).toEqual({ type: 'tableau', index: 4 });
    expect(smart!.cardIds).toEqual(['red_5']);

    // If no valid tableau destination exists, returns null
    state.tableau[4] = [{ id: 'red_6', suit: 'diamonds', rank: 6, faceUp: true }];
    const noMove = findSmartMove(state, 'red_5');
    expect(noMove).toBeNull();
  });
});

describe('Available Moves & Loss Detection', () => {
  test('freshly dealt game has available moves', () => {
    const state = dealKlondike(1, 123);
    expect(hasAvailableMoves(state)).toBe(true);
  });

  test('returns false when no moves exist and stock/waste is empty (loss/deadlock)', () => {
    const deadState: GameState = {
      version: 1,
      id: 'test_dead',
      drawCount: 1,
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [
        [{ id: 'c1', suit: 'spades', rank: 2, faceUp: true }],
        [{ id: 'c2', suit: 'clubs', rank: 4, faceUp: true }],
        [{ id: 'c3', suit: 'spades', rank: 6, faceUp: true }],
        [{ id: 'c4', suit: 'clubs', rank: 8, faceUp: true }],
        [{ id: 'c5', suit: 'spades', rank: 10, faceUp: true }],
        [{ id: 'c6', suit: 'clubs', rank: 12, faceUp: true }],
        [],
      ],
      score: 0,
      moves: 5,
      elapsedSeconds: 30,
      status: 'playing',
      history: [],
      createdAt: Date.now(),
    };

    expect(hasAvailableMoves(deadState)).toBe(false);
  });

  test('detects deadlock when cards remaining in stock/waste cannot be placed anywhere', () => {
    // Foundations are empty (needs Aces)
    // Tableau columns have black 2, 4, 6, 8, 10, 12
    // Stock has only black cards that cannot be placed on foundations (rank > 1) or tableau (needs red opposite color)
    const deadStateWithStock: GameState = {
      version: 1,
      id: 'test_dead_stock',
      drawCount: 1,
      stock: [
        { id: 's1', suit: 'spades', rank: 5, faceUp: false },
        { id: 's2', suit: 'clubs', rank: 7, faceUp: false },
      ],
      waste: [{ id: 'w1', suit: 'spades', rank: 9, faceUp: true }],
      foundations: [[], [], [], []],
      tableau: [
        [{ id: 'c1', suit: 'spades', rank: 2, faceUp: true }],
        [{ id: 'c2', suit: 'clubs', rank: 4, faceUp: true }],
        [{ id: 'c3', suit: 'spades', rank: 6, faceUp: true }],
        [{ id: 'c4', suit: 'clubs', rank: 8, faceUp: true }],
        [{ id: 'c5', suit: 'spades', rank: 10, faceUp: true }],
        [{ id: 'c6', suit: 'clubs', rank: 12, faceUp: true }],
        [{ id: 'c7', suit: 'spades', rank: 13, faceUp: true }], // King at base, no empty column
      ],
      score: 0,
      moves: 10,
      elapsedSeconds: 50,
      status: 'playing',
      history: [],
      createdAt: Date.now(),
    };

    expect(hasAvailableMoves(deadStateWithStock)).toBe(false);
  });

  test('does not consider moving a base King to an empty column as a valid move', () => {
    // Only move theoretically possible by raw rules is King at index 0 moving to empty col 1,
    // which is an infinite no-op loop and should not prevent loss detection.
    const kingLoopState: GameState = {
      version: 1,
      id: 'test_king_loop',
      drawCount: 1,
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [
        [{ id: 'k1', suit: 'spades', rank: 13, faceUp: true }], // King at index 0
        [], // empty column
        [{ id: 'c1', suit: 'spades', rank: 2, faceUp: true }],
        [{ id: 'c2', suit: 'spades', rank: 4, faceUp: true }],
        [{ id: 'c3', suit: 'spades', rank: 6, faceUp: true }],
        [{ id: 'c4', suit: 'spades', rank: 8, faceUp: true }],
        [{ id: 'c5', suit: 'spades', rank: 10, faceUp: true }],
      ],
      score: 0,
      moves: 5,
      elapsedSeconds: 20,
      status: 'playing',
      history: [],
      createdAt: Date.now(),
    };

    expect(hasAvailableMoves(kingLoopState)).toBe(false);
  });

  test('detects available move from waste to tableau', () => {
    const state: GameState = {
      version: 1,
      id: 'test_waste_move',
      drawCount: 1,
      stock: [],
      waste: [{ id: 'w1', suit: 'hearts', rank: 5, faceUp: true }],
      foundations: [[], [], [], []],
      tableau: [
        [{ id: 'c1', suit: 'spades', rank: 6, faceUp: true }],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
      score: 0,
      moves: 2,
      elapsedSeconds: 10,
      status: 'playing',
      history: [],
      createdAt: Date.now(),
    };

    expect(hasAvailableMoves(state)).toBe(true);
  });

  test('detects available move from tableau to foundation', () => {
    const state: GameState = {
      version: 1,
      id: 'test_ace_move',
      drawCount: 1,
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [
        [{ id: 'c1', suit: 'spades', rank: 1, faceUp: true }], // Ace of Spades!
        [],
        [],
        [],
        [],
        [],
        [],
      ],
      score: 0,
      moves: 1,
      elapsedSeconds: 5,
      status: 'playing',
      history: [],
      createdAt: Date.now(),
    };

    expect(hasAvailableMoves(state)).toBe(true);
  });

  test('hasExhaustedStockCycles detects exhausted cycles after recycling without board moves', () => {
    let state = dealKlondike(1, 99);
    // Simulate drawing all stock cards
    while (state.stock.length > 0) {
      state = drawCards(state);
    }
    expect(state.stock.length).toBe(0);
    expect(hasExhaustedStockCycles(state)).toBe(false);

    // Recycle waste back to stock
    state = drawCards(state);
    expect(state.stock.length).toBe(24);

    // Draw all stock cards again without any board moves
    while (state.stock.length > 0) {
      state = drawCards(state);
    }
    expect(state.stock.length).toBe(0);
    // In Draw 1, 1 full pass after recycle means cycles are exhausted
    expect(hasExhaustedStockCycles(state)).toBe(true);
  });

  test('game operations respect lost status and undo restores playing', () => {
    const state = dealKlondike(1);
    const lostState: GameState = {
      ...state,
      status: 'lost',
      history: [
        {
          from: { type: 'stock', index: 0 },
          to: { type: 'waste', index: 0 },
          cardIds: ['c1'],
          pointsEarned: 0,
        },
      ],
    };

    // drawCards and moveCards reject actions when lost
    expect(drawCards(lostState).status).toBe('lost');
    expect(
      moveCards(
        lostState,
        { type: 'tableau', index: 0 },
        { type: 'foundation', index: 0 },
        ['c1']
      )
    ).toBeNull();
    expect(findSmartMove(lostState, 'c1')).toBeNull();

    // Undo restores status to playing
    const undone = undo(lostState);
    expect(undone.status).toBe('playing');
  });

  test('returns false when trapped face-down cards cannot be reached', () => {
    const trappedState: GameState = {
      version: 1,
      id: 'test_trapped',
      drawCount: 1,
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [
        [
          { id: 'fd_1', suit: 'hearts', rank: 1, faceUp: false }, // Trapped Ace of Hearts!
          { id: 'fu_1', suit: 'spades', rank: 2, faceUp: true },
        ],
        [{ id: 'c2', suit: 'spades', rank: 4, faceUp: true }],
        [{ id: 'c3', suit: 'spades', rank: 6, faceUp: true }],
        [{ id: 'c4', suit: 'spades', rank: 8, faceUp: true }],
        [{ id: 'c5', suit: 'spades', rank: 10, faceUp: true }],
        [{ id: 'c6', suit: 'spades', rank: 12, faceUp: true }],
        [],
      ],
      score: 0,
      moves: 12,
      elapsedSeconds: 45,
      status: 'playing',
      history: [],
      createdAt: Date.now(),
    };

    expect(hasAvailableMoves(trappedState)).toBe(false);
  });

  test('returns false when game is already won', () => {
    const wonState = dealKlondike(1);
    wonState.status = 'won';
    expect(hasAvailableMoves(wonState)).toBe(false);
  });
});



