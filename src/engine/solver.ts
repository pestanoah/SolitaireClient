import { Card, FOUNDATION_SUITS, GameState, getCardColor, MoveRecord, PileLocation, Suit } from './types';
import {
  canPlaceOnFoundation,
  canPlaceOnTableau,
  getAccessibleDeckCards,
  hasAvailableMoves,
  hasExhaustedStockCycles,
  hasLegalMoves,
  isGameWon,
} from './rules';
import { autoCompleteStep, drawCards, moveCards } from './klondike';

export type SolverStatus = 'winnable' | 'unwinnable' | 'timeout';

export interface SolverOptions {
  maxStates?: number;
  timeoutMs?: number;
  maxDepth?: number;
  allowAnyCardOnEmpty?: boolean;
}

export interface SolverResult {
  status: SolverStatus;
  statesEvaluated: number;
  durationMs: number;
  solutionMoves?: MoveRecord[];
}

/**
 * Returns the highest card rank currently in the foundation for a given suit.
 */
function getFoundationRankForSuit(foundations: Card[][], suit: Suit): number {
  const idx = FOUNDATION_SUITS.indexOf(suit);
  if (idx === -1 || !foundations[idx] || foundations[idx].length === 0) {
    return 0;
  }
  return foundations[idx][foundations[idx].length - 1].rank;
}

/**
 * Checks whether a card can be safely promoted to foundation without sacrificing winnability.
 * - Aces (rank 1) and Twos (rank 2) are always safe.
 * - Rank R >= 3 is safe if both foundations of the opposite color have reached at least rank R - 1.
 */
export function isSafeFoundationMove(card: Card, foundations: Card[][]): boolean {
  if (card.rank <= 2) {
    return true;
  }

  const color = getCardColor(card.suit);
  const oppositeSuits: Suit[] =
    color === 'red' ? ['spades', 'clubs'] : ['hearts', 'diamonds'];

  for (const oppSuit of oppositeSuits) {
    const oppRank = getFoundationRankForSuit(foundations, oppSuit);
    if (oppRank < card.rank - 1) {
      return false;
    }
  }

  return true;
}

/**
 * Greedily and repeatedly promotes all safe cards to the foundations until quiescence.
 * This collapses the search space dramatically without missing any winning paths.
 */
export function applySafeFoundationMoves(
  state: GameState,
  accumulatedMoves: MoveRecord[] = []
): { state: GameState; moves: MoveRecord[] } {
  let current = state;
  let madeMove = true;
  const moves = [...accumulatedMoves];

  while (madeMove && !isGameWon(current.foundations)) {
    madeMove = false;

    // 1. Check top card of each tableau column
    for (let c = 0; c < current.tableau.length; c++) {
      const col = current.tableau[c];
      if (col.length === 0) continue;
      const topCard = col[col.length - 1];
      const targetFIndex = FOUNDATION_SUITS.indexOf(topCard.suit);

      if (
        targetFIndex >= 0 &&
        targetFIndex < current.foundations.length &&
        canPlaceOnFoundation(topCard, current.foundations[targetFIndex], targetFIndex) &&
        isSafeFoundationMove(topCard, current.foundations)
      ) {
        const next = moveCards(
          current,
          { type: 'tableau', index: c },
          { type: 'foundation', index: targetFIndex },
          [topCard.id]
        );
        if (next) {
          const lastMove = next.history[next.history.length - 1];
          moves.push(lastMove);
          current = next;
          madeMove = true;
          break;
        }
      }
    }

    if (madeMove) continue;

    // 2. Check top card of waste
    if (current.waste.length > 0) {
      const topWaste = current.waste[current.waste.length - 1];
      const targetFIndex = FOUNDATION_SUITS.indexOf(topWaste.suit);

      if (
        targetFIndex >= 0 &&
        targetFIndex < current.foundations.length &&
        canPlaceOnFoundation(topWaste, current.foundations[targetFIndex], targetFIndex) &&
        isSafeFoundationMove(topWaste, current.foundations)
      ) {
        const next = moveCards(
          current,
          { type: 'waste', index: 0 },
          { type: 'foundation', index: targetFIndex },
          [topWaste.id]
        );
        if (next) {
          const lastMove = next.history[next.history.length - 1];
          moves.push(lastMove);
          current = next;
          madeMove = true;
        }
      }
    }

    if (madeMove) continue;

    // 3. Any accessible card in stock or waste can be safely promoted
    const deckCards =
      current.drawCount === 1
        ? [...current.stock, ...current.waste]
        : getAccessibleDeckCards(current);

    for (const card of deckCards) {
      const targetFIndex = FOUNDATION_SUITS.indexOf(card.suit);
      if (
        targetFIndex >= 0 &&
        targetFIndex < current.foundations.length &&
        canPlaceOnFoundation(card, current.foundations[targetFIndex], targetFIndex) &&
        isSafeFoundationMove(card, current.foundations)
      ) {
        const played = playCardFromDeck(
          current,
          card.id,
          { type: 'foundation', index: targetFIndex },
          false
        );
        if (played) {
          moves.push(...played.moves);
          current = played.nextState;
          madeMove = true;
          break;
        }
      }
    }
  }

  return { state: current, moves };
}

