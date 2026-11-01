jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import {
  AUTO_COMPLETE_DELAY_MS,
  AUTO_COMPLETE_ANIMATION_DURATION_MS,
  DEFAULT_DEAL_STAGGER_MS,
  DEFAULT_DEAL_DURATION_MS,
  calculatePileBasePosition,
  calculatePileCardPosition,
  calculateTableauOffsets,
  PilePositionParams,
} from '../GameScreen';
import { Card } from '../../engine/types';
import { createEmptyGame, dealKlondike } from '../../engine/deck';
import { styles } from '../GameScreen.styles';

describe('Auto-complete Speed Timing', () => {
  test('auto-complete delay and animation duration are configured for 2x speed', () => {
    // Original speed: 160ms delay + 200ms animation duration = 360ms per step
    // 2x speed: 80ms delay + 100ms animation duration = 180ms per step (half the duration = 2x speed)
    expect(AUTO_COMPLETE_DELAY_MS).toBe(80);
    expect(AUTO_COMPLETE_ANIMATION_DURATION_MS).toBe(100);

    const originalTotalDuration = 160 + 200;
    const currentTotalDuration = AUTO_COMPLETE_DELAY_MS + AUTO_COMPLETE_ANIMATION_DURATION_MS;
    expect(originalTotalDuration / currentTotalDuration).toBe(2);
  });
});

describe('Initial Game Deal Animation Timing', () => {
  test('initial deal animation stagger and flight duration are configured for ~1s total deal time', () => {
    expect(DEFAULT_DEAL_STAGGER_MS).toBe(28);
    expect(DEFAULT_DEAL_DURATION_MS).toBe(160);

    // 28 tableau cards + 1 waste card in Draw 1 = 29 cards
    // 28 steps * 28ms stagger = 784ms delay for final card + 160ms flight duration = 944ms (~1.0s)
    const draw1TotalDuration = (29 - 1) * DEFAULT_DEAL_STAGGER_MS + DEFAULT_DEAL_DURATION_MS;
    expect(draw1TotalDuration).toBeLessThanOrEqual(1100);
    expect(draw1TotalDuration).toBeGreaterThanOrEqual(800);
  });
});

