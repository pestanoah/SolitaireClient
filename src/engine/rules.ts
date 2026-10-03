import { Card, FOUNDATION_SUITS, GameState, getCardColor } from './types';

/**
 * Checks if a card (or stack of cards represented by its top card) can be placed
 * onto a tableau column according to Klondike rules:
 * - If column is empty: only a King (rank 13) can be placed.
 * - If column has cards: top card must be face-up, opposite color, and rank must be exactly 1 lower.
 */
export function canPlaceOnTableau(
  card: Card,
  targetColumn: Card[],
  allowAnyCardOnEmpty = false
): boolean {
  if (targetColumn.length === 0) {
    return allowAnyCardOnEmpty || card.rank === 13; // King (or any card if relaxed rule enabled)
  }

  const topCard = targetColumn[targetColumn.length - 1];
  if (!topCard.faceUp) {
    return false;
  }

  const isOppositeColor = getCardColor(card.suit) !== getCardColor(topCard.suit);
  const isOneRankLower = card.rank === topCard.rank - 1;

  return isOppositeColor && isOneRankLower;
}

/**
 * Checks if a card can be placed onto a foundation pile:
 * - If foundationIndex is provided: card suit must match the designated suit for that pile.
 * - If pile is empty: only an Ace (rank 1) can be placed.
 * - If pile has cards: same suit, and rank must be exactly 1 higher.
 */
export function canPlaceOnFoundation(
  card: Card,
  foundationPile: Card[],
  foundationIndex?: number
): boolean {
  if (foundationIndex !== undefined && foundationIndex >= 0) {
    const expectedSuit = FOUNDATION_SUITS[foundationIndex % FOUNDATION_SUITS.length];
    if (card.suit !== expectedSuit) {
      return false;
    }
  }

  if (foundationPile.length === 0) {
    return card.rank === 1; // Ace
  }

  const topCard = foundationPile[foundationPile.length - 1];
  return card.suit === topCard.suit && card.rank === topCard.rank + 1;
}

/**
 * Checks if all 4 foundations are completely filled (13 cards in each of 4 piles = 52 total).
 */
export function isGameWon(foundations: Card[][]): boolean {
  if (foundations.length < 4) return false;
  const totalInFoundations = foundations.reduce((acc, pile) => acc + pile.length, 0);
  return totalInFoundations === 52;
}

/**
 * Checks if all cards remaining in the tableau columns are face-up (uncovered).
 */
