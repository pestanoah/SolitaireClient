import { Card, FOUNDATION_SUITS, GameState, MoveRecord, PileLocation } from './types';
import { canPlaceOnFoundation, canPlaceOnTableau, isGameWon, hasExhaustedStockCycles } from './rules';
import { dealKlondike, dealKlondikeFromDeck } from './deck';

/**
 * Draws cards from stock into waste according to drawCount (1 or 3).
 * If stock is empty, recycles waste back into stock with penalty.
 */
export function drawCards(state: GameState): GameState {
  if (state.status === 'won' || state.status === 'lost') return state;

  if (state.stock.length > 0) {
    const count = Math.min(state.drawCount, state.stock.length);
    const stock = state.stock.slice(0, state.stock.length - count);
    const drawn = state.stock.slice(state.stock.length - count).map((c) => ({
      ...c,
      faceUp: true,
    }));
    const waste = [...state.waste, ...drawn];

    const moveRecord: MoveRecord = {
      from: { type: 'stock', index: 0 },
      to: { type: 'waste', index: 0 },
      cardIds: drawn.map((c) => c.id),
      pointsEarned: 0,
    };

    return {
      ...state,
      stock,
      waste,
      moves: state.moves + 1,
      history: [...state.history, moveRecord],
    };
  }

  // Recycle waste back to stock
  if (state.waste.length > 0) {
    const penalty = state.drawCount === 1 ? 20 : 50;
    const points = -Math.min(state.score, penalty);

    // Cards are reversed when turned face-down back into the stock
    const recycled = state.waste
      .slice()
      .reverse()
      .map((c) => ({ ...c, faceUp: false }));

    const moveRecord: MoveRecord = {
      from: { type: 'waste', index: 0 },
      to: { type: 'stock', index: 0 },
      cardIds: recycled.map((c) => c.id),
      pointsEarned: points,
    };

    return {
      ...state,
      stock: recycled,
      waste: [],
      score: Math.max(0, state.score + points),
      moves: state.moves + 1,
      history: [...state.history, moveRecord],
    };
  }

  return state;
}

/**
 * Moves cards from source pile to destination pile if valid.
 */