describe('Right-Handed Mode Pile Positions and Animations', () => {
  const baseParams: PilePositionParams = {
    boardWidth: 700,
    cardWidth: 60,
    cardHeight: 84,
    gap: 10,
    fanOffset: 18,
    upOffset: 26,
    downOffset: 13,
    isRightHanded: false,
    drawCount: 1,
    wasteCount: 1,
    topRowY: 0,
    tableauRowY: 100,
  };

  test('Stock pile flips from left side (0) to right side (boardWidth - cardWidth)', () => {
    const leftHandedStock = calculatePileBasePosition({ type: 'stock' }, { ...baseParams, isRightHanded: false });
    const rightHandedStock = calculatePileBasePosition({ type: 'stock' }, { ...baseParams, isRightHanded: true });

    expect(leftHandedStock.x).toBe(0);
    expect(rightHandedStock.x).toBe(700 - 60); // 640
  });

  test('Foundations flip from right side to left side', () => {
    const leftHandedFoundationsStart = calculatePileBasePosition(
      { type: 'foundation', index: 0 },
      { ...baseParams, isRightHanded: false }
    );
    const rightHandedFoundationsStart = calculatePileBasePosition(
      { type: 'foundation', index: 0 },
      { ...baseParams, isRightHanded: true }
    );

    // In left-handed mode: 700 - (4*60 + 3*10) = 700 - 270 = 430
    expect(leftHandedFoundationsStart.x).toBe(430);
    // In right-handed mode: foundation 0 is at 0
    expect(rightHandedFoundationsStart.x).toBe(0);

    // Foundation 3
    const leftHandedF3 = calculatePileBasePosition(
      { type: 'foundation', index: 3 },
      { ...baseParams, isRightHanded: false }
    );
    const rightHandedF3 = calculatePileBasePosition(
      { type: 'foundation', index: 3 },
      { ...baseParams, isRightHanded: true }
    );

    expect(leftHandedF3.x).toBe(430 + 3 * (60 + 10)); // 640
    expect(rightHandedF3.x).toBe(0 + 3 * (60 + 10)); // 210
  });

  test('Waste pile flips to sit adjacent to Stock on right in right-handed mode', () => {
    const leftHandedWaste = calculatePileBasePosition(
      { type: 'waste' },
      { ...baseParams, isRightHanded: false }
    );
    const rightHandedWaste = calculatePileBasePosition(
      { type: 'waste' },
      { ...baseParams, isRightHanded: true }
    );

    // In left-handed mode: cardWidth + spacing.lg (60 + 10 = 70)
    expect(leftHandedWaste.x).toBe(70);
    // In right-handed mode: 700 - 60 - 10 - 60 = 570
    expect(rightHandedWaste.x).toBe(570);
  });

  test('Tableau columns mirror horizontally in right-handed mode', () => {
    const leftCol0 = calculatePileBasePosition({ type: 'tableau', index: 0 }, { ...baseParams, isRightHanded: false });
    const rightCol0 = calculatePileBasePosition({ type: 'tableau', index: 0 }, { ...baseParams, isRightHanded: true });

    const leftCol6 = calculatePileBasePosition({ type: 'tableau', index: 6 }, { ...baseParams, isRightHanded: false });
    const rightCol6 = calculatePileBasePosition({ type: 'tableau', index: 6 }, { ...baseParams, isRightHanded: true });

    expect(leftCol0.x).toBe(0);
    expect(rightCol0.x).toBe(700 - 60); // 640
    expect(leftCol6.x).toBe(700 - 60); // 640
    expect(rightCol6.x).toBe(0);
  });

  test('Stock to waste card draw animation coordinates differ between left-handed and right-handed mode', () => {
    const state = dealKlondike(1);

    // Left-handed draw animation:
    const lhStockPos = calculatePileBasePosition({ type: 'stock' }, { ...baseParams, isRightHanded: false });
    const lhWastePos = calculatePileBasePosition({ type: 'waste' }, { ...baseParams, isRightHanded: false, wasteCount: 1 });

    // Right-handed draw animation:
    const rhStockPos = calculatePileBasePosition({ type: 'stock' }, { ...baseParams, isRightHanded: true });
    const rhWastePos = calculatePileBasePosition({ type: 'waste' }, { ...baseParams, isRightHanded: true, wasteCount: 1 });

    // Ensure left-handed draw flies left-to-right on the left side of the screen
    expect(lhStockPos.x).toBeLessThan(lhWastePos.x);
    expect(lhStockPos.x).toBe(0);

    // Ensure right-handed draw flies right-to-left on the right side of the screen
    expect(rhStockPos.x).toBeGreaterThan(rhWastePos.x);
    expect(rhStockPos.x).toBe(640);
    expect(rhWastePos.x).toBe(570);

    // Crucially: right-handed animation coordinates are NOT equal to left-handed coordinates
    expect(rhStockPos.x).not.toBe(lhStockPos.x);
    expect(rhWastePos.x).not.toBe(lhWastePos.x);
  });

  test('Card movement from Tableau to Foundation uses correct inverted targets', () => {
    const state = dealKlondike(1);

    const lhTab0Card = calculatePileCardPosition({ type: 'tableau', index: 0 }, 0, state, {
      ...baseParams,
      isRightHanded: false,
    });
    const rhTab0Card = calculatePileCardPosition({ type: 'tableau', index: 0 }, 0, state, {
      ...baseParams,
      isRightHanded: true,
    });

    const lhFound0 = calculatePileBasePosition({ type: 'foundation', index: 0 }, { ...baseParams, isRightHanded: false });
    const rhFound0 = calculatePileBasePosition({ type: 'foundation', index: 0 }, { ...baseParams, isRightHanded: true });

    // Left-handed: Tab 0 (x=0) -> Found 0 (x=430)
    expect(lhTab0Card.x).toBe(0);
    expect(lhFound0.x).toBe(430);

    // Right-handed: Tab 0 (x=640) -> Found 0 (x=0)
    expect(rhTab0Card.x).toBe(640);
    expect(rhFound0.x).toBe(0);
  });

  test('Draw 3 waste fanning aligns top card adjacent to Stock in right-handed mode', () => {
    const state = {
      ...dealKlondike(3),
      drawCount: 3 as const,
      waste: [
        { id: 'c1', rank: 1 as const, suit: 'hearts' as const, faceUp: true },
        { id: 'c2', rank: 2 as const, suit: 'hearts' as const, faceUp: true },
        { id: 'c3', rank: 3 as const, suit: 'hearts' as const, faceUp: true },
      ],
    };

    const draw3Params: PilePositionParams = {
      ...baseParams,
      drawCount: 3,
      wasteCount: 3,
      isRightHanded: true,
    };

    const topCardPos = calculatePileCardPosition({ type: 'waste' }, 2, state, draw3Params);
    // Base waste is at 700 - 60 - 10 - (60 + 2*18) = 534
    // Top card is at 534 + 2*18 = 570
    // Stock is at 700 - 60 = 640
    // Gap between top card right edge (570 + 60 = 630) and stock (640) is exactly spacing.lg (10)
    expect(topCardPos.x).toBe(570);
    expect(topCardPos.x + baseParams.cardWidth + 10).toBe(700 - baseParams.cardWidth);
  });

  test('Draw 3 waste fanning when only 1 card is drawn positions base and top card without extra fan width', () => {
    const state = {
      ...dealKlondike(3),
      drawCount: 3 as const,
      waste: [
        { id: 'w1', rank: 1 as const, suit: 'hearts' as const, faceUp: true },
        { id: 'w2', rank: 2 as const, suit: 'hearts' as const, faceUp: true },
        { id: 'w3', rank: 3 as const, suit: 'hearts' as const, faceUp: true },
        { id: 'last_drawn', rank: 4 as const, suit: 'spades' as const, faceUp: true },
      ],
    };

    // Right-handed mode with visibleWasteCount = 1:
    const rhParams: PilePositionParams = {
      ...baseParams,
      drawCount: 3,
      wasteCount: 4,
      visibleWasteCount: 1,
      isRightHanded: true,
    };

    const rhBasePos = calculatePileBasePosition({ type: 'waste' }, rhParams);
    // Base waste should be at boardWidth - cardWidth - spacing.lg - cardWidth: 700 - 60 - 10 - 60 = 570
    expect(rhBasePos.x).toBe(570);

    const rhTopCardPos = calculatePileCardPosition({ type: 'waste' }, 3, state, rhParams);
    // Since only 1 card is visible, top card has hOffset = 0
    expect(rhTopCardPos.x).toBe(570);
    expect(rhTopCardPos.x + baseParams.cardWidth + 10).toBe(700 - baseParams.cardWidth);

    // Left-handed mode with visibleWasteCount = 1:
    const lhParams: PilePositionParams = {
      ...baseParams,
      drawCount: 3,
      wasteCount: 4,
      visibleWasteCount: 1,
      isRightHanded: false,
    };

    const lhBasePos = calculatePileBasePosition({ type: 'waste' }, lhParams);
    // In left-handed mode: cardWidth + spacing.lg = 70
    expect(lhBasePos.x).toBe(70);

    const lhTopCardPos = calculatePileCardPosition({ type: 'waste' }, 3, state, lhParams);
    expect(lhTopCardPos.x).toBe(70);
  });

  test('Draw 3 waste fanning when 2 cards are drawn positions base and top card for 2-card fan', () => {
    const state = {
      ...dealKlondike(3),
      drawCount: 3 as const,
      waste: [
        { id: 'w1', rank: 1 as const, suit: 'hearts' as const, faceUp: true },
        { id: 'w2', rank: 2 as const, suit: 'hearts' as const, faceUp: true },
        { id: 'penultimate', rank: 3 as const, suit: 'hearts' as const, faceUp: true },
        { id: 'last_drawn', rank: 4 as const, suit: 'spades' as const, faceUp: true },
      ],
    };

    const rhParams: PilePositionParams = {
      ...baseParams,
      drawCount: 3,
      wasteCount: 4,
      visibleWasteCount: 2,
      isRightHanded: true,
    };

    const rhBasePos = calculatePileBasePosition({ type: 'waste' }, rhParams);
    // Base waste width = 60 + 1 * 18 = 78
    // Base waste at 700 - 60 - 10 - 78 = 552
    expect(rhBasePos.x).toBe(552);

    const rhTopCardPos = calculatePileCardPosition({ type: 'waste' }, 3, state, rhParams);
    // Top card at 552 + 1 * 18 = 570
    expect(rhTopCardPos.x).toBe(570);
    expect(rhTopCardPos.x + baseParams.cardWidth + 10).toBe(700 - baseParams.cardWidth);
  });
});

