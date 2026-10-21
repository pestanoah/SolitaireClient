import {
  canMoveUnlockAdvancement,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  getAccessibleDeckCards,
  hasAvailableMoves,
  hasExhaustedStockCycles,
  isGameWon,
  isReversingFoundationMove,
  isReversingTableauMove,
} from './rules';
import { Card, FOUNDATION_SUITS, GameState, MoveRecord, PileLocation } from './types';
import { checkWinnable } from './solver';

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
    state.status !== 'playing' ||
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

          const emptiesColumn = cardIdx === 0;
          let score = 50;
          if (uncoversCard) {
            score = 85;
          } else if (emptiesColumn) {
            score = 75;
          } else if (card.rank === 13 && toCol.length === 0) {
            score = 65;
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
    const wasteSuitIndex = FOUNDATION_SUITS.indexOf(topWaste.suit);
    const canAlsoMoveToFoundation =
      wasteSuitIndex >= 0 &&
      wasteSuitIndex < state.foundations.length &&
      canPlaceOnFoundation(topWaste, state.foundations[wasteSuitIndex], wasteSuitIndex);

    for (let toIdx = 0; toIdx < state.tableau.length; toIdx++) {
      const toCol = state.tableau[toIdx];
      if (canPlaceOnTableau(topWaste, toCol, allowAnyCardOnEmpty)) {
        const targetCard = toCol.length > 0 ? toCol[toCol.length - 1] : null;
        const targetDesc = targetCard ? formatCardShort(targetCard) : 'empty column';
        // Playing waste card to tableau is prioritized below tableau reorganization moves
        // so that players uncover face-down cards, empty columns, and consolidate sequences first.
        // However, if the card can also move to foundation, moving to tableau yields +5 pts while
        // remaining eligible for +10 pts foundation later (+15 total vs +10 directly).
        let score = toCol.length > 0 ? 45 : 42;
        if (toCol.length > 0 && canAlsoMoveToFoundation) {
          score = topWaste.rank <= 2 ? 97 : 67;
        } else if (topWaste.rank === 13 && toCol.length === 0) {
          score = 50;
        }

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

/**
 * Searches the entire game state to find a card object by its unique ID.
 */
function findCardById(state: GameState, cardId: string): Card | null {
  for (const col of state.tableau) {
    for (const c of col) {
      if (c.id === cardId) return c;
    }
  }
  for (const c of state.waste) {
    if (c.id === cardId) return c;
  }
  for (const c of state.stock) {
    if (c.id === cardId) return c;
  }
  for (const pile of state.foundations) {
    for (const c of pile) {
      if (c.id === cardId) return c;
    }
  }
  return null;
}

/**
 * Translates a solver MoveRecord into a player-facing Hint object with human-readable
 * action descriptions and precise source/destination pile coordinates.
 */
export function moveRecordToHint(state: GameState, move: MoveRecord): Hint | null {
  // 1. Draw from stock
  if (move.from.type === 'stock' && move.to.type === 'waste') {
    return {
      from: { type: 'stock', index: 0 },
      type: 'draw',
      message: 'Draw from the stock pile',
    };
  }

  // 2. Recycle waste to stock
  if (move.from.type === 'waste' && move.to.type === 'stock') {
    return {
      from: { type: 'waste', index: 0 },
      to: { type: 'stock', index: 0 },
      type: 'recycle',
      message: 'Reset waste back to stock',
    };
  }

  // 3. Move from stock or waste
  if (move.from.type === 'waste' || move.from.type === 'stock') {
    const cardId = move.cardIds[0];
    const topWaste = state.waste.length > 0 ? state.waste[state.waste.length - 1] : null;

    // If the required card is not currently at the top of the waste, the player must draw toward it
    if (!topWaste || topWaste.id !== cardId) {
      if (state.stock.length > 0) {
        return {
          from: { type: 'stock', index: 0 },
          type: 'draw',
          message: 'Draw from the stock pile',
        };
      } else if (state.waste.length > 0) {
        return {
          from: { type: 'waste', index: 0 },
          to: { type: 'stock', index: 0 },
          type: 'recycle',
          message: 'Reset waste back to stock',
        };
      }
      return null;
    }

    const card = topWaste;
    if (move.to.type === 'foundation') {
      return {
        from: { type: 'waste', index: 0 },
        to: move.to,
        cardIds: [card.id],
        type: 'move',
        message: `Move ${formatCardShort(card)} to Foundation`,
      };
    } else if (move.to.type === 'tableau') {
      const toCol = state.tableau[move.to.index];
      const targetCard = toCol && toCol.length > 0 ? toCol[toCol.length - 1] : null;
      const targetDesc = targetCard ? formatCardShort(targetCard) : 'empty column';
      return {
        from: { type: 'waste', index: 0 },
        to: move.to,
        cardIds: [card.id],
        type: 'move',
        message: `Move ${formatCardShort(card)} onto ${targetDesc}`,
      };
    }
  }

  // 4. Move from tableau
  if (move.from.type === 'tableau') {
    const card = findCardById(state, move.cardIds[0]);
    if (!card) return null;

    if (move.to.type === 'foundation') {
      return {
        from: move.from,
        to: move.to,
        cardIds: [card.id],
        type: 'move',
        message: `Move ${formatCardShort(card)} to Foundation`,
      };
    } else if (move.to.type === 'tableau') {
      const toCol = state.tableau[move.to.index];
      const targetCard = toCol && toCol.length > 0 ? toCol[toCol.length - 1] : null;
      const targetDesc = targetCard ? formatCardShort(targetCard) : 'empty column';
      return {
        from: move.from,
        to: move.to,
        cardIds: move.cardIds,
        type: 'move',
        message: `Move ${formatCardShort(card)} onto ${targetDesc}`,
      };
    }
  }

  // 5. Move from foundation down to tableau
  if (move.from.type === 'foundation' && move.to.type === 'tableau') {
    const card = findCardById(state, move.cardIds[0]);
    if (!card) return null;
    const toCol = state.tableau[move.to.index];
    const targetCard = toCol && toCol.length > 0 ? toCol[toCol.length - 1] : null;
    const targetDesc = targetCard ? formatCardShort(targetCard) : 'empty column';
    return {
      from: move.from,
      to: move.to,
      cardIds: [card.id],
      type: 'move',
      message: `Move ${formatCardShort(card)} down onto ${targetDesc}`,
    };
  }

  return null;
}

export interface OptimalHintResult {
  hint: Hint;
  isWinningPath: boolean;
}

/**
 * Finds an optimal hint for the current game state by querying the A* solver
 * within a fast budget (default 250ms). If a proven winning path is found,
 * returns the exact first move of that winning path ('isWinningPath: true').
 * Otherwise, seamlessly falls back to the strategic 1-step heuristic.
 */
export async function findOptimalHint(
  state: GameState,
  options: {
    timeoutMs?: number;
    maxStates?: number;
    allowAnyCardOnEmpty?: boolean;
  } = {}
): Promise<OptimalHintResult | null> {
  const timeoutMs = options.timeoutMs ?? 250;
  const maxStates = options.maxStates ?? 10000;
  const allowAnyCardOnEmpty = options.allowAnyCardOnEmpty ?? false;

  if (state.status !== 'playing' || isGameWon(state.foundations)) {
    return null;
  }

  // 1. Query the bounded A* solver
  try {
    const result = await checkWinnable(state, {
      timeoutMs,
      maxStates,
      allowAnyCardOnEmpty,
    });

    if (result.status === 'winnable' && result.solutionMoves && result.solutionMoves.length > 0) {
      const solverMove = result.solutionMoves[0];
      const isDeckMove =
        solverMove.from.type === 'stock' ||
        solverMove.from.type === 'waste';

      // If the solver suggests drawing or playing from waste, but there is an immediate,
      // productive tableau move available on the board (uncovering a card, clearing a column,
      // or promoting to foundation), prioritize the visible tableau advancement first.
      if (isDeckMove) {
        const topHeuristic = findHint(state, allowAnyCardOnEmpty);
        if (topHeuristic && topHeuristic.from.type === 'tableau') {
          return {
            hint: topHeuristic,
            isWinningPath: true,
          };
        }
      }

      const hint = moveRecordToHint(state, solverMove);
      if (hint) {
        return {
          hint,
          isWinningPath: true,
        };
      }
    }
  } catch {
    // Seamless fallback to heuristic on any solver error
  }

  // 2. Fallback to strategic 1-step heuristic
  const heuristicHint = findHint(state, allowAnyCardOnEmpty);
  if (heuristicHint) {
    return {
      hint: heuristicHint,
      isWinningPath: false,
    };
  }

  return null;
}

