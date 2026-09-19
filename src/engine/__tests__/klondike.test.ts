import { createStandardDeck, dealKlondike, shuffleCards } from '../deck';
import { canPlaceOnFoundation, canPlaceOnTableau, isGameWon, canAutoComplete } from '../rules';
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
      { id: 'ace_card', suit: 'hearts', rank: 1, faceUp: true },
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
      { id: 'ace_card', suit: 'hearts', rank: 1, faceUp: true },
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
    expect(afterUndo.moves).toBe(state.moves);
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
});