export function moveCards(
  state: GameState,
  from: PileLocation,
  to: PileLocation,
  cardIds: string[],
  allowAnyCardOnEmpty = false
): GameState | null {
  if (state.status === 'won' || state.status === 'lost' || cardIds.length === 0) return null;
  if (from.type === to.type && from.index === to.index) return null;

  // 1. Locate source cards
  let sourceCards: Card[] = [];
  if (from.type === 'waste') {
    if (state.waste.length === 0 || state.waste[state.waste.length - 1].id !== cardIds[0]) return null;
    sourceCards = [state.waste[state.waste.length - 1]];
  } else if (from.type === 'tableau') {
    const col = state.tableau[from.index];
    if (!col) return null;
    const startIndex = col.findIndex((c) => c.id === cardIds[0]);
    if (startIndex === -1) return null;
    sourceCards = col.slice(startIndex);
    // Verify that the requested cardIds match the tail of the column
    if (sourceCards.length !== cardIds.length || !sourceCards.every((c, i) => c.id === cardIds[i])) {
      return null;
    }
  } else if (from.type === 'foundation') {
    if (cardIds.length !== 1) return null;
    const pile = state.foundations[from.index];
    if (!pile || pile.length === 0 || pile[pile.length - 1].id !== cardIds[0]) return null;
    sourceCards = [pile[pile.length - 1]];
  } else {
    return null; // Cannot move directly out of stock
  }

  // 2. Validate move against destination rules
  const leadCard = sourceCards[0];
  if (to.type === 'tableau') {
    const targetCol = state.tableau[to.index];
    if (!targetCol || !canPlaceOnTableau(leadCard, targetCol, allowAnyCardOnEmpty)) return null;
  } else if (to.type === 'foundation') {
    if (sourceCards.length !== 1) return null; // Foundations only accept 1 card at a time
    const targetPile = state.foundations[to.index];
    if (!targetPile || !canPlaceOnFoundation(leadCard, targetPile, to.index)) return null;
  } else {
    return null; // Cannot move into waste or stock directly
  }

  // 3. Prepare updated piles with structural sharing
  const stock = state.stock;
  let waste = state.waste;
  if (from.type === 'waste') {
    waste = state.waste.slice(0, state.waste.length - 1);
  }

  let tableau = state.tableau;
  let turnedOverCardId: string | undefined;
  let flipPoints = 0;

  if (from.type === 'tableau' || to.type === 'tableau') {
    tableau = state.tableau.slice();

    if (from.type === 'tableau') {
      const fromCol = state.tableau[from.index];
      const remaining = fromCol.slice(0, fromCol.length - sourceCards.length);
      if (remaining.length > 0) {
        const topRemaining = remaining[remaining.length - 1];
        if (!topRemaining.faceUp) {
          turnedOverCardId = topRemaining.id;
          flipPoints = 5;
          tableau[from.index] = [
            ...remaining.slice(0, -1),
            { ...topRemaining, faceUp: true },
          ];
        } else {
          tableau[from.index] = remaining;
        }
      } else {
        tableau[from.index] = remaining;
      }
    }

    if (to.type === 'tableau') {
      tableau[to.index] = [...state.tableau[to.index], ...sourceCards];
    }
  }

  let foundations = state.foundations;
  if (from.type === 'foundation' || to.type === 'foundation') {
    foundations = state.foundations.slice();

    if (from.type === 'foundation') {
      foundations[from.index] = state.foundations[from.index].slice(0, -1);
    }

    if (to.type === 'foundation') {
      foundations[to.index] = [...state.foundations[to.index], leadCard];
    }
  }

  // 4. Calculate points
  let movePoints = 0;
  if (from.type === 'waste' && to.type === 'tableau') movePoints = 5;
  else if (from.type === 'waste' && to.type === 'foundation') movePoints = 10;
  else if (from.type === 'tableau' && to.type === 'foundation') movePoints = 10;
  else if (from.type === 'foundation' && to.type === 'tableau') movePoints = -15;

  const totalPoints = movePoints + flipPoints;
  const newScore = Math.max(0, state.score + totalPoints);

  const moveRecord: MoveRecord = {
    from,
    to,
    cardIds: sourceCards.map((c) => c.id),
    turnedOverCardId,
    pointsEarned: totalPoints,
  };

  const won = isGameWon(foundations);

  return {
    ...state,
    stock,
    waste,
    foundations,
    tableau,
    score: newScore,
    moves: state.moves + 1,
    status: won ? 'won' : state.status,
    history: [...state.history, moveRecord],
  };
}

/**
 * Finds the best legal destination for a given card:
 * 1. Checks all 4 foundation piles first.
 * 2. Checks all 7 tableau columns next (prioritizing non-empty columns to make progress).
 */
