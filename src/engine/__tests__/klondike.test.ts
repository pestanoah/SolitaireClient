import { createStandardDeck, dealKlondike, shuffleCards } from '../deck';
import {
  canPlaceOnFoundation,
  canPlaceOnTableau,
  isGameWon,
  canAutoComplete,
  areAllTableauCardsUncovered,
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

  test('canAutoComplete returns true when all tableau cards are uncovered even with stock and waste', () => {
    let state = dealKlondike(1);
    // All cards in tableau face-up
    state.tableau = [
      [{ id: 'c_ace', suit: 'diamonds', rank: 1, faceUp: true }],
      [{ id: 'c_2', suit: 'diamonds', rank: 2, faceUp: true }],
      [],
      [],
      [],
      [],
      [],
    ];
    // Stock and waste still have cards
    state.stock = [{ id: 's_1', suit: 'hearts', rank: 1, faceUp: false }];
    state.waste = [{ id: 'w_1', suit: 'spades', rank: 1, faceUp: true }];

    expect(areAllTableauCardsUncovered(state.tableau)).toBe(true);
    expect(canAutoComplete(state)).toBe(true);
  });

  test('canAutoComplete returns false when any card in tableau is covered (face-down)', () => {
    let state = dealKlondike(1);
    state.tableau = [
      [
        { id: 'c_down', suit: 'spades', rank: 10, faceUp: false },
        { id: 'c_up', suit: 'hearts', rank: 9, faceUp: true },
      ],
      [],
      [],
      [],
      [],
      [],
      [],
    ];
    state.stock = [];
    state.waste = [];

    expect(areAllTableauCardsUncovered(state.tableau)).toBe(false);
    expect(canAutoComplete(state)).toBe(false);
  });

  test('canAutoComplete returns false when game is won or lost', () => {
    let state = dealKlondike(1);
    state.tableau = [[{ id: 'c_ace', suit: 'diamonds', rank: 1, faceUp: true }], [], [], [], [], [], []];
    state.stock = [];
    state.waste = [];

    state.status = 'won';
    expect(canAutoComplete(state)).toBe(false);

    state.status = 'lost';
    expect(canAutoComplete(state)).toBe(false);
  });

  test('autoCompleteStep advances waste card to foundation and draws from stock when needed', () => {
    let state = dealKlondike(1);
    state.tableau = [
      [{ id: 'c_2d', suit: 'diamonds', rank: 2, faceUp: true }],
      [],
      [],
      [],
      [],
      [],
      [],
    ];
    // Diamonds foundation is empty, so 2 of Diamonds cannot move to foundation yet
    // Waste has Ace of Diamonds
    state.waste = [{ id: 'c_ad', suit: 'diamonds', rank: 1, faceUp: true }];
    state.stock = [{ id: 'c_3d', suit: 'diamonds', rank: 3, faceUp: false }];

    expect(canAutoComplete(state)).toBe(true);

    // Step 1: Waste Ace of Diamonds moves to Diamonds foundation (foundation index 2)
    const step1 = autoCompleteStep(state);
    expect(step1).not.toBeNull();
    expect(step1!.foundations[2]).toHaveLength(1);
    expect(step1!.foundations[2][0].rank).toBe(1);
    expect(step1!.waste).toHaveLength(0);

    // Step 2: Tableau 2 of Diamonds moves to Diamonds foundation
    const step2 = autoCompleteStep(step1!);
    expect(step2).not.toBeNull();
    expect(step2!.foundations[2]).toHaveLength(2);
    expect(step2!.foundations[2][1].rank).toBe(2);
    expect(step2!.tableau[0]).toHaveLength(0);

    // Step 3: Tableau is empty, waste is empty, stock has 3 of Diamonds -> draws from stock
    const step3 = autoCompleteStep(step2!);
    expect(step3).not.toBeNull();
    expect(step3!.waste).toHaveLength(1);
    expect(step3!.waste[0].id).toBe('c_3d');
    expect(step3!.stock).toHaveLength(0);

    // Step 4: 3 of Diamonds moves from waste to foundation
    const step4 = autoCompleteStep(step3!);
    expect(step4).not.toBeNull();
    expect(step4!.foundations[2]).toHaveLength(3);
    expect(step4!.foundations[2][2].rank).toBe(3);
    expect(step4!.waste).toHaveLength(0);
  });

  test('autoCompleteStep moves waste card to tableau if it cannot move to foundation', () => {
    let state = dealKlondike(1);
    state.tableau = [
      [{ id: 'c_8h', suit: 'hearts', rank: 8, faceUp: true }],
      [],
      [],
      [],
      [],
      [],
      [],
    ];
    // Waste has 7 of Spades (foundation for spades is at 0, so cannot move to foundation)
    state.waste = [{ id: 'c_7s', suit: 'spades', rank: 7, faceUp: true }];
    state.stock = [];

    expect(canAutoComplete(state)).toBe(true);

    const step = autoCompleteStep(state);
    expect(step).not.toBeNull();
    // 7 of Spades should be placed onto 8 of Hearts in Tableau column 0
    expect(step!.tableau[0]).toHaveLength(2);
    expect(step!.tableau[0][1].id).toBe('c_7s');
    expect(step!.waste).toHaveLength(0);
  });

  test('full end-to-end auto-finish completes game when all cards are uncovered', () => {
    let state = dealKlondike(1);
    // Setup state where all tableau cards are uncovered, and remaining cards are distributed across tableau, waste, stock
    state.foundations = [
      // Spades: A through 11 (Jack)
      Array.from({ length: 11 }, (_, i) => ({
        id: `s_${i + 1}`,
        suit: 'spades' as const,
        rank: (i + 1) as any,
        faceUp: true,
      })),
      // Hearts: A through 12 (Queen)
      Array.from({ length: 12 }, (_, i) => ({
        id: `h_${i + 1}`,
        suit: 'hearts' as const,
        rank: (i + 1) as any,
        faceUp: true,
      })),
      // Diamonds: A through 13 (King) - full
      Array.from({ length: 13 }, (_, i) => ({
        id: `d_${i + 1}`,
        suit: 'diamonds' as const,
        rank: (i + 1) as any,
        faceUp: true,
      })),
      // Clubs: A through 12 (Queen)
      Array.from({ length: 12 }, (_, i) => ({
        id: `c_${i + 1}`,
        suit: 'clubs' as const,
        rank: (i + 1) as any,
        faceUp: true,
      })),
    ];

    // Total in foundations so far = 11 + 12 + 13 + 12 = 48 cards.
    // 4 cards remaining:
    // 1. Spades Queen (rank 12) -> on Tableau
    // 2. Spades King (rank 13) -> in Stock
    // 3. Hearts King (rank 13) -> in Waste
    // 4. Clubs King (rank 13) -> on Tableau
    state.tableau = [
      [{ id: 's_12', suit: 'spades', rank: 12, faceUp: true }],
      [{ id: 'c_13', suit: 'clubs', rank: 13, faceUp: true }],
      [],
      [],
      [],
      [],
      [],
    ];
    state.waste = [{ id: 'h_13', suit: 'hearts', rank: 13, faceUp: true }];
    state.stock = [{ id: 's_13', suit: 'spades', rank: 13, faceUp: false }];

    expect(canAutoComplete(state)).toBe(true);

    let activeState: GameState | null = state;
    let steps = 0;
    while (activeState && activeState.status === 'playing' && steps < 20) {
      activeState = autoCompleteStep(activeState);
      steps++;
    }

    expect(activeState).not.toBeNull();
    expect(activeState!.status).toBe('won');
    expect(isGameWon(activeState!.foundations)).toBe(true);
    expect(activeState!.foundations.reduce((acc, f) => acc + f.length, 0)).toBe(52);
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

  test('does not consider shuffling cards back and forth between tableau columns as advancing the game', () => {
    // Column 0 has 8 of Spades and 7 of Hearts (both face up, no face down cards).
    // Column 1 has 8 of Clubs (face up, no face down cards).
    // 7 of Hearts can legally move from col 0 to col 1, and back from col 1 to col 0.
    // However, this merely shuffles cards back and forth without uncovering any cards or advancing foundations.
    const shuffleState: GameState = {
      version: 1,
      id: 'test_tableau_shuffle',
      drawCount: 1,
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [
        [
          { id: '8_spades', suit: 'spades', rank: 8, faceUp: true },
          { id: '7_hearts', suit: 'hearts', rank: 7, faceUp: true },
        ],
        [{ id: '8_clubs', suit: 'clubs', rank: 8, faceUp: true }],
        [{ id: 'c2', suit: 'spades', rank: 2, faceUp: true }],
        [{ id: 'c3', suit: 'spades', rank: 4, faceUp: true }],
        [{ id: 'c4', suit: 'spades', rank: 6, faceUp: true }],
        [{ id: 'c5', suit: 'spades', rank: 10, faceUp: true }],
        [{ id: 'c6', suit: 'spades', rank: 12, faceUp: true }],
      ],
      score: 50,
      moves: 15,
      elapsedSeconds: 60,
      status: 'playing',
      history: [],
      createdAt: Date.now(),
    };

    expect(hasAvailableMoves(shuffleState)).toBe(false);
  });

  test('does not consider moving a foundation card down to tableau as advancing when it only shuffles back and forth', () => {
    // Foundation has Ace and 2 of Hearts.
    // Column 0 has 3 of Spades.
    // 2 of Hearts can legally be placed down on 3 of Spades, and then back up to foundation.
    // But no face-down cards exist to uncover, so this is pure back-and-forth shuffling.
    const foundationShuffleState: GameState = {
      version: 1,
      id: 'test_foundation_shuffle',
      drawCount: 1,
      stock: [],
      waste: [],
      foundations: [
        [
          { id: 'ah', suit: 'hearts', rank: 1, faceUp: true },
          { id: '2h', suit: 'hearts', rank: 2, faceUp: true },
        ],
        [],
        [],
        [],
      ],
      tableau: [
        [{ id: '3s', suit: 'spades', rank: 3, faceUp: true }],
        [{ id: 'c1', suit: 'spades', rank: 5, faceUp: true }],
        [{ id: 'c2', suit: 'spades', rank: 7, faceUp: true }],
        [{ id: 'c3', suit: 'spades', rank: 9, faceUp: true }],
        [{ id: 'c4', suit: 'spades', rank: 11, faceUp: true }],
        [{ id: 'c5', suit: 'spades', rank: 13, faceUp: true }],
        [],
      ],
      score: 20,
      moves: 8,
      elapsedSeconds: 40,
      status: 'playing',
      history: [],
      createdAt: Date.now(),
    };

    expect(hasAvailableMoves(foundationShuffleState)).toBe(false);
  });

  test('considers moving foundation card down to tableau as valid when it unlocks uncovering a face-down card', () => {
    // Foundation has Hearts up to 4.
    // Column 0 has 5 of Spades.
    // Column 1 has a face-down card underneath a 3 of Spades.
    // Moving 4 of Hearts down to 5 of Spades allows 3 of Spades to move onto 4 of Hearts,
    // which uncovers the face-down card!
    const productiveFoundationState: GameState = {
      version: 1,
      id: 'test_productive_foundation',
      drawCount: 1,
      stock: [],
      waste: [],
      foundations: [
        [
          { id: 'ah', suit: 'hearts', rank: 1, faceUp: true },
          { id: '2h', suit: 'hearts', rank: 2, faceUp: true },
          { id: '3h', suit: 'hearts', rank: 3, faceUp: true },
          { id: '4h', suit: 'hearts', rank: 4, faceUp: true },
        ],
        [],
        [],
        [],
      ],
      tableau: [
        [{ id: '5s', suit: 'spades', rank: 5, faceUp: true }],
        [
          { id: 'hidden_1', suit: 'clubs', rank: 9, faceUp: false },
          { id: '3s', suit: 'spades', rank: 3, faceUp: true },
        ],
        [],
        [],
        [],
        [],
        [],
      ],
      score: 40,
      moves: 12,
      elapsedSeconds: 50,
      status: 'playing',
      history: [],
      createdAt: Date.now(),
    };

    expect(hasAvailableMoves(productiveFoundationState)).toBe(true);
  });

  test('considers emptying a column as valid when it allows a King covering face-down cards to move', () => {
    // Column 0 has only a 7 of Hearts at base (empties col 0).
    // Column 1 has an 8 of Spades.
    // Column 2 has a face-down card underneath a King of Diamonds.
    // Moving 7 of Hearts to 8 of Spades empties Column 0, allowing King of Diamonds
    // to move into the empty space and uncover the hidden card!
    const productiveEmptyColumnState: GameState = {
      version: 1,
      id: 'test_productive_empty_col',
      drawCount: 1,
      stock: [],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [
        [{ id: '7h', suit: 'hearts', rank: 7, faceUp: true }],
        [{ id: '8s', suit: 'spades', rank: 8, faceUp: true }],
        [
          { id: 'hidden_king_parent', suit: 'clubs', rank: 2, faceUp: false },
          { id: 'kd', suit: 'diamonds', rank: 13, faceUp: true },
        ],
        [],
        [],
        [],
        [],
      ],
      score: 15,
      moves: 5,
      elapsedSeconds: 25,
      status: 'playing',
      history: [],
      createdAt: Date.now(),
    };

    expect(hasAvailableMoves(productiveEmptyColumnState)).toBe(true);
  });

  test('detects deadlock in Draw 3 mode when stock cards cannot be reached', () => {
    // In Draw 3 mode with 6 stock cards, only cards 1, 3, 4, 6 can ever appear at the top of waste.
    // Cards 2 and 5 are completely trapped.
    // If cards 1, 3, 4, 6 are unplayable, the game is deadlocked even though cards 2 and 5 match the tableau.
    const draw3TrappedState: GameState = {
      version: 1,
      id: 'test_draw3_trapped',
      drawCount: 3,
      stock: [
        { id: 's1', suit: 'spades', rank: 3, faceUp: false }, // top in pass 2, draw 2 (unplayable)
        { id: 's2', suit: 'hearts', rank: 7, faceUp: false }, // trapped! matches spades 8
        { id: 's3', suit: 'spades', rank: 5, faceUp: false }, // top in pass 1, draw 2 (unplayable)
        { id: 's4', suit: 'spades', rank: 7, faceUp: false }, // top in pass 2, draw 1 (unplayable)
        { id: 's5', suit: 'hearts', rank: 11, faceUp: false }, // trapped! matches spades 12
        { id: 's6', suit: 'spades', rank: 9, faceUp: false }, // top in pass 1, draw 1 (unplayable)
      ],
      waste: [],
      foundations: [[], [], [], []],
      tableau: [
        [{ id: 'c1', suit: 'spades', rank: 2, faceUp: true }],
        [{ id: 'c2', suit: 'spades', rank: 4, faceUp: true }],
        [{ id: 'c3', suit: 'spades', rank: 6, faceUp: true }],
        [{ id: 'c4', suit: 'spades', rank: 8, faceUp: true }],
        [{ id: 'c5', suit: 'spades', rank: 10, faceUp: true }],
        [{ id: 'c6', suit: 'spades', rank: 12, faceUp: true }],
        [{ id: 'c7', suit: 'spades', rank: 13, faceUp: true }],
      ],
      score: 0,
      moves: 10,
      elapsedSeconds: 45,
      status: 'playing',
      history: [],
      createdAt: Date.now(),
    };

    expect(hasAvailableMoves(draw3TrappedState)).toBe(false);
  });
});