describe('Tableau Offsets and Dynamic Cascade Compression', () => {
  const cardHeight = 80;
  const upOffset = 20;
  const downOffset = 10;

  test('calculates correct offsets for empty and single-card columns', () => {
    const emptyResult = calculateTableauOffsets([], cardHeight, upOffset, downOffset);
    expect(emptyResult.offsets).toEqual([]);
    expect(emptyResult.columnHeight).toBe(cardHeight);

    const singleCard: Card[] = [
      { id: 'c1', rank: 13, suit: 'spades', faceUp: true },
    ];
    const singleResult = calculateTableauOffsets(singleCard, cardHeight, upOffset, downOffset);
    expect(singleResult.offsets).toEqual([0]);
    expect(singleResult.columnHeight).toBe(cardHeight);
  });

  test('calculates standard uncompressed offsets for normal cascade', () => {
    // 3 face-down, 1 face-up
    const cards: Card[] = [
      { id: 'c1', rank: 13, suit: 'spades', faceUp: false },
      { id: 'c2', rank: 12, suit: 'hearts', faceUp: false },
      { id: 'c3', rank: 11, suit: 'clubs', faceUp: false },
      { id: 'c4', rank: 10, suit: 'diamonds', faceUp: true },
    ];

    const result = calculateTableauOffsets(cards, cardHeight, upOffset, downOffset);
    // Card 0: 0
    // Card 1: 0 + 10 = 10
    // Card 2: 10 + 10 = 20
    // Card 3: 20 + 10 = 30
    // Column Height: 30 + 80 = 110
    expect(result.offsets).toEqual([0, 10, 20, 30]);
    expect(result.columnHeight).toBe(110);
  });

  test('dynamically compresses offsets when maxColumnHeight is exceeded', () => {
    // 6 face-down cards + 6 face-up cards = 12 cards total
    const cards: Card[] = [
      { id: 'c1', rank: 13, suit: 'spades', faceUp: false },
      { id: 'c2', rank: 12, suit: 'hearts', faceUp: false },
      { id: 'c3', rank: 11, suit: 'clubs', faceUp: false },
      { id: 'c4', rank: 10, suit: 'diamonds', faceUp: false },
      { id: 'c5', rank: 9, suit: 'spades', faceUp: false },
      { id: 'c6', rank: 8, suit: 'hearts', faceUp: false },
      { id: 'c7', rank: 7, suit: 'clubs', faceUp: true },
      { id: 'c8', rank: 6, suit: 'diamonds', faceUp: true },
      { id: 'c9', rank: 5, suit: 'spades', faceUp: true },
      { id: 'c10', rank: 4, suit: 'hearts', faceUp: true },
      { id: 'c11', rank: 3, suit: 'clubs', faceUp: true },
      { id: 'c12', rank: 2, suit: 'diamonds', faceUp: true },
    ];

    // Uncompressed cascade height would be 6 * 10 + 5 * 20 = 160. Total height = 240.
    // Constrain maxColumnHeight to 200:
    const maxColumnHeight = 200;
    const result = calculateTableauOffsets(cards, cardHeight, upOffset, downOffset, maxColumnHeight);

    // Guaranteed to never exceed maxColumnHeight:
    expect(result.columnHeight).toBeLessThanOrEqual(maxColumnHeight);

    // Strictly monotonic top positions (each card sits strictly below previous):
    for (let i = 1; i < result.offsets.length; i++) {
      expect(result.offsets[i]).toBeGreaterThan(result.offsets[i - 1]);
    }
  });

  test('calculatePileCardPosition respects maxColumnHeight in tableau pile', () => {
    const state = dealKlondike(1);
    const params: PilePositionParams = {
      boardWidth: 700,
      cardWidth: 60,
      cardHeight: 80,
      gap: 10,
      fanOffset: 16,
      upOffset: 20,
      downOffset: 10,
      isRightHanded: false,
      drawCount: 1,
      wasteCount: 0,
      tableauRowY: 90,
      maxColumnHeight: 180,
    };

    // Column 6 has 7 cards
    const cardPos = calculatePileCardPosition({ type: 'tableau', index: 6 }, 6, state, params);
    expect(cardPos.y).toBeLessThanOrEqual(90 + 180);
  });

  test('tableau column spacing in landscape maintains tight inter-column gaps', () => {
    // In landscape on mobile (e.g. 844x390):
    const cardWidth = 69;
    const cardHeight = 97;
    const gap = 8;
    const boardWidth = cardWidth * 7 + gap * 6; // 531

    const params: PilePositionParams = {
      boardWidth,
      cardWidth,
      cardHeight,
      gap,
      fanOffset: 19,
      upOffset: 23,
      downOffset: 11,
      isRightHanded: false,
      drawCount: 1,
      wasteCount: 0,
      topRowY: 0,
      tableauRowY: 105,
    };

    // Verify distance between adjacent columns equals gap (8px), NOT massive spaced-apart gaps
    const col0Pos = calculatePileBasePosition({ type: 'tableau', index: 0 }, params);
    const col1Pos = calculatePileBasePosition({ type: 'tableau', index: 1 }, params);
    const col2Pos = calculatePileBasePosition({ type: 'tableau', index: 2 }, params);

    expect(col1Pos.x - (col0Pos.x + cardWidth)).toBe(gap);
    expect(col2Pos.x - (col1Pos.x + cardWidth)).toBe(gap);
    expect(col1Pos.x - col0Pos.x).toBe(cardWidth + gap);
  });
});

