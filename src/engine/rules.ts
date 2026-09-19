import { Card, GameState, getCardColor } from './types';

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
 * - If pile is empty: only an Ace (rank 1) can be placed.
 * - If pile has cards: same suit, and rank must be exactly 1 higher.
 */
export function canPlaceOnFoundation(card: Card, foundationPile: Card[]): boolean {
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
 * Checks if the game is in an "auto-finishable" state:
 * - Stock and waste are completely empty.
 * - Every single card remaining in the tableau columns is face-up.
 */
export function canAutoComplete(state: GameState): boolean {
  if (state.stock.length > 0 || state.waste.length > 0) {
    return false;
  }

  for (const col of state.tableau) {
    for (const card of col) {
      if (!card.faceUp) {
        return false;
      }
    }
  }

  return true;
}