export function findSmartMove(
  state: GameState,
  cardId: string,
  allowAnyCardOnEmpty = false
): { from: PileLocation; to: PileLocation; cardIds: string[] } | null {
  if (state.status === 'won' || state.status === 'lost') return null;

  // Locate card
  let from: PileLocation | null = null;
  let card: Card | null = null;
  let cardIds: string[] = [];

  if (state.waste.length > 0 && state.waste[state.waste.length - 1].id === cardId) {
    from = { type: 'waste', index: 0 };
    card = state.waste[state.waste.length - 1];
    cardIds = [card.id];
  } else {
    for (let c = 0; c < state.tableau.length; c++) {
      const col = state.tableau[c];
      const idx = col.findIndex((item) => item.id === cardId);
      if (idx !== -1 && col[idx].faceUp) {
        from = { type: 'tableau', index: c };
        card = col[idx];
        cardIds = col.slice(idx).map((item) => item.id);
        break;
      }
    }
  }

  // Also check foundations if card not found in waste or tableau
  if (!from) {
    for (let f = 0; f < state.foundations.length; f++) {
      const pile = state.foundations[f];
      if (pile.length > 0 && pile[pile.length - 1].id === cardId) {
        from = { type: 'foundation', index: f };
        card = pile[pile.length - 1];
        cardIds = [card.id];
        break;
      }
    }
  }

  if (!from || !card) return null;

  // Single card: try foundations first (only if not already on a foundation)
  if (from.type !== 'foundation' && cardIds.length === 1) {
    // 1. Try the foundation pile designated for the card's suit
    const suitIndex = FOUNDATION_SUITS.indexOf(card.suit);
    if (suitIndex >= 0 && suitIndex < state.foundations.length) {
      if (canPlaceOnFoundation(card, state.foundations[suitIndex], suitIndex)) {
        return {
          from,
          to: { type: 'foundation', index: suitIndex },
          cardIds,
        };
      }
    }

    // 2. Check remaining foundation piles (for variants or multi-deck foundations)
    for (let f = 0; f < state.foundations.length; f++) {
      if (f === suitIndex) continue;
      if (canPlaceOnFoundation(card, state.foundations[f], f)) {
        return {
          from,
          to: { type: 'foundation', index: f },
          cardIds,
        };
      }
    }
  }

  // Foundation cards with rank <= 2 (Aces and Twos) should never be moved down to tableau
  if (from.type === 'foundation' && card.rank <= 2) {
    return null;
  }

  // Try tableau columns (prefer non-empty columns before placing King on an empty column)
  const candidateIndices: number[] = [];
  for (let t = 0; t < state.tableau.length; t++) {
    if (from.type === 'tableau' && from.index === t) continue; // Same column
    if (canPlaceOnTableau(card, state.tableau[t], allowAnyCardOnEmpty)) {
      candidateIndices.push(t);
    }
  }

  if (candidateIndices.length > 0) {
    // If the card is already a King at index 0 of its current tableau column, don't move it to another empty column
    if (
      from.type === 'tableau' &&
      card.rank === 13 &&
      state.tableau[from.index].findIndex((c) => c.id === card!.id) === 0
    ) {
      const nonEmpties = candidateIndices.filter((idx) => state.tableau[idx].length > 0);
      if (nonEmpties.length === 0) return null;
      return {
        from,
        to: { type: 'tableau', index: nonEmpties[0] },
        cardIds,
      };
    }

    // Prefer non-empty columns first
    candidateIndices.sort(
      (a, b) => (state.tableau[b].length > 0 ? 1 : 0) - (state.tableau[a].length > 0 ? 1 : 0)
    );

    return {
      from,
      to: { type: 'tableau', index: candidateIndices[0] },
      cardIds,
    };
  }

  return null;
}

/**
 * Undoes the most recent move in history, restoring exact card positions and scores.
 */
