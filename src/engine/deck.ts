import { Card, GameState, Rank, Suit } from './types';

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
 * Fisher-Yates shuffle with optional linear congruential seed for deterministic deals.
 */
export function shuffleCards(cards: Card[], seed?: number): Card[] {
  const deck = [...cards];
  let s = seed ?? Math.floor(Math.random() * 2147483647);

  const nextRandom = (): number => {
    if (seed === undefined) {
      return Math.random();
    }
    // Simple Lehmer / LCG generator for deterministic testing
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

/**
 * Deals a new Classic Klondike game.
 * - 7 tableau columns (total 28 cards), top card of each column is face-up.
 * - Remaining 24 cards placed in stock (face-down).
 * - 4 empty foundation piles.
 * - Empty waste pile.
 */
export function dealKlondike(drawCount: 1 | 3 = 1, seed?: number): GameState {
  const deck = shuffleCards(createStandardDeck(), seed);

  const tableau: Card[][] = [[], [], [], [], [], [], []];
  let deckIndex = 0;

  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck[deckIndex++];
      card.faceUp = row === col; // Only the top-most card is dealt face-up
      tableau[col].push(card);
    }
  }

  const stock: Card[] = deck.slice(deckIndex).map((c) => ({
    ...c,
    faceUp: false,
  }));

  const foundations: Card[][] = [[], [], [], []];

  return {
    version: 1,
    id: `klondike_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    drawCount,
    stock,
    waste: [],
    foundations,
    tableau,
    score: 0,
    moves: 0,
    elapsedSeconds: 0,
    status: 'playing',
    history: [],
    createdAt: Date.now(),
  };
}
