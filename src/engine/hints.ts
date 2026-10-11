import {
  canMoveUnlockAdvancement,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  getAccessibleDeckCards,
  hasAvailableMoves,
  hasExhaustedStockCycles,
  isGameWon,
} from './rules';
import { Card, FOUNDATION_SUITS, GameState, PileLocation } from './types';

export interface Hint {
  from: PileLocation;
  to?: PileLocation;
  cardIds?: string[];
  type: 'move' | 'draw' | 'recycle';
  message: string;
}

interface ScoredHint {
  hint: Hint;
  score: number;
}

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const RANK_LABELS: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export function formatCardShort(card: Card): string {
  const rank = RANK_LABELS[card.rank] ?? card.rank.toString();
  const suit = SUIT_SYMBOLS[card.suit] ?? card.suit;
  return `${rank}${suit}`;
}

/**
 * Checks if moving a card from tableau column `tableauIndex` to foundation
 * would directly reverse the most recent move of that card.
 */
function isReversingFoundationMove(
  state: GameState,
  cardId: string,
  tableauIndex: number
): boolean {
  if (!state.history || state.history.length === 0) return false;
  for (let i = state.history.length - 1; i >= 0; i--) {
    const move = state.history[i];
    if (move.cardIds.includes(cardId)) {
      return (
        move.from.type === 'foundation' &&
        move.to.type === 'tableau' &&
        move.to.index === tableauIndex
      );
    }
  }
  return false;
}

/**
 * Checks if moving a card from foundation pile to tableau column `tableauIndex`
 * would directly reverse the most recent move of that card.
 */
function isReversingTableauMove(
  state: GameState,
  cardId: string,
  tableauIndex: number
): boolean {
  if (!state.history || state.history.length === 0) return false;
  for (let i = state.history.length - 1; i >= 0; i--) {
    const move = state.history[i];
    if (move.cardIds.includes(cardId)) {
      return (
        move.from.type === 'tableau' &&
        move.from.index === tableauIndex &&
        move.to.type === 'foundation'
      );
    }
  }
  return false;
}

/**
 * Checks if a tableau card (at the top of targetColIdx) can currently receive a card
 * from the waste pile or from another tableau column that advances the game.
 * If true, moving targetCard to foundation would destroy that advancing opportunity.
 */