export function areAllTableauCardsUncovered(tableau: Card[][]): boolean {
  for (const col of tableau) {
    for (const card of col) {
      if (!card.faceUp) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Checks if the game is in an "auto-finishable" state:
 * - Every single card remaining in the tableau columns is face-up (uncovered).
 * - The game is active (not won or lost) and not deadlocked.
 */
export function canAutoComplete(state: GameState): boolean {
  if (state.status === 'won' || state.status === 'lost') {
    return false;
  }
  if (isGameWon(state.foundations)) {
    return false;
  }

  if (!areAllTableauCardsUncovered(state.tableau)) {
    return false;
  }

  // If there are cards remaining in stock or waste, verify there are still available moves
  if (state.stock.length > 0 || state.waste.length > 0) {
    if (!hasAvailableMoves(state)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether the stock and waste cycle has been exhausted without making any
 * moves to the tableau or foundations.
 * In Draw 1, cycling the entire stock once without any board moves means all remaining
 * stock/waste cards have been seen and cannot be played on the current board.
 * In Draw 3, it takes up to drawCount (3) complete passes to see all card alignments.
 */
export function hasExhaustedStockCycles(state: GameState): boolean {
  if (state.stock.length > 0) return false;
  if (state.waste.length === 0) return true;

  let recyclesSinceBoardMove = 0;
  for (let i = state.history.length - 1; i >= 0; i--) {
    const move = state.history[i];
    if (move.to.type === 'tableau' || move.to.type === 'foundation') {
      break;
    }
    if (move.from.type === 'waste' && move.to.type === 'stock') {
      recyclesSinceBoardMove++;
    }
  }

  return recyclesSinceBoardMove >= state.drawCount;
}

/**
 * Checks if there are any legal, productive moves available in the current game state:
 * 1. Waste top card -> any foundation pile or tableau column
 * 2. Tableau top card -> any foundation pile
 * 3. Tableau face-up card/stack -> another tableau column (excluding moving a base King to an empty column)
 * 4. Foundation top card -> any tableau column
 * 5. Stock draws / waste recycle:
 *    - If no card in stock/waste can ever be placed on any tableau or foundation pile,
 *      no draw can ever produce a playable card.
 *    - If stock is empty and waste has been cycled through without any board moves,
 *      no further plays can be made from stock/waste.
 */
export function hasAvailableMoves(state: GameState, allowAnyCardOnEmpty = false): boolean {
  if (state.status === 'won' || state.status === 'lost') {
    return false;
  }
  if (isGameWon(state.foundations)) {
    return false;
  }

  // 1. Waste top card
  if (state.waste.length > 0) {
    const topWaste = state.waste[state.waste.length - 1];
    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(topWaste, state.foundations[f], f)) {
        return true;
      }
    }
    for (let t = 0; t < state.tableau.length; t++) {
      if (canPlaceOnTableau(topWaste, state.tableau[t], allowAnyCardOnEmpty)) {
        return true;
      }
    }
  }

  // 2. Tableau to Foundations
  for (let t = 0; t < state.tableau.length; t++) {
    const col = state.tableau[t];
    if (col.length === 0) continue;
    const topCard = col[col.length - 1];
    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(topCard, state.foundations[f], f)) {
        return true;
      }
    }
  }

  // 3. Tableau to Tableau
  for (let fromIdx = 0; fromIdx < state.tableau.length; fromIdx++) {
    const fromCol = state.tableau[fromIdx];
    if (fromCol.length === 0) continue;

    for (let cardIdx = 0; cardIdx < fromCol.length; cardIdx++) {
      const card = fromCol[cardIdx];
      if (!card.faceUp) continue;

      for (let toIdx = 0; toIdx < state.tableau.length; toIdx++) {
        if (toIdx === fromIdx) continue;
        const toCol = state.tableau[toIdx];

        if (canPlaceOnTableau(card, toCol, allowAnyCardOnEmpty)) {
          // Exclude redundant no-op move: King already at index 0 of its column moving to an empty column
          if (card.rank === 13 && cardIdx === 0 && toCol.length === 0) {
            continue;
          }
          return true;
        }
      }
    }
  }

  // 4. Foundation down to Tableau
  for (let f = 0; f < state.foundations.length; f++) {
    const pile = state.foundations[f];
    if (pile.length === 0) continue;
    const topCard = pile[pile.length - 1];
    for (let t = 0; t < state.tableau.length; t++) {
      const toCol = state.tableau[t];
      if (topCard.rank === 13 && toCol.length === 0) continue;
      if (canPlaceOnTableau(topCard, toCol, allowAnyCardOnEmpty)) {
        return true;
      }
    }
  }

  // 5. Check if stock or waste has ANY card that could be placed on any tableau or foundation
  const remainingDeckCards = [...state.stock, ...state.waste];
  if (remainingDeckCards.length === 0) {
    return false;
  }

  let anyCardPlaceable = false;
  for (const card of remainingDeckCards) {
    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(card, state.foundations[f], f)) {
        anyCardPlaceable = true;
        break;
      }
    }
    if (anyCardPlaceable) break;

    for (let t = 0; t < state.tableau.length; t++) {
      if (canPlaceOnTableau(card, state.tableau[t], allowAnyCardOnEmpty)) {
        anyCardPlaceable = true;
        break;
      }
    }
    if (anyCardPlaceable) break;
  }

  if (!anyCardPlaceable) {
    return false;
  }

  // If there are cards in stock, drawing is an available action
  if (state.stock.length > 0) {
    return true;
  }

  // If stock is empty and recycling is exhausted
  if (hasExhaustedStockCycles(state)) {
    return false;
  }

  return true;
}