/**
 * Checks if greedily auto-completing to foundations can win the game directly.
 */
function tryFastAutoComplete(state: GameState): { won: boolean; moves: MoveRecord[] } {
  let curr = state;
  const moves: MoveRecord[] = [];
  let steps = 0;

  while (steps++ < 60 && !isGameWon(curr.foundations)) {
    const next = autoCompleteStep(curr);
    if (!next) break;
    const lastMove = next.history[next.history.length - 1];
    moves.push(lastMove);
    curr = next;
  }

  return { won: isGameWon(curr.foundations), moves };
}

/**
 * Computes a canonical hash string for a game state.
 * Sorts non-empty and empty tableau column representations to ensure symmetry invariance
 * (e.g. which empty column holds which King does not multiply states).
 */
export function getCanonicalStateKey(state: GameState): string {
  // Foundations
  const fKey = state.foundations
    .map((pile) => (pile.length > 0 ? `${pile[pile.length - 1].rank}${pile[pile.length - 1].suit[0]}` : '0'))
    .join(',');

  // Tableau columns canonicalized
  const tableauCols = state.tableau.map((col) => {
    if (col.length === 0) return 'E';
    let fdCount = 0;
    while (fdCount < col.length && !col[fdCount].faceUp) {
      fdCount++;
    }
    const faceUp = col
      .slice(fdCount)
      .map((c) => `${c.rank}${c.suit[0]}`)
      .join('');
    return `${fdCount}:${faceUp}`;
  });

  // Sort columns alphabetically to eliminate column permutations
  tableauCols.sort();
  const tKey = tableauCols.join('|');

  // Stock & Waste canonicalization
  const deck = [...state.stock, ...state.waste]
    .map((c) => `${c.rank}${c.suit[0]}`)
    .sort()
  const topWaste =
    state.waste.length > 0
      ? `${state.waste[state.waste.length - 1].rank}${state.waste[state.waste.length - 1].suit[0]}`
      : '0';
  const swKey =
    state.drawCount === 1 ? `d1:${deck}` : `d3:${deck};w:${topWaste};s:${state.stock.length}`;

  return `${fKey}#${tKey}#${swKey}`;
}

interface CandidateMove {
  nextState: GameState;
  moves: MoveRecord[];
  priority: number;
}

/**
 * Draws through the deck until targetCardId is exposed at the top of the waste,
 * then plays it to the target location.
 */
