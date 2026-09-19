export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardColor = 'black' | 'red';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/**
 * Derived helper: color is determined strictly by suit.
 * Hearts and Diamonds are red; Spades and Clubs are black.
 */
export const getCardColor = (suit: Suit): CardColor =>
  suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';

/**
 * Card instance model.
 * Uses an opaque unique `id` (e.g. "c_0" ... "c_51") so that
 * multi-deck games (like Spider Solitaire with 104 cards and duplicate suits/ranks)
 * never encounter ID collisions in React or move tracking.
 */
export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type PileType = 'stock' | 'waste' | 'foundation' | 'tableau';

export interface PileLocation {
  type: PileType;
  index: number; // foundation index (0-3 in Klondike) or tableau column index (0-6 in Klondike)
}

export interface MoveRecord {
  from: PileLocation;
  to: PileLocation;
  cardIds: string[];
  turnedOverCardId?: string; // ID of card exposed and flipped on source tableau column
  pointsEarned: number;
}

export interface GameState {
  version: 1;
  id: string;
  drawCount: 1 | 3;
  stock: Card[];
  waste: Card[];
  foundations: Card[][]; // Klondike: 4 piles. Spider: 8 piles.
  tableau: Card[][];     // Klondike: 7 columns. Spider: 10 columns.
  score: number;
  moves: number;
  elapsedSeconds: number;
  status: 'playing' | 'paused' | 'won';
  history: MoveRecord[];
  createdAt: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  highScore: number;
  bestTimeSeconds: number | null;
}

export interface UserSettings {
  drawCount: 1 | 3;
  autoMoveOnTap: boolean;
}
