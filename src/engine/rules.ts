import { Card, FOUNDATION_SUITS, GameState, getCardColor, PileLocation } from './types';

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
 * Returns all cards from the stock/waste deck that could ever appear on top
 * of the waste pile without playing any cards, given the current drawCount.
 * In Draw 1 mode, every card remaining in stock and waste will eventually appear.
 * In Draw 3 mode, only cards that land at the top of the waste (every 3rd card in stock,
 * cycling across passes) can ever be accessed without making board plays.
 */
export function getAccessibleDeckCards(state: GameState): Card[] {
  if (state.stock.length === 0 && state.waste.length === 0) {
    return [];
  }

  // Draw 1: Every card in stock and waste will eventually be exposed at the top of waste
  if (state.drawCount === 1) {
    return [...state.stock, ...state.waste];
  }

  // Draw 3: Simulate passes through the deck to collect all reachable waste-top cards
  const accessible = new Map<string, Card>();
  if (state.waste.length > 0) {
    const topWaste = state.waste[state.waste.length - 1];
    accessible.set(topWaste.id, topWaste);
  }

  let simStock: Card[] = [...state.stock];
  let simWaste: Card[] = [...state.waste];
  const seenStates = new Set<string>();
  let iterations = 0;

  while (iterations++ < 100) {
    if (simStock.length === 0) {
      if (simWaste.length === 0) break;
      // Recycle waste to stock
      simStock = [...simWaste].reverse();
      simWaste = [];
    }

    const count = Math.min(state.drawCount, simStock.length);
    const drawn = simStock.splice(simStock.length - count, count);
    simWaste.push(...drawn);

    const topCard = simWaste[simWaste.length - 1];
    if (topCard) {
      accessible.set(topCard.id, topCard);
    }

    const key = `${simStock.length}_${simWaste.length}_${topCard?.id ?? ''}`;
    if (seenStates.has(key)) {
      break;
    }
    seenStates.add(key);
  }

  return Array.from(accessible.values());
}

interface SearchBoard {
  tableau: Card[][];
  foundations: Card[][];
}

function serializeBoard(tableau: Card[][], foundations: Card[][]): string {
  const fPart = foundations.map((f) => (f.length > 0 ? f[f.length - 1].id : '')).join(',');
  const tPart = tableau
    .map((col) => col.filter((c) => c.faceUp).map((c) => c.id).join('-'))
    .join(';');
  return `${fPart}|${tPart}`;
}

/**
 * Checks if executing a non-directly-advancing move (such as moving already-face-up tableau cards
 * without uncovering a card, or moving a foundation card down to tableau) unlocks a path that
 * advances the game:
 * 1. Uncovers a face-down card in the tableau.
 * 2. Enables moving a card to foundation that could not be moved directly in the current state.
 * 3. Opens a spot to place an accessible deck card that could not be placed directly in the current state.
 */