function playCardFromDeck(
  state: GameState,
  targetCardId: string,
  to: PileLocation,
  allowAnyCardOnEmpty: boolean
): { nextState: GameState; moves: MoveRecord[] } | null {
  // In Draw 1 mode, every remaining deck card is directly accessible
  if (state.drawCount === 1) {
    const card = [...state.stock, ...state.waste].find((c) => c.id === targetCardId);
    if (!card) return null;

    if (to.type === 'tableau') {
      const col = state.tableau[to.index];
      if (!col || !canPlaceOnTableau(card, col, allowAnyCardOnEmpty)) return null;
    } else if (to.type === 'foundation') {
      const pile = state.foundations[to.index];
      if (!pile || !canPlaceOnFoundation(card, pile, to.index)) return null;
    } else {
      return null;
    }

    const nextStock = state.stock.filter((c) => c.id !== targetCardId);
    const nextWaste = state.waste.filter((c) => c.id !== targetCardId);
    const placedCard = { ...card, faceUp: true };

    let nextTableau = state.tableau;
    let nextFoundations = state.foundations;

    if (to.type === 'tableau') {
      nextTableau = state.tableau.map((col, idx) =>
        idx === to.index ? [...col, placedCard] : col
      );
    } else {
      nextFoundations = state.foundations.map((pile, idx) =>
        idx === to.index ? [...pile, placedCard] : pile
      );
    }

    const moveRecord: MoveRecord = {
      from: { type: state.waste.some((c) => c.id === targetCardId) ? 'waste' : 'stock', index: 0 },
      to,
      cardIds: [targetCardId],
      pointsEarned: to.type === 'foundation' ? 10 : 5,
    };

    return {
      nextState: {
        ...state,
        stock: nextStock,
        waste: nextWaste,
        tableau: nextTableau,
        foundations: nextFoundations,
        moves: state.moves + 1,
        history: [...state.history, moveRecord],
      },
      moves: [moveRecord],
    };
  }

  // Draw 3 mode: simulate cycles until target card reaches the top of waste
  const moves: MoveRecord[] = [];

  if (state.waste.length > 0 && state.waste[state.waste.length - 1].id === targetCardId) {
    const next = moveCards(state, { type: 'waste', index: 0 }, to, [targetCardId], allowAnyCardOnEmpty);
    if (!next) return null;
    moves.push(next.history[next.history.length - 1]);
    return { nextState: next, moves };
  }

  let curr = state;
  let safety = 0;
  const maxDraws = (state.stock.length + state.waste.length) * (state.drawCount + 1) + 10;

  while (safety++ < maxDraws) {
    if (curr.stock.length === 0 && curr.waste.length === 0) {
      return null;
    }
    if (curr.stock.length === 0 && hasExhaustedStockCycles(curr)) {
      return null;
    }
    const next = drawCards(curr);
    if (next === curr) return null;
    moves.push(next.history[next.history.length - 1]);
    curr = next;

    if (curr.waste.length > 0 && curr.waste[curr.waste.length - 1].id === targetCardId) {
      const moved = moveCards(curr, { type: 'waste', index: 0 }, to, [targetCardId], allowAnyCardOnEmpty);
      if (!moved) return null;
      moves.push(moved.history[moved.history.length - 1]);
      return { nextState: moved, moves };
    }
  }

  return null;
}

/**
 * Computes an admissible lower bound on the minimum number of moves remaining.
 */
function computeMinimumMovesLeft(state: GameState): number {
  let moves = 0;
  const stockCount = state.stock.length;
  const wasteCount = state.waste.length;
  moves += stockCount + Math.ceil(stockCount / state.drawCount) + wasteCount;

  for (const col of state.tableau) {
    let downCount = 0;
    while (downCount < col.length && !col[downCount].faceUp) {
      downCount++;
    }
    moves += col.length + downCount;
  }
  return moves;
}

/**
 * Computes A* f(n) = g(n) + h(n) helper score. Lower is better.
 */
function computeHelperScore(state: GameState, depth: number): number {
  let foundationCards = 0;
  for (const pile of state.foundations) {
    foundationCards += pile.length;
  }
  const minMoves = computeMinimumMovesLeft(state);
  return depth + minMoves + (52 - foundationCards);
}

/**
 * Bucketed Priority Queue with LIFO stack per bucket (matching ShootMe A* solver).
 * Provides O(1) push and O(1) pop, prioritizing lowest helper score and DFS within buckets.
 */
class BucketedSearchQueue<T> {
  private buckets: T[][] = [];
  private minIndex: number = 0;
  private totalCount: number = 0;

  push(item: T, priority: number) {
    const idx = Math.max(0, Math.min(511, Math.floor(priority)));
    if (!this.buckets[idx]) {
      this.buckets[idx] = [];
    }
    this.buckets[idx].push(item);
    this.totalCount++;
    if (idx < this.minIndex) {
      this.minIndex = idx;
    }
  }

  pop(): T | undefined {
    if (this.totalCount === 0) return undefined;
    while (
      this.minIndex < 512 &&
      (!this.buckets[this.minIndex] || this.buckets[this.minIndex].length === 0)
    ) {
      this.minIndex++;
    }
    if (this.minIndex >= 512) return undefined;
    const item = this.buckets[this.minIndex].pop()!;
    this.totalCount--;
    return item;
  }

  get length(): number {
    return this.totalCount;
  }
}


/**
 * Generates all valid candidate non-safe advancing moves from the current state,
 * prioritized by likelihood of unlocking game progress.
 */