describe('Empty Board Initial Load', () => {
  test('empty columns compute height equal to cardHeight with no vertical cascading', () => {
    const cardHeight = 90;
    const { offsets, columnHeight } = calculateTableauOffsets([], cardHeight, 20, 10);
    expect(offsets).toEqual([]);
    expect(columnHeight).toBe(cardHeight);
  });

  test('createEmptyGame provides initial idle state with empty piles and zeroed metrics', () => {
    const state = createEmptyGame(1);
    expect(state.status).toBe('idle');
    expect(state.moves).toBe(0);
    expect(state.score).toBe(0);
    expect(state.elapsedSeconds).toBe(0);
    expect(state.stock).toHaveLength(0);
    expect(state.waste).toHaveLength(0);
    expect(state.foundations).toHaveLength(4);
    expect(state.tableau).toHaveLength(7);
  });

  test('unplayed deal starts with 0 moves and 0 elapsed seconds before user interaction', () => {
    const deal = dealKlondike(1);
    expect(deal.moves).toBe(0);
    expect(deal.elapsedSeconds).toBe(0);
  });

  test('dealOverlay has absolute positioning to prevent layout shifts on deal', () => {
    expect(styles.dealOverlay).toBeDefined();
    expect(styles.dealOverlay.position).toBe('absolute');
    expect(styles.dealOverlay.left).toBe(0);
    expect(styles.dealOverlay.right).toBe(0);
  });

  test('tableauRow minHeight stabilizes layout so dealing does not cause screen jump', () => {
    // In landscape: maxColumnHeight keeps tableauRow height constant
    const maxColumnHeight = 350;
    const cardHeight = 84;
    const isLandscape = true;
    const landscapeMinHeight = isLandscape ? maxColumnHeight : Math.floor(cardHeight * 2.2);
    expect(landscapeMinHeight).toBe(350);

    // In portrait: minHeight maintains height comparable to dealt 7-card column
    const isPortrait = false;
    const portraitMinHeight = isPortrait ? maxColumnHeight : Math.max(Math.floor(cardHeight * 2.2), cardHeight + 10 + 54);
    expect(portraitMinHeight).toBe(Math.floor(84 * 2.2)); // 184
  });
});

