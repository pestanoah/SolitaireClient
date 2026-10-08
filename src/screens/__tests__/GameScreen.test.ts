jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));

import {
  AUTO_COMPLETE_DELAY_MS,
  AUTO_COMPLETE_ANIMATION_DURATION_MS,
  calculatePileBasePosition,
  calculatePileCardPosition,
  PilePositionParams,
} from '../GameScreen';
import { dealKlondike } from '../../engine/deck';

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
});