export function undo(state: GameState): GameState {
  if (state.history.length === 0) return state;

  const lastMove = state.history[state.history.length - 1];
  const remainingHistory = state.history.slice(0, -1);

  // Case 1: Draw from stock to waste
  if (lastMove.from.type === 'stock' && lastMove.to.type === 'waste') {
    const count = lastMove.cardIds.length;
    const undrawnCards = state.waste.slice(state.waste.length - count).map((c) => ({
      ...c,
      faceUp: false,
    }));
    const stock = [...state.stock, ...undrawnCards];
    const waste = state.waste.slice(0, state.waste.length - count);

    return {
      ...state,
      stock,
      waste,
      moves: state.moves + 1,
      status: 'playing',
      history: remainingHistory,
    };
  }

  // Case 2: Stock recycle (waste -> stock)
  if (lastMove.from.type === 'waste' && lastMove.to.type === 'stock') {
    const cards = state.stock
      .slice()
      .reverse()
      .map((c) => ({ ...c, faceUp: true }));

    return {
      ...state,
      stock: [],
      waste: [...state.waste, ...cards],
      score: Math.max(0, state.score - lastMove.pointsEarned),
      moves: state.moves + 1,
      status: 'playing',
      history: remainingHistory,
    };
  }

  // Case 3: Move between piles
  let movedCards: Card[] = [];
  let remainingTargetCol: Card[] | null = null;
  let remainingTargetPile: Card[] | null = null;

  if (lastMove.to.type === 'tableau') {
    const count = lastMove.cardIds.length;
    const targetCol = state.tableau[lastMove.to.index];
    movedCards = targetCol.slice(targetCol.length - count);
    remainingTargetCol = targetCol.slice(0, targetCol.length - count);
  } else if (lastMove.to.type === 'foundation') {
    const targetPile = state.foundations[lastMove.to.index];
    movedCards = [targetPile[targetPile.length - 1]];
    remainingTargetPile = targetPile.slice(0, targetPile.length - 1);
  }

  const stock = state.stock;
  let waste = state.waste;
  if (lastMove.from.type === 'waste') {
    waste = [...state.waste, ...movedCards];
  }

  let foundations = state.foundations;
  if (lastMove.from.type === 'foundation' || lastMove.to.type === 'foundation') {
    foundations = state.foundations.slice();
    if (lastMove.to.type === 'foundation' && remainingTargetPile) {
      foundations[lastMove.to.index] = remainingTargetPile;
    }
    if (lastMove.from.type === 'foundation') {
      foundations[lastMove.from.index] = [...foundations[lastMove.from.index], ...movedCards];
    }
  }

  let tableau = state.tableau;
  if (lastMove.from.type === 'tableau' || lastMove.to.type === 'tableau') {
    tableau = state.tableau.slice();
    if (lastMove.to.type === 'tableau' && remainingTargetCol) {
      tableau[lastMove.to.index] = remainingTargetCol;
    }
    if (lastMove.from.type === 'tableau') {
      let sourceCol = tableau[lastMove.from.index];
      if (lastMove.turnedOverCardId && sourceCol.length > 0) {
        const turnedIdx = sourceCol.findIndex((c) => c.id === lastMove.turnedOverCardId);
        if (turnedIdx !== -1) {
          sourceCol = sourceCol.map((c, i) => (i === turnedIdx ? { ...c, faceUp: false } : c));
        }
      }
      tableau[lastMove.from.index] = [...sourceCol, ...movedCards];
    }
  }

  return {
    ...state,
    stock,
    waste,
    foundations,
    tableau,
    score: Math.max(0, state.score - lastMove.pointsEarned),
    moves: state.moves + 1,
    status: 'playing',
    history: remainingHistory,
  };
}

/**
 * Automatically advances one eligible card towards completing the game:
 * 1. Tableau column top card -> foundation
 * 2. Waste top card -> foundation
 * 3. Waste top card -> tableau column
 * 4. Move tableau cards to empty column if King in waste
 * 5. Stock -> waste (draw)
 * 6. Waste -> stock (recycle if not exhausted)
 */