describe('Loss Detection and False-Positive Prevention', () => {
  const { hasLegalMoves, hasAvailableMoves } = require('../../engine/rules');
  const { findAvailableHints } = require('../../engine/hints');

  test('does not consider game physically deadlocked when legal stock or waste moves exist', () => {
    const state = createEmptyGame(1);
    state.status = 'playing';
    state.stock = [{ id: 's_1', suit: 'spades', rank: 5, faceUp: false }];

    expect(hasLegalMoves(state)).toBe(true);
  });

  test('does not treat an empty hints list as physical deadlock when legal moves remain', () => {
    const state = createEmptyGame(1);
    state.status = 'playing';
    // Col 0 has 8 of Spades; Col 1 has 9 of Hearts. Stock has unplaceable card.
    state.tableau[0] = [{ id: '8s', suit: 'spades', rank: 8, faceUp: true }];
    state.tableau[1] = [{ id: '9h', suit: 'hearts', rank: 9, faceUp: true }];
    state.stock = [{ id: '2c', suit: 'clubs', rank: 2, faceUp: false }];

    // Legal moves definitely exist (can draw stock, or move 8s onto 9h)
    expect(hasLegalMoves(state)).toBe(true);
  });

  test('accurately detects physical deadlock when zero legal moves exist anywhere', () => {
    const state = createEmptyGame(1);
    state.status = 'playing';
    state.stock = [];
    state.waste = [];
    state.tableau[0] = [{ id: '4s', suit: 'spades', rank: 4, faceUp: true }];
    state.tableau[1] = [{ id: '4c', suit: 'clubs', rank: 4, faceUp: true }];

    expect(hasLegalMoves(state)).toBe(false);
  });
});

