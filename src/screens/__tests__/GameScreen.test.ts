jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));

import { AUTO_COMPLETE_DELAY_MS, AUTO_COMPLETE_ANIMATION_DURATION_MS } from '../GameScreen';

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
