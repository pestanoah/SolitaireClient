import { Card, GameState, PileLocation, Rank, Suit } from './types';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/**
 * Creates a standard 52-card deck with globally unique instance IDs.
 */
export function createStandardDeck(idPrefix = 'c'): Card[] {
  const cards: Card[] = [];
  let idCounter = 0;

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        id: `${idPrefix}_${idCounter++}`,
        suit,
        rank,
        faceUp: false,
      });
    }
  }

  return cards;
}

/**
 * Hashes an arbitrary string into a 32-bit unsigned integer seed.
 * Uses FNV-1a with 32-bit avalanche mixing for uniform distribution across seeds.
 */
export function hashStringToSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  // 32-bit avalanche mixing
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) || 1;
}

/**
 * Creates a deterministic Mulberry32 pseudo-random number generator.
 * Produces uniform pseudo-random numbers in [0, 1) from a numeric or string seed.
 */
export function createPrng(seed: number | string): () => number {
  let s = typeof seed === 'number' ? (seed >>> 0) || 1 : hashStringToSeed(seed);

  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a clean random seed string (e.g. "k8m2b1x4").
 */
export function generateRandomSeed(): string {
  return Math.random().toString(36).substring(2, 10);
}

export {
  getDailyChallengeSeed,
  getRandomWinnableSeed,
  isDailyChallenge,
  isDateSeed,
  isSeedWinnable,
} from './winnable';
import { getRandomWinnableSeed } from './winnable';

/**
 * Fisher-Yates shuffle with deterministic Mulberry32 PRNG seed.
 * Accepts any string or numeric seed. If seed is omitted, Math.random is used.
 */
export function shuffleCards(cards: Card[], seed?: number | string): Card[] {
  const deck = [...cards];
  const nextRandom = seed !== undefined ? createPrng(seed) : Math.random;

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

/**
 * Deals a Klondike game from an ordered 52-card deck.
 * Cards are cloned to prevent shared object mutation.
 */
export function dealKlondikeFromDeck(
  deck: Card[],
  drawCount: 1 | 3 = 1,
  seed?: string
): GameState {
  const cleanDeck = deck.map((c) => ({ ...c, faceUp: false }));
  const tableau: Card[][] = [[], [], [], [], [], [], []];
  let deckIndex = 0;

  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = cleanDeck[deckIndex++];
      tableau[col].push({
        ...card,
        faceUp: row === col, // Only top card is dealt face-up
      });
    }
  }

  const rawStock: Card[] = cleanDeck.slice(deckIndex).map((c) => ({
    ...c,
    faceUp: false,
  }));

  const initialDrawCount = Math.min(drawCount, rawStock.length);
  const stock = rawStock.slice(0, rawStock.length - initialDrawCount);
  const waste = rawStock.slice(rawStock.length - initialDrawCount).map((c) => ({
    ...c,
    faceUp: true,
  }));

  const foundations: Card[][] = [[], [], [], []];

  return {
    version: 1,
    id: `klondike_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    drawCount,
    stock,
    waste,
    foundations,
    tableau,
    score: 0,
    moves: 0,
    elapsedSeconds: 0,
    status: 'playing',
    history: [],
    createdAt: Date.now(),
    initialDeck: cleanDeck.map((c) => ({ ...c, faceUp: false })),
    seed,
  };
}

/**
 * Deals a new Classic Klondike game.
 * - 7 tableau columns (total 28 cards), top card of each column is face-up.
 * - Remaining 24 cards: first card(s) drawn into waste face-up according to drawCount, remainder in stock face-down.
 * - 4 empty foundation piles.
 * Supports any string or numeric seed for deterministic seeded runs.
 * If seed is omitted and winnableOnly is true, deals from the verified winnable pool.
 */
export function dealKlondike(
  drawCount: 1 | 3 = 1,
  seed?: number | string,
  winnableOnly = true
): GameState {
  let actualSeed: string;
  if (seed !== undefined) {
    actualSeed = String(seed);
  } else if (winnableOnly) {
    actualSeed = getRandomWinnableSeed(drawCount);
  } else {
    actualSeed = generateRandomSeed();
  }
  const deck = shuffleCards(createStandardDeck(), actualSeed);
  return dealKlondikeFromDeck(deck, drawCount, actualSeed);
}

export interface DealStep {
  card: Card;
  targetPile: PileLocation;
  targetIndexInPile: number;
  faceUp: boolean;
  round: number;
  stepIndex: number;
}

/**
 * Generates the sequence of dealing steps for a new Klondike Solitaire game.
 * Deals round-by-round across the 7 tableau columns (28 cards total),
 * followed by the initial waste draw (if any cards in waste).
 */
export function generateKlondikeDealSteps(gameState: GameState): DealStep[] {
  const steps: DealStep[] = [];
  let stepIndex = 0;

  // 7 rounds of tableau dealing
  for (let r = 0; r < 7; r++) {
    for (let c = r; c < 7; c++) {
      const card = gameState.tableau[c]?.[r];
      if (card) {
        steps.push({
          card,
          targetPile: { type: 'tableau', index: c },
          targetIndexInPile: r,
          faceUp: card.faceUp,
          round: r,
          stepIndex: stepIndex++,
        });
      }
    }
  }

  // Initial waste cards (if auto-drawn)
  for (let w = 0; w < gameState.waste.length; w++) {
    const card = gameState.waste[w];
    steps.push({
      card,
      targetPile: { type: 'waste', index: 0 },
      targetIndexInPile: w,
      faceUp: true,
      round: 7,
      stepIndex: stepIndex++,
    });
  }

  return steps;
}