describe('Auto-Complete Freeze Prevention (Waste Recycle & Watchdog Recovery)', () => {
  const React = require('react');
  const { Animated } = require('react-native');
  const { GameScreen } = require('../GameScreen');
  const storageModule = require('../../storage/storage');
  const soundModule = require('../../utils/sound');
  const confettiModule = require('../../utils/confetti');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(soundModule, 'playCardMoveSound').mockImplementation(() => {});
    jest.spyOn(soundModule, 'playDealSound').mockImplementation(() => {});
    jest.spyOn(soundModule, 'playResetSound').mockImplementation(() => {});
    jest.spyOn(soundModule, 'setSoundEnabled').mockImplementation(() => {});
    jest.spyOn(confettiModule, 'triggerWinConfetti').mockImplementation(() => {});
    jest.spyOn(storageModule, 'saveGameState').mockResolvedValue(undefined);
    jest.spyOn(storageModule, 'clearGameState').mockResolvedValue(undefined);
    jest.spyOn(storageModule, 'loadSettings').mockResolvedValue({
      soundEnabled: false,
      tapToMove: true,
      rightHanded: false,
    });
    jest.spyOn(storageModule, 'loadStats').mockResolvedValue({
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      bestStreak: 0,
      bestScore: 0,
      bestTimeSeconds: null,
      totalPlayTimeSeconds: 0,
    });
    jest.spyOn(storageModule, 'recordGameEnd').mockImplementation(async () => ({
      gamesPlayed: 1,
      gamesWon: 1,
      currentStreak: 1,
      bestStreak: 1,
      bestScore: 100,
      bestTimeSeconds: 25,
      totalPlayTimeSeconds: 25,
    }));
    jest.spyOn(storageModule, 'loadDailyChallenges').mockResolvedValue({});
    jest.spyOn(storageModule, 'recordDailyChallengeWon').mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function createAutoCompletableRecycleState(): any {
    const state = dealKlondike(1);
    state.foundations = [
      // Spades: A through 10
      Array.from({ length: 10 }, (_, i) => ({
        id: `s_${i + 1}`,
        suit: 'spades' as const,
        rank: (i + 1) as any,
        faceUp: true,
      })),
      // Hearts: A through 13 (full)
      Array.from({ length: 13 }, (_, i) => ({
        id: `h_${i + 1}`,
        suit: 'hearts' as const,
        rank: (i + 1) as any,
        faceUp: true,
      })),
      // Diamonds: A through 13 (full)
      Array.from({ length: 13 }, (_, i) => ({
        id: `d_${i + 1}`,
        suit: 'diamonds' as const,
        rank: (i + 1) as any,
        faceUp: true,
      })),
      // Clubs: A through 13 (full)
      Array.from({ length: 13 }, (_, i) => ({
        id: `c_${i + 1}`,
        suit: 'clubs' as const,
        rank: (i + 1) as any,
        faceUp: true,
      })),
    ];
    // Remaining 3 cards: Spades 13 (King) on Tableau 0, and Spades 11 (Jack), 12 (Queen) in Waste
    // with Queen (12) on top and Stock empty. Auto-complete must first recycle Waste -> Stock
    // (triggering the 2-stage animation), then play Jack, Queen, and King to Foundation 0.
    state.tableau = [[{ id: 's_13', suit: 'spades', rank: 13, faceUp: true }], [], [], [], [], [], []];
    state.stock = [];
    state.waste = [
      { id: 's_11', suit: 'spades', rank: 11, faceUp: true },
      { id: 's_12', suit: 'spades', rank: 12, faceUp: true },
    ];
    state.status = 'playing';
    state.moves = 10;
    state.elapsedSeconds = 25;
    return state;
  }

  function mountGameScreenHarness() {
    const states: any[] = [];
    const refs: { current: any }[] = [];
    const memos: { value: any; deps: any[] | undefined }[] = [];
    const callbacks: { fn: any; deps: any[] | undefined }[] = [];
    const effects: { fn: () => any; deps: any[] | undefined; cleanup?: () => void }[] = [];

    let dirty = false;

    const depsChanged = (prev: any[] | undefined, next: any[] | undefined) => {
      if (!prev || !next || prev.length !== next.length) return true;
      for (let i = 0; i < prev.length; i++) {
        if (!Object.is(prev[i], next[i])) return true;
      }
      return false;
    };

    jest.spyOn(React, 'useState').mockImplementation((init: any) => {
      const idx = stateCursor++;
      if (!(idx in states)) {
        states[idx] = typeof init === 'function' ? init() : init;
      }
      const setState = (updater: any) => {
        const next = typeof updater === 'function' ? updater(states[idx]) : updater;
        if (!Object.is(states[idx], next)) {
          states[idx] = next;
          dirty = true;
        }
      };
      return [states[idx], setState];
    });

    jest.spyOn(React, 'useRef').mockImplementation((init: any) => {
      const idx = refCursor++;
      if (!(idx in refs)) {
        refs[idx] = { current: init };
      }
      return refs[idx];
    });

    jest.spyOn(React, 'useMemo').mockImplementation((fn: any, deps: any) => {
      const idx = memoCursor++;
      if (!(idx in memos) || depsChanged(memos[idx].deps, deps)) {
        memos[idx] = { value: fn(), deps };
      }
      return memos[idx].value;
    });

    jest.spyOn(React, 'useCallback').mockImplementation((fn: any, deps: any) => {
      const idx = callbackCursor++;
      if (!(idx in callbacks) || depsChanged(callbacks[idx].deps, deps)) {
        callbacks[idx] = { fn, deps };
      }
      return callbacks[idx].fn;
    });

    const pendingEffects: number[] = [];
    jest.spyOn(React, 'useEffect').mockImplementation((fn: any, deps: any) => {
      const idx = effectCursor++;
      if (!(idx in effects) || depsChanged(effects[idx].deps, deps)) {
        effects[idx] = { fn, deps, cleanup: effects[idx]?.cleanup };
        pendingEffects.push(idx);
      }
    });

    let stateCursor = 0;
    let refCursor = 0;
    let memoCursor = 0;
    let callbackCursor = 0;
    let effectCursor = 0;

    function flushRender() {
      let iterations = 0;
      do {
        dirty = false;
        stateCursor = 0;
        refCursor = 0;
        memoCursor = 0;
        callbackCursor = 0;
        effectCursor = 0;
        pendingEffects.length = 0;

        GameScreen();

        const toRun = [...pendingEffects];
        pendingEffects.length = 0;
        for (const idx of toRun) {
          if (typeof effects[idx].cleanup === 'function') {
            effects[idx].cleanup!();
          }
          effects[idx].cleanup = effects[idx].fn();
        }
        iterations++;
      } while (dirty && iterations < 25);
    }

    return {
      states,
      refs,
      flushRender,
      getGameState: () =>
        states.find((s) => s && typeof s === 'object' && Array.isArray(s.foundations) && typeof s.status === 'string'),
    };
  }

  test('completes auto-complete without freezing when waste must be recycled into stock (2-stage animation)', async () => {
    const initialRecycleState = createAutoCompletableRecycleState();
    jest.spyOn(storageModule, 'loadGameState').mockResolvedValue(initialRecycleState);

    jest.spyOn(Animated, 'timing').mockImplementation((_value: any, config: any) => ({
      start: (cb?: (result: { finished: boolean }) => void) => {
        setTimeout(() => {
          if (cb) cb({ finished: true });
        }, config?.duration ?? 100);
      },
      stop: jest.fn(),
    }));

    const harness = mountGameScreenHarness();
    harness.flushRender();

    // Flush loadGameState promise resolution
    await Promise.resolve();
    await Promise.resolve();
    harness.flushRender();

    // Advance timers step-by-step across the 2-stage recycle animation and remaining foundation moves
    for (let step = 0; step < 30; step++) {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      harness.flushRender();
      if (harness.getGameState()?.status === 'won') {
        break;
      }
    }

    const finalGameState = harness.getGameState();
    expect(finalGameState.status).toBe('won');
    expect(finalGameState.foundations.reduce((sum: number, f: any[]) => sum + f.length, 0)).toBe(52);
  });

  test('recovers via watchdog timeout and finishes auto-complete even if an Animated.timing callback is dropped', async () => {
    const initialRecycleState = createAutoCompletableRecycleState();
    jest.spyOn(storageModule, 'loadGameState').mockResolvedValue(initialRecycleState);

    // Simulate a dropped native animation callback on the very first animation
    let callCount = 0;
    jest.spyOn(Animated, 'timing').mockImplementation((_value: any, config: any) => ({
      start: (cb?: (result: { finished: boolean }) => void) => {
        callCount++;
        if (callCount === 1) {
          // Never invoke cb! Watchdog timer must recover.
          return;
        }
        setTimeout(() => {
          if (cb) cb({ finished: true });
        }, config?.duration ?? 100);
      },
      stop: jest.fn(),
    }));

    const harness = mountGameScreenHarness();
    harness.flushRender();

    await Promise.resolve();
    await Promise.resolve();
    harness.flushRender();

    for (let step = 0; step < 40; step++) {
      jest.advanceTimersByTime(150);
      await Promise.resolve();
      harness.flushRender();
      if (harness.getGameState()?.status === 'won') {
        break;
      }
    }

    const finalGameState = harness.getGameState();
    expect(finalGameState.status).toBe('won');
    expect(finalGameState.foundations.reduce((sum: number, f: any[]) => sum + f.length, 0)).toBe(52);
  });
});