export function canMoveUnlockAdvancement(
  state: GameState,
  from: PileLocation,
  to: PileLocation,
  cardIds: string[],
  accessibleDeckCards: Card[],
  allowAnyCardOnEmpty: boolean
): boolean {
  let nextTableau: Card[][];
  let nextFoundations: Card[][];

  if (from.type === 'tableau' && to.type === 'tableau') {
    const fromCol = state.tableau[from.index];
    const cardIdx = fromCol.findIndex((c) => c.id === cardIds[0]);
    if (cardIdx === -1) return false;

    const movingCards = fromCol.slice(cardIdx);
    const remainingFrom = fromCol.slice(0, cardIdx);

    nextTableau = state.tableau.map((col, idx) => {
      if (idx === from.index) return remainingFrom;
      if (idx === to.index) return [...col, ...movingCards];
      return col;
    });
    nextFoundations = state.foundations;
  } else if (from.type === 'foundation' && to.type === 'tableau') {
    const pile = state.foundations[from.index];
    if (pile.length === 0) return false;
    const topCard = pile[pile.length - 1];

    // Aces (rank 1) and Twos (rank 2) can never accept cards on tableau or advance the game by moving down
    if (topCard.rank <= 2) return false;

    nextFoundations = state.foundations.map((p, idx) =>
      idx === from.index ? p.slice(0, -1) : p
    );
    nextTableau = state.tableau.map((col, idx) =>
      idx === to.index ? [...col, topCard] : col
    );
  } else {
    return false;
  }

  // Pre-calculate cards already in foundation at the root state
  const initialFoundationCardIds = new Set<string>();
  for (const pile of state.foundations) {
    for (const card of pile) {
      initialFoundationCardIds.add(card.id);
    }
  }

  // Pre-calculate which cards could ALREADY move to foundation directly in `state`
  const directFoundationCardIds = new Set<string>();
  for (const col of state.tableau) {
    if (col.length === 0) continue;
    const top = col[col.length - 1];
    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(top, state.foundations[f], f)) {
        directFoundationCardIds.add(top.id);
      }
    }
  }

  // Pre-calculate which accessible deck cards could ALREADY be placed directly in `state`
  const directPlaceableDeckCardIds = new Set<string>();
  for (const card of accessibleDeckCards) {
    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(card, state.foundations[f], f)) {
        directPlaceableDeckCardIds.add(card.id);
      }
    }
    for (let t = 0; t < state.tableau.length; t++) {
      if (canPlaceOnTableau(card, state.tableau[t], allowAnyCardOnEmpty)) {
        directPlaceableDeckCardIds.add(card.id);
      }
    }
  }

  const initialNode: SearchBoard = { tableau: nextTableau, foundations: nextFoundations };
  const visited = new Set<string>();
  const initialKey = serializeBoard(initialNode.tableau, initialNode.foundations);
  visited.add(initialKey);

  const queue: SearchBoard[] = [initialNode];
  const maxStates = 150;

  while (queue.length > 0 && visited.size < maxStates) {
    const current = queue.shift()!;

    // 1. Can any card in current board uncover a face-down card?
    for (let fromIdx = 0; fromIdx < current.tableau.length; fromIdx++) {
      const fromCol = current.tableau[fromIdx];
      for (let cardIdx = 0; cardIdx < fromCol.length; cardIdx++) {
        const card = fromCol[cardIdx];
        if (!card.faceUp) continue;

        const uncoversFaceDown = cardIdx > 0 && !fromCol[cardIdx - 1].faceUp;
        if (!uncoversFaceDown) continue;

        for (let toIdx = 0; toIdx < current.tableau.length; toIdx++) {
          if (toIdx === fromIdx) continue;
          if (canPlaceOnTableau(card, current.tableau[toIdx], allowAnyCardOnEmpty)) {
            return true;
          }
        }
      }
    }

    // 2. Can any card move to foundation that could NOT move directly in the root state
    // and was NOT already in foundation at the root state?
    for (let t = 0; t < current.tableau.length; t++) {
      const col = current.tableau[t];
      if (col.length === 0) continue;
      const topCard = col[col.length - 1];
      if (directFoundationCardIds.has(topCard.id)) continue;
      if (initialFoundationCardIds.has(topCard.id)) continue;

      for (let f = 0; f < current.foundations.length; f++) {
        if (canPlaceOnFoundation(topCard, current.foundations[f], f)) {
          return true;
        }
      }
    }

    // 3. Can any accessible deck card be placed on current board that could NOT be placed directly in the root state?
    for (const card of accessibleDeckCards) {
      if (directPlaceableDeckCardIds.has(card.id)) continue;

      for (let f = 0; f < current.foundations.length; f++) {
        if (canPlaceOnFoundation(card, current.foundations[f], f)) {
          return true;
        }
      }
      for (let t = 0; t < current.tableau.length; t++) {
        if (canPlaceOnTableau(card, current.tableau[t], allowAnyCardOnEmpty)) {
          return true;
        }
      }
    }

    // Generate further tableau-to-tableau moves that don't uncover cards
    for (let fromIdx = 0; fromIdx < current.tableau.length; fromIdx++) {
      const fromCol = current.tableau[fromIdx];
      for (let cardIdx = 0; cardIdx < fromCol.length; cardIdx++) {
        const card = fromCol[cardIdx];
        if (!card.faceUp) continue;

        const uncoversFaceDown = cardIdx > 0 && !fromCol[cardIdx - 1].faceUp;
        if (uncoversFaceDown) continue;

        for (let toIdx = 0; toIdx < current.tableau.length; toIdx++) {
          if (toIdx === fromIdx) continue;
          const toCol = current.tableau[toIdx];

          if (canPlaceOnTableau(card, toCol, allowAnyCardOnEmpty)) {
            if (card.rank === 13 && cardIdx === 0 && toCol.length === 0) {
              continue;
            }

            const stepTableau = current.tableau.map((col, idx) => {
              if (idx === fromIdx) return col.slice(0, cardIdx);
              if (idx === toIdx) return [...col, ...fromCol.slice(cardIdx)];
              return col;
            });

            const stepKey = serializeBoard(stepTableau, current.foundations);
            if (!visited.has(stepKey)) {
              visited.add(stepKey);
              queue.push({ tableau: stepTableau, foundations: current.foundations });
            }
          }
        }
      }
    }
  }

  return false;
}