export function autoCompleteStep(state: GameState): GameState | null {
  if (state.status === 'won' || state.status === 'lost') return null;

  // 1. Try designated foundation for tableau column top cards
  for (let c = 0; c < state.tableau.length; c++) {
    const col = state.tableau[c];
    if (col.length === 0) continue;
    const topCard = col[col.length - 1];

    const suitIndex = FOUNDATION_SUITS.indexOf(topCard.suit);
    if (
      suitIndex >= 0 &&
      suitIndex < state.foundations.length &&
      canPlaceOnFoundation(topCard, state.foundations[suitIndex], suitIndex)
    ) {
      return moveCards(state, { type: 'tableau', index: c }, { type: 'foundation', index: suitIndex }, [
        topCard.id,
      ]);
    }

    for (let f = 0; f < state.foundations.length; f++) {
      if (f === suitIndex) continue;
      if (canPlaceOnFoundation(topCard, state.foundations[f], f)) {
        return moveCards(state, { type: 'tableau', index: c }, { type: 'foundation', index: f }, [
          topCard.id,
        ]);
      }
    }
  }

  // 2. Try designated foundation for waste top card
  if (state.waste.length > 0) {
    const topWaste = state.waste[state.waste.length - 1];
    const suitIndex = FOUNDATION_SUITS.indexOf(topWaste.suit);
    if (
      suitIndex >= 0 &&
      suitIndex < state.foundations.length &&
      canPlaceOnFoundation(topWaste, state.foundations[suitIndex], suitIndex)
    ) {
      return moveCards(state, { type: 'waste', index: 0 }, { type: 'foundation', index: suitIndex }, [
        topWaste.id,
      ]);
    }

    for (let f = 0; f < state.foundations.length; f++) {
      if (f === suitIndex) continue;
      if (canPlaceOnFoundation(topWaste, state.foundations[f], f)) {
        return moveCards(state, { type: 'waste', index: 0 }, { type: 'foundation', index: f }, [
          topWaste.id,
        ]);
      }
    }
  }

  // 3. Try placing waste top card onto tableau
  if (state.waste.length > 0) {
    const topWaste = state.waste[state.waste.length - 1];
    const candidateColumns: number[] = [];
    for (let t = 0; t < state.tableau.length; t++) {
      if (canPlaceOnTableau(topWaste, state.tableau[t])) {
        candidateColumns.push(t);
      }
    }
    if (candidateColumns.length > 0) {
      // Prefer non-empty columns first
      candidateColumns.sort(
        (a, b) => (state.tableau[b].length > 0 ? 1 : 0) - (state.tableau[a].length > 0 ? 1 : 0)
      );
      return moveCards(state, { type: 'waste', index: 0 }, { type: 'tableau', index: candidateColumns[0] }, [
        topWaste.id,
      ]);
    }
  }

  // 4. If waste has a King and no empty column exists, check if moving a tableau stack creates an empty column
  if (state.waste.length > 0 && state.waste[state.waste.length - 1].rank === 13) {
    const hasEmpty = state.tableau.some((c) => c.length === 0);
    if (!hasEmpty) {
      for (let fromIdx = 0; fromIdx < state.tableau.length; fromIdx++) {
        const fromCol = state.tableau[fromIdx];
        if (fromCol.length === 0) continue;
        const baseCard = fromCol[0];
        for (let toIdx = 0; toIdx < state.tableau.length; toIdx++) {
          if (toIdx === fromIdx) continue;
          if (canPlaceOnTableau(baseCard, state.tableau[toIdx])) {
            const cardIds = fromCol.map((c) => c.id);
            return moveCards(state, { type: 'tableau', index: fromIdx }, { type: 'tableau', index: toIdx }, cardIds);
          }
        }
      }
    }
  }

  // 5. Try drawing from stock
  if (state.stock.length > 0) {
    return drawCards(state);
  }

  // 6. If stock is empty and waste has cards, recycle if cycle not exhausted
  if (state.waste.length > 0 && !hasExhaustedStockCycles(state)) {
    return drawCards(state);
  }

  return null;
}

/**
 * Replays the exact same draw/deal again from move 0:
 * - Resets all 52 cards back to their initial tableau and stock positions
 * - Empties waste and foundation piles
 * - Resets score, moves, timer, and history to 0
 * - Generates a new unique game id so game-end tracking operates independently
 * - Preserves drawCount and initialDeck
 */
export function replayGame(state: GameState): GameState {
  if (state.initialDeck && state.initialDeck.length === 52) {
    return dealKlondikeFromDeck(state.initialDeck, state.drawCount);
  }

  // Fallback: If initialDeck is not attached, unwind moves back to initial state
  let cur = state;
  while (cur.history.length > 0) {
    const prev = undo(cur);
    if (prev === cur || prev.history.length >= cur.history.length) break;
    cur = prev;
  }

  // Extract cards from rewound tableau columns + stock
  const tableauCards: Card[] = [];
  for (let c = 0; c < 7; c++) {
    tableauCards.push(...(cur.tableau[c] || []));
  }
  const deck = [...tableauCards, ...cur.stock];

  if (deck.length === 52) {
    return dealKlondikeFromDeck(deck, state.drawCount);
  }

  // Fallback if deck cannot be reconstructed
  return dealKlondike(state.drawCount);
}
