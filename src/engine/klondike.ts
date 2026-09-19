import { Card, GameState, MoveRecord, PileLocation } from './types';
import { canPlaceOnFoundation, canPlaceOnTableau, isGameWon } from './rules';

/**
 * Helper to deep clone the mutable piles of GameState.
 */
function clonePiles(state: GameState): {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
} {
  return {
    stock: state.stock.map((c) => ({ ...c })),
    waste: state.waste.map((c) => ({ ...c })),
    foundations: state.foundations.map((pile) => pile.map((c) => ({ ...c }))),
    tableau: state.tableau.map((col) => col.map((c) => ({ ...c }))),
  };
}

/**
 * Draws cards from stock into waste according to drawCount (1 or 3).
 * If stock is empty, recycles waste back into stock with penalty.
 */
export function drawCards(state: GameState): GameState {
  if (state.status === 'won') return state;

  const { stock, waste, foundations, tableau } = clonePiles(state);
  let points = 0;

  if (stock.length > 0) {
    const count = Math.min(state.drawCount, stock.length);
    const drawn = stock.splice(stock.length - count, count).map((c) => ({
      ...c,
      faceUp: true,
    }));
    waste.push(...drawn);

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
  if (waste.length > 0) {
    const penalty = state.drawCount === 1 ? 20 : 50;
    points = -Math.min(state.score, penalty);

    // Cards are reversed when turned face-down back into the stock
    const recycled = waste
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
  if (state.status === 'won' || cardIds.length === 0) return null;

  const { stock, waste, foundations, tableau } = clonePiles(state);

  // 1. Locate source cards
  let sourceCards: Card[] = [];
  if (from.type === 'waste') {
    if (waste.length === 0 || waste[waste.length - 1].id !== cardIds[0]) return null;
    sourceCards = [waste[waste.length - 1]];
  } else if (from.type === 'tableau') {
    const col = tableau[from.index];
    const startIndex = col.findIndex((c) => c.id === cardIds[0]);
    if (startIndex === -1) return null;
    sourceCards = col.slice(startIndex);
    // Verify that the requested cardIds match the tail of the column
    if (sourceCards.length !== cardIds.length || !sourceCards.every((c, i) => c.id === cardIds[i])) {
      return null;
    }
  } else if (from.type === 'foundation') {
    const pile = foundations[from.index];
    if (pile.length === 0 || pile[pile.length - 1].id !== cardIds[0]) return null;
    sourceCards = [pile[pile.length - 1]];
  } else {
    return null; // Cannot move directly out of stock
  }

  // 2. Validate move against destination rules
  const leadCard = sourceCards[0];
  if (to.type === 'tableau') {
    const targetCol = tableau[to.index];
    if (!canPlaceOnTableau(leadCard, targetCol, allowAnyCardOnEmpty)) return null;
  } else if (to.type === 'foundation') {
    if (sourceCards.length !== 1) return null; // Foundations only accept 1 card at a time
    const targetPile = foundations[to.index];
    if (!canPlaceOnFoundation(leadCard, targetPile)) return null;
  } else {
    return null; // Cannot move into waste or stock directly
  }

  // 3. Remove cards from source
  if (from.type === 'waste') {
    waste.pop();
  } else if (from.type === 'tableau') {
    tableau[from.index].splice(tableau[from.index].length - sourceCards.length, sourceCards.length);
  } else if (from.type === 'foundation') {
    foundations[from.index].pop();
  }

  // 4. If tableau source has exposed face-down card, flip it face-up
  let turnedOverCardId: string | undefined;
  let flipPoints = 0;
  if (from.type === 'tableau' && tableau[from.index].length > 0) {
    const topCard = tableau[from.index][tableau[from.index].length - 1];
    if (!topCard.faceUp) {
      topCard.faceUp = true;
      turnedOverCardId = topCard.id;
      flipPoints = 5;
    }
  }

  // 5. Append cards to destination
  if (to.type === 'tableau') {
    tableau[to.index].push(...sourceCards);
  } else if (to.type === 'foundation') {
    foundations[to.index].push(leadCard);
  }

  // 6. Calculate points
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
  if (state.status === 'won') return null;

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

  if (!from || !card) return null;

  // Single card: try foundations first
  if (cardIds.length === 1) {
    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(card, state.foundations[f])) {
        return {
          from,
          to: { type: 'foundation', index: f },
          cardIds,
        };
      }
    }
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
  const { stock, waste, foundations, tableau } = clonePiles(state);

  // Case 1: Draw from stock to waste
  if (lastMove.from.type === 'stock' && lastMove.to.type === 'waste') {
    const count = lastMove.cardIds.length;
    const cards = waste.splice(waste.length - count, count).map((c) => ({
      ...c,
      faceUp: false,
    }));
    stock.push(...cards);

    return {
      ...state,
      stock,
      waste,
      moves: Math.max(0, state.moves - 1),
      history: remainingHistory,
    };
  }

  // Case 2: Stock recycle (waste -> stock)
  if (lastMove.from.type === 'waste' && lastMove.to.type === 'stock') {
    const cards = stock.splice(0, stock.length).reverse().map((c) => ({
      ...c,
      faceUp: true,
    }));
    waste.push(...cards);

    return {
      ...state,
      stock,
      waste,
      score: Math.max(0, state.score - lastMove.pointsEarned),
      moves: Math.max(0, state.moves - 1),
      history: remainingHistory,
    };
  }

  // Case 3: Move between piles
  let movedCards: Card[] = [];
  if (lastMove.to.type === 'tableau') {
    const count = lastMove.cardIds.length;
    movedCards = tableau[lastMove.to.index].splice(
      tableau[lastMove.to.index].length - count,
      count
    );
  } else if (lastMove.to.type === 'foundation') {
    movedCards = [foundations[lastMove.to.index].pop()!];
  }

  // If a card was flipped on the source column, flip it back face-down
  if (lastMove.turnedOverCardId && lastMove.from.type === 'tableau') {
    const sourceCol = tableau[lastMove.from.index];
    const turnedCard = sourceCol.find((c) => c.id === lastMove.turnedOverCardId);
    if (turnedCard) {
      turnedCard.faceUp = false;
    }
  }

  // Put moved cards back in their source pile
  if (lastMove.from.type === 'waste') {
    waste.push(...movedCards);
  } else if (lastMove.from.type === 'tableau') {
    tableau[lastMove.from.index].push(...movedCards);
  } else if (lastMove.from.type === 'foundation') {
    foundations[lastMove.from.index].push(...movedCards);
  }

  return {
    ...state,
    stock,
    waste,
    foundations,
    tableau,
    score: Math.max(0, state.score - lastMove.pointsEarned),
    moves: Math.max(0, state.moves - 1),
    status: 'playing',
    history: remainingHistory,
  };
}

/**
 * Automatically advances one eligible card from tableau to foundation if in auto-finish state.
 */
export function autoCompleteStep(state: GameState): GameState | null {
  for (let c = 0; c < state.tableau.length; c++) {
    const col = state.tableau[c];
    if (col.length === 0) continue;
    const topCard = col[col.length - 1];
    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(topCard, state.foundations[f])) {
        return moveCards(state, { type: 'tableau', index: c }, { type: 'foundation', index: f }, [
          topCard.id,
        ]);
      }
    }
  }
  return null;
}