/**
 * Checks if there are any moves available in the game that can advance progress toward winning.
 * A move or sequence of moves advances the game if it:
 * 1. Moves a card to a foundation pile.
 * 2. Uncovers a face-down card in the tableau.
 * 3. Plays an accessible card from the stock or waste.
 *
 * Moving cards back and forth between tableau columns without uncovering cards,
 * moving cards from foundation down to tableau without enabling new card reveals,
 * or endlessly cycling through stock when no accessible deck cards can be placed,
 * does NOT count as advancing the game.
 */
export function hasAvailableMoves(state: GameState, allowAnyCardOnEmpty = false): boolean {
  if (state.status === 'won' || state.status === 'lost') {
    return false;
  }
  if (isGameWon(state.foundations)) {
    return false;
  }

  // Fast path 1: Waste top card can move immediately
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

  // Fast path 2: Any tableau card can move to foundation immediately
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

  // Fast path 3: Any tableau move that directly uncovers a face-down card
  for (let fromIdx = 0; fromIdx < state.tableau.length; fromIdx++) {
    const fromCol = state.tableau[fromIdx];
    if (fromCol.length === 0) continue;

    for (let cardIdx = 0; cardIdx < fromCol.length; cardIdx++) {
      const card = fromCol[cardIdx];
      if (!card.faceUp) continue;

      const uncoversFaceDown = cardIdx > 0 && !fromCol[cardIdx - 1].faceUp;
      if (!uncoversFaceDown) continue;

      for (let toIdx = 0; toIdx < state.tableau.length; toIdx++) {
        if (toIdx === fromIdx) continue;
        if (canPlaceOnTableau(card, state.tableau[toIdx], allowAnyCardOnEmpty)) {
          return true;
        }
      }
    }
  }

  // Collect cards from stock/waste that can be accessed
  const accessibleDeckCards = getAccessibleDeckCards(state);

  // Fast path 4: If any accessible deck card can be placed on current board
  for (const card of accessibleDeckCards) {
    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(card, state.foundations[f], f)) {
        return true;
      }
    }
    for (let t = 0; t < state.tableau.length; t++) {
      if (canPlaceOnTableau(card, state.tableau[t], allowAnyCardOnEmpty)) {
        return true;
      }
    }
  }

  // Check if any non-direct tableau-to-tableau move unlocks an advancing sequence
  for (let fromIdx = 0; fromIdx < state.tableau.length; fromIdx++) {
    const fromCol = state.tableau[fromIdx];
    for (let cardIdx = 0; cardIdx < fromCol.length; cardIdx++) {
      const card = fromCol[cardIdx];
      if (!card.faceUp) continue;

      for (let toIdx = 0; toIdx < state.tableau.length; toIdx++) {
        if (toIdx === fromIdx) continue;
        if (card.rank === 13 && cardIdx === 0 && state.tableau[toIdx].length === 0) continue;

        if (canPlaceOnTableau(card, state.tableau[toIdx], allowAnyCardOnEmpty)) {
          if (
            canMoveUnlockAdvancement(
              state,
              { type: 'tableau', index: fromIdx },
              { type: 'tableau', index: toIdx },
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
  }

  // Check if any foundation card (rank > 2) moving down unlocks an advancing sequence
  for (let f = 0; f < state.foundations.length; f++) {
    const pile = state.foundations[f];
    if (pile.length === 0) continue;
    const topCard = pile[pile.length - 1];
    if (topCard.rank <= 2) continue;

    for (let toIdx = 0; toIdx < state.tableau.length; toIdx++) {
      if (topCard.rank === 13 && state.tableau[toIdx].length === 0) continue;

      if (canPlaceOnTableau(topCard, state.tableau[toIdx], allowAnyCardOnEmpty)) {
        if (
          canMoveUnlockAdvancement(
            state,
            { type: 'foundation', index: f },
            { type: 'tableau', index: toIdx },
            [topCard.id],
            accessibleDeckCards,
            allowAnyCardOnEmpty
          )
        ) {
          return true;
        }
      }
    }
  }

  // All moves exhausted with zero advancing moves possible
  return false;
}

