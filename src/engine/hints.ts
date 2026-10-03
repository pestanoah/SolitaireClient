import { canPlaceOnFoundation, canPlaceOnTableau, hasExhaustedStockCycles, isGameWon } from './rules';
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
 * Evaluates the current game state and returns all legal hints,
 * ordered by strategic priority (e.g. unblocking face-down cards and
 * building foundations ranked ahead of drawing from stock).
 */
export function findAvailableHints(
  state: GameState,
  allowAnyCardOnEmpty = false
): Hint[] {
  if (state.status === 'won' || state.status === 'lost' || isGameWon(state.foundations)) {
    return [];
  }

  const scored: ScoredHint[] = [];

  // 1. Tableau cards to Foundation
  for (let t = 0; t < state.tableau.length; t++) {
    const col = state.tableau[t];
    if (col.length === 0) continue;
    const topCard = col[col.length - 1];

    const suitIndex = FOUNDATION_SUITS.indexOf(topCard.suit);
    if (suitIndex >= 0 && suitIndex < state.foundations.length) {
      if (canPlaceOnFoundation(topCard, state.foundations[suitIndex], suitIndex)) {
        const uncoversCard = col.length >= 2 && !col[col.length - 2].faceUp;
        const isAceOrTwo = topCard.rank <= 2;
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

          // Priority: unblocking face-down card > building on tableau > moving King to empty
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

  // 5. Foundation down to Tableau
  for (let f = 0; f < state.foundations.length; f++) {
    const pile = state.foundations[f];
    if (pile.length === 0) continue;
    const topCard = pile[pile.length - 1];

    for (let t = 0; t < state.tableau.length; t++) {
      const toCol = state.tableau[t];
      if (topCard.rank === 13 && toCol.length === 0) continue;

      if (canPlaceOnTableau(topCard, toCol, allowAnyCardOnEmpty)) {
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

  // 6. Draw from Stock
  if (state.stock.length > 0) {
    scored.push({
      score: 20,
      hint: {
        from: { type: 'stock', index: 0 },
        type: 'draw',
        message: 'Draw from the stock pile',
      },
    });
  }

  // 7. Recycle Waste into Stock
  if (state.stock.length === 0 && state.waste.length > 0 && !hasExhaustedStockCycles(state)) {
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
 * or null if no legal moves exist.
 */
export function findHint(
  state: GameState,
  allowAnyCardOnEmpty = false
): Hint | null {
  const hints = findAvailableHints(state, allowAnyCardOnEmpty);
  return hints.length > 0 ? hints[0] : null;
}