function generateCandidateMoves(
  state: GameState,
  allowAnyCardOnEmpty: boolean
): CandidateMove[] {
  const candidates: CandidateMove[] = [];

  // Track the first empty column index to avoid symmetric duplicate King placements
  let firstEmptyColumnIdx = -1;
  for (let c = 0; c < state.tableau.length; c++) {
    if (state.tableau[c].length === 0) {
      firstEmptyColumnIdx = c;
      break;
    }
  }

  // 1. Tableau-to-Tableau moves that uncover a face-down card or empty a column
  for (let fromIdx = 0; fromIdx < state.tableau.length; fromIdx++) {
    const fromCol = state.tableau[fromIdx];
    if (fromCol.length === 0) continue;

    for (let cardIdx = 0; cardIdx < fromCol.length; cardIdx++) {
      const card = fromCol[cardIdx];
      if (!card.faceUp) continue;

      const uncoversFaceDown = cardIdx > 0 && !fromCol[cardIdx - 1].faceUp;
      const emptiesColumn = cardIdx === 0;

      // Avoid moving a King already sitting at the base of an empty column to another empty column
      if (card.rank === 13 && emptiesColumn) {
        continue;
      }

      // If moving only a subset of face-up cards (neither uncovering face-down nor emptying column),
      // this move is only productive if the card being uncovered can immediately go to a foundation!
      if (!uncoversFaceDown && !emptiesColumn) {
        const cardExposed = fromCol[cardIdx - 1];
        const targetF = FOUNDATION_SUITS.indexOf(cardExposed.suit);
        if (
          targetF < 0 ||
          !canPlaceOnFoundation(cardExposed, state.foundations[targetF], targetF)
        ) {
          continue;
        }
      }

      for (let toIdx = 0; toIdx < state.tableau.length; toIdx++) {
        if (toIdx === fromIdx) continue;
        const toCol = state.tableau[toIdx];

        // Symmetry pruning: Kings on empty columns only go to the first empty column
        if (toCol.length === 0 && toIdx !== firstEmptyColumnIdx) {
          continue;
        }

        if (canPlaceOnTableau(card, toCol, allowAnyCardOnEmpty)) {
          const next = moveCards(
            state,
            { type: 'tableau', index: fromIdx },
            { type: 'tableau', index: toIdx },
            fromCol.slice(cardIdx).map((c) => c.id),
            allowAnyCardOnEmpty
          );
          if (next) {
            let priority = 40;
            if (uncoversFaceDown) priority = 100;
            else if (emptiesColumn) priority = 75;
            else if (card.rank === 13) priority = 65;

            candidates.push({
              nextState: next,
              moves: [next.history[next.history.length - 1]],
              priority,
            });
          }
        }
      }
    }
  }

  // 2. Play accessible deck cards (stock/waste) directly to foundation or tableau
  const accessibleCards = getAccessibleDeckCards(state);
  for (const card of accessibleCards) {
    const isTopWaste =
      state.waste.length > 0 && state.waste[state.waste.length - 1].id === card.id;

    // Foundation target
    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(card, state.foundations[f], f)) {
        const played = playCardFromDeck(
          state,
          card.id,
          { type: 'foundation', index: f },
          allowAnyCardOnEmpty
        );
        if (played) {
          const priority =
            card.rank <= 2 && isTopWaste ? 95 : card.rank <= 2 ? 80 : 50;
          candidates.push({
            nextState: played.nextState,
            moves: played.moves,
            priority,
          });
        }
      }
    }

    // Tableau target
    for (let toIdx = 0; toIdx < state.tableau.length; toIdx++) {
      const toCol = state.tableau[toIdx];
      if (toCol.length === 0 && toIdx !== firstEmptyColumnIdx) {
        continue;
      }

      if (canPlaceOnTableau(card, toCol, allowAnyCardOnEmpty)) {
        const played = playCardFromDeck(
          state,
          card.id,
          { type: 'tableau', index: toIdx },
          allowAnyCardOnEmpty
        );
        if (played) {
          const priority =
            card.rank === 13 ? (isTopWaste ? 55 : 45) : isTopWaste ? 45 : 30;
          candidates.push({
            nextState: played.nextState,
            moves: played.moves,
            priority,
          });
        }
      }
    }
  }

  // 3. Tableau-to-Foundation (non-safe, e.g. needed for board clearance)
  for (let fromIdx = 0; fromIdx < state.tableau.length; fromIdx++) {
    const fromCol = state.tableau[fromIdx];
    if (fromCol.length === 0) continue;
    const topCard = fromCol[fromCol.length - 1];

    for (let f = 0; f < state.foundations.length; f++) {
      if (canPlaceOnFoundation(topCard, state.foundations[f], f)) {
        const next = moveCards(
          state,
          { type: 'tableau', index: fromIdx },
          { type: 'foundation', index: f },
          [topCard.id]
        );
        if (next) {
          candidates.push({
            nextState: next,
            moves: [next.history[next.history.length - 1]],
            priority: 50,
          });
        }
      }
    }
  }

  // Sort candidate moves by descending priority
  candidates.sort((a, b) => b.priority - a.priority);

  return candidates;
}