function canReceiveAdvancingCard(
  state: GameState,
  targetColIdx: number,
  targetCard: Card,
  allowAnyCardOnEmpty: boolean,
  accessibleDeckCards: Card[]
): boolean {
  // 1. Can the currently visible top waste card be placed onto targetCard?
  if (state.waste.length > 0) {
    const topWaste = state.waste[state.waste.length - 1];
    if (canPlaceOnTableau(topWaste, state.tableau[targetColIdx], allowAnyCardOnEmpty)) {
      return true;
    }
  }

  // 2. Can any tableau card be moved onto targetCard that advances the game?
  for (let fromIdx = 0; fromIdx < state.tableau.length; fromIdx++) {
    if (fromIdx === targetColIdx) continue;
    const fromCol = state.tableau[fromIdx];
    for (let cardIdx = 0; cardIdx < fromCol.length; cardIdx++) {
      const card = fromCol[cardIdx];
      if (!card.faceUp) continue;

      if (canPlaceOnTableau(card, state.tableau[targetColIdx], allowAnyCardOnEmpty)) {
        const uncoversCard = cardIdx > 0 && !fromCol[cardIdx - 1].faceUp;
        if (uncoversCard) return true;

        if (
          canMoveUnlockAdvancement(
            state,
            { type: 'tableau', index: fromIdx },
            { type: 'tableau', index: targetColIdx },
            [card.id],
            accessibleDeckCards,
            allowAnyCardOnEmpty
          )
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Fast-path check for direct advancing moves that require zero search / BFS:
 * - Waste card directly to foundation or tableau
 * - Tableau card directly to foundation
 * - Tableau move that directly uncovers a face-down card
 */
function hasDirectAdvancingMove(
  state: GameState,
  allowAnyCardOnEmpty = false
): boolean {
  // 1. Waste card to foundation or tableau
  if (state.waste.length > 0) {
    const topWaste = state.waste[state.waste.length - 1];
    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(topWaste, state.foundations[f], f)) return true;
    }
    for (let t = 0; t < state.tableau.length; t++) {
      if (canPlaceOnTableau(topWaste, state.tableau[t], allowAnyCardOnEmpty)) return true;
    }
  }

  // 2. Tableau cards to foundation (ignoring un-advancing reversals)
  for (let t = 0; t < state.tableau.length; t++) {
    const col = state.tableau[t];
    if (col.length === 0) continue;
    const topCard = col[col.length - 1];
    if (isReversingFoundationMove(state, topCard.id, t)) continue;
    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(topCard, state.foundations[f], f)) return true;
    }
  }

  // 3. Tableau move directly uncovering a face-down card
  for (let fromIdx = 0; fromIdx < state.tableau.length; fromIdx++) {
    const fromCol = state.tableau[fromIdx];
    if (fromCol.length === 0) continue;

    for (let cardIdx = 0; cardIdx < fromCol.length; cardIdx++) {
      const card = fromCol[cardIdx];
      if (!card.faceUp) continue;

      const uncoversCard = cardIdx > 0 && !fromCol[cardIdx - 1].faceUp;
      if (!uncoversCard) continue;

      for (let toIdx = 0; toIdx < state.tableau.length; toIdx++) {
        if (toIdx === fromIdx) continue;
        if (canPlaceOnTableau(card, state.tableau[toIdx], allowAnyCardOnEmpty)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Evaluates the current game state and returns all legal hints that ADVANCE the game,
 * ordered by strategic priority (e.g. unblocking face-down cards and
 * building foundations ranked ahead of drawing from stock).
 * Does not suggest moves that merely shuffle cards back and forth without unlocking progress.
 */
export function findAvailableHints(
  state: GameState,
  allowAnyCardOnEmpty = false
): Hint[] {
  if (
    state.status === 'won' ||
    state.status === 'lost' ||
    isGameWon(state.foundations)
  ) {
    return [];
  }

  // Fast-path: if any direct advancing moves exist, do not call hasAvailableMoves.
  // Only fall back to hasAvailableMoves when no direct moves are found to determine if non-direct sequences exist.
  if (!hasDirectAdvancingMove(state, allowAnyCardOnEmpty)) {
    if (!hasAvailableMoves(state, allowAnyCardOnEmpty)) {
      return [];
    }
  }

  const scored: ScoredHint[] = [];
  const accessibleDeckCards = getAccessibleDeckCards(state);
  const anyDeckCardPlayable = accessibleDeckCards.some((card) => {
    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(card, state.foundations[f], f)) return true;
    }
    for (let t = 0; t < state.tableau.length; t++) {
      if (canPlaceOnTableau(card, state.tableau[t], allowAnyCardOnEmpty)) return true;
    }
    // Also check if card could be placed on a foundation card that can legally move down to tableau
    for (let f = 0; f < state.foundations.length; f++) {
      const pile = state.foundations[f];
      if (pile.length === 0) continue;
      const topFoundation = pile[pile.length - 1];
      if (topFoundation.rank <= 2) continue;

      for (let t = 0; t < state.tableau.length; t++) {
        const toCol = state.tableau[t];
        if (topFoundation.rank === 13 && toCol.length === 0) continue;
        if (canPlaceOnTableau(topFoundation, toCol, allowAnyCardOnEmpty)) {
          if (canPlaceOnTableau(card, [topFoundation], allowAnyCardOnEmpty)) {
            return true;
          }
        }
      }
    }
    return false;
  });

  // 1. Tableau cards to Foundation
  for (let t = 0; t < state.tableau.length; t++) {
    const col = state.tableau[t];
    if (col.length === 0) continue;
    const topCard = col[col.length - 1];

    const suitIndex = FOUNDATION_SUITS.indexOf(topCard.suit);
    if (suitIndex >= 0 && suitIndex < state.foundations.length) {
      if (canPlaceOnFoundation(topCard, state.foundations[suitIndex], suitIndex)) {
        // Prevent immediate reversal of foundation-to-tableau moves
        if (isReversingFoundationMove(state, topCard.id, t)) {
          continue;
        }

        const uncoversCard = col.length >= 2 && !col[col.length - 2].faceUp;
        const isAceOrTwo = topCard.rank <= 2;

        // If rank > 2 and does not uncover a card, avoid moving to foundation
        // if an available waste or advancing tableau card can be placed onto it
        if (!isAceOrTwo && !uncoversCard) {
          if (canReceiveAdvancingCard(state, t, topCard, allowAnyCardOnEmpty, accessibleDeckCards)) {
            continue;
          }
        }

        const score = isAceOrTwo ? 100 : uncoversCard ? 90 : 70;

        scored.push({
          score,
          hint: {
            from: { type: 'tableau', index: t },
            to: { type: 'foundation', index: suitIndex },
            cardIds: [topCard.id],
            type: 'move',
            message: `Move ${formatCardShort(topCard)} to Foundation`,
          },
        });
      }
    }
  }

  // 2. Waste card to Foundation
  if (state.waste.length > 0) {
    const topWaste = state.waste[state.waste.length - 1];
    const suitIndex = FOUNDATION_SUITS.indexOf(topWaste.suit);
    if (suitIndex >= 0 && suitIndex < state.foundations.length) {
      if (canPlaceOnFoundation(topWaste, state.foundations[suitIndex], suitIndex)) {
        const score = topWaste.rank <= 2 ? 95 : 65;
        scored.push({
          score,
          hint: {
            from: { type: 'waste', index: 0 },
            to: { type: 'foundation', index: suitIndex },
            cardIds: [topWaste.id],
            type: 'move',
            message: `Move ${formatCardShort(topWaste)} to Foundation`,
          },
        });
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
          // Avoid redundant King move between empty columns
          if (card.rank === 13 && cardIdx === 0 && toCol.length === 0) {
            continue;
          }

          const cardsToMove = fromCol.slice(cardIdx);
          const uncoversCard = cardIdx > 0 && !fromCol[cardIdx - 1].faceUp;
          const targetCard = toCol.length > 0 ? toCol[toCol.length - 1] : null;

          // Only include if this move directly uncovers a card OR unlocks a subsequent advancement
          if (
            !uncoversCard &&
            !canMoveUnlockAdvancement(
              state,
              { type: 'tableau', index: fromIdx },
              { type: 'tableau', index: toIdx },
              [card.id],
              accessibleDeckCards,
              allowAnyCardOnEmpty
            )
          ) {
            continue;
          }

          let score = 50;
          if (uncoversCard) {
            score = 85;
          } else if (card.rank === 13 && toCol.length === 0) {
            score = 55;
          } else if (toCol.length > 0) {
            score = 60;
          }

          const targetDesc = targetCard ? formatCardShort(targetCard) : 'empty column';
          scored.push({
            score,
            hint: {
              from: { type: 'tableau', index: fromIdx },
              to: { type: 'tableau', index: toIdx },
              cardIds: cardsToMove.map((c) => c.id),
              type: 'move',
              message: `Move ${formatCardShort(card)} onto ${targetDesc}`,
            },
          });
        }
      }
    }
  }

  // 4. Waste card to Tableau
  if (state.waste.length > 0) {
    const topWaste = state.waste[state.waste.length - 1];
    for (let toIdx = 0; toIdx < state.tableau.length; toIdx++) {
      const toCol = state.tableau[toIdx];
      if (canPlaceOnTableau(topWaste, toCol, allowAnyCardOnEmpty)) {
        const targetCard = toCol.length > 0 ? toCol[toCol.length - 1] : null;
        const targetDesc = targetCard ? formatCardShort(targetCard) : 'empty column';
        const score = toCol.length > 0 ? 62 : 54;

        scored.push({
          score,
          hint: {
            from: { type: 'waste', index: 0 },
            to: { type: 'tableau', index: toIdx },
            cardIds: [topWaste.id],
            type: 'move',
            message: `Move ${formatCardShort(topWaste)} onto ${targetDesc}`,
          },
        });
      }
    }
  }

  // 5. Foundation down to Tableau (only if it unlocks uncovering a card or playing immediately accessible waste cards)
  const immediatelyPlayableDeckCards =
    state.waste.length > 0 ? [state.waste[state.waste.length - 1]] : [];

  for (let f = 0; f < state.foundations.length; f++) {
    const pile = state.foundations[f];
    if (pile.length === 0) continue;
    const topCard = pile[pile.length - 1];

    // Aces and Twos should NEVER be moved down from foundation
    if (topCard.rank <= 2) continue;

    for (let t = 0; t < state.tableau.length; t++) {
      const toCol = state.tableau[t];
      if (topCard.rank === 13 && toCol.length === 0) continue;

      // Prevent immediate reversal of tableau-to-foundation moves
      if (isReversingTableauMove(state, topCard.id, t)) {
        continue;
      }

      if (canPlaceOnTableau(topCard, toCol, allowAnyCardOnEmpty)) {
        if (
          !canMoveUnlockAdvancement(
            state,
            { type: 'foundation', index: f },
            { type: 'tableau', index: t },
            [topCard.id],
            immediatelyPlayableDeckCards,
            allowAnyCardOnEmpty
          )
        ) {
          continue;
        }

        const targetDesc = toCol.length > 0 ? formatCardShort(toCol[toCol.length - 1]) : 'empty column';
        scored.push({
          score: 30,
          hint: {
            from: { type: 'foundation', index: f },
            to: { type: 'tableau', index: t },
            cardIds: [topCard.id],
            type: 'move',
            message: `Move ${formatCardShort(topCard)} down onto ${targetDesc}`,
          },
        });
      }
    }
  }

  // 6. Draw from Stock (only if accessible deck cards can advance the game)
  if (state.stock.length > 0 && anyDeckCardPlayable) {
    scored.push({
      score: 20,
      hint: {
        from: { type: 'stock', index: 0 },
        type: 'draw',
        message: 'Draw from the stock pile',
      },
    });
  }

  // 7. Recycle Waste into Stock (only if accessible deck cards can advance the game)
  if (
    state.stock.length === 0 &&
    state.waste.length > 0 &&
    !hasExhaustedStockCycles(state) &&
    anyDeckCardPlayable
  ) {
    scored.push({
      score: 10,
      hint: {
        from: { type: 'waste', index: 0 },
        to: { type: 'stock', index: 0 },
        type: 'recycle',
        message: 'Reset waste back to stock',
      },
    });
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((item) => item.hint);
}

/**
 * Returns the highest-priority legal hint for the current game state,
 * or null if no legal moves exist that advance the game.
 */
export function findHint(
  state: GameState,
  allowAnyCardOnEmpty = false
): Hint | null {
  const hints = findAvailableHints(state, allowAnyCardOnEmpty);
  return hints.length > 0 ? hints[0] : null;
}