/**
 * Checks if the game is still winnable from the current state using a bounded
 * depth-first search with safe foundation reductions, transposition tables,
 * and cooperative async time-slicing.
 */
export async function checkWinnable(
  state: GameState,
  options: SolverOptions = {}
): Promise<SolverResult> {
  const startTime = Date.now();
  const maxStates = options.maxStates ?? 100000;
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxDepth = options.maxDepth ?? 120;
  const allowAnyCardOnEmpty = options.allowAnyCardOnEmpty ?? false;

  // 1. Fast Path Checks
  if (isGameWon(state.foundations)) {
    return {
      status: 'winnable',
      statesEvaluated: 0,
      durationMs: Date.now() - startTime,
      solutionMoves: [],
    };
  }

  const fastAuto = tryFastAutoComplete(state);
  if (fastAuto.won) {
    return {
      status: 'winnable',
      statesEvaluated: 1,
      durationMs: Date.now() - startTime,
      solutionMoves: fastAuto.moves,
    };
  }

  if (!hasLegalMoves(state, allowAnyCardOnEmpty)) {
    return {
      status: 'unwinnable',
      statesEvaluated: 1,
      durationMs: Date.now() - startTime,
    };
  }

  // 2. Search Initialization
  const visited = new Set<string>();
  let statesEvaluated = 0;
  let didTimeout = false;

  interface SearchNode {
    state: GameState;
    depth: number;
    path: MoveRecord[];
  }

  const queue = new BucketedSearchQueue<SearchNode>();
  queue.push(
    {
      state,
      depth: 0,
      path: [],
    },
    computeHelperScore(state, 0)
  );

  while (queue.length > 0) {
    const frame = queue.pop()!;
    statesEvaluated++;

    // Yield to the event loop every 250 states to prevent UI hitching
    if (statesEvaluated % 250 === 0) {
      if (Date.now() - startTime > timeoutMs) {
        didTimeout = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (statesEvaluated > maxStates) {
      didTimeout = true;
      break;
    }

    // Apply greedy safe foundation moves (reduction)
    const { state: reducedState, moves: safeMoves } = applySafeFoundationMoves(
      frame.state,
      frame.path
    );



    if (isGameWon(reducedState.foundations)) {
      return {
        status: 'winnable',
        statesEvaluated,
        durationMs: Date.now() - startTime,
        solutionMoves: safeMoves,
      };
    }

    // Check fast auto-complete on reduced state
    const autoResult = tryFastAutoComplete(reducedState);
    if (autoResult.won) {
      return {
        status: 'winnable',
        statesEvaluated,
        durationMs: Date.now() - startTime,
        solutionMoves: [...safeMoves, ...autoResult.moves],
      };
    }

    if (frame.depth >= maxDepth) {
      continue;
    }

    const stateKey = getCanonicalStateKey(reducedState);
    if (visited.has(stateKey)) {
      continue;
    }
    visited.add(stateKey);

    // Generate prioritized candidate moves
    const candidates = generateCandidateMoves(reducedState, allowAnyCardOnEmpty);

    // Score candidates using A* helper score (f(n) = g(n) + h(n), lower is better)
    const scoredCandidates = candidates.map((cand) => {
      const score = computeHelperScore(cand.nextState, frame.depth + 1);
      return { cand, score };
    });
    scoredCandidates.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return b.cand.priority - a.cand.priority;
    });

    // Beam search: take top 3 best moves matching ShootMe's pruning strategy
    const topMoves = scoredCandidates.slice(0, 3);
    for (const item of topMoves) {
      queue.push(
        {
          state: item.cand.nextState,
          depth: frame.depth + 1,
          path: [...safeMoves, ...item.cand.moves],
        },
        item.score
      );
    }
  }

  const durationMs = Date.now() - startTime;

  if (didTimeout) {
    return {
      status: 'timeout',
      statesEvaluated,
      durationMs,
    };
  }

  return {
    status: 'unwinnable',
    statesEvaluated,
    durationMs,
  };
}
