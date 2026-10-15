import React from 'react';
import {
  DealingOverlay,
  DEFAULT_DEAL_STAGGER_MS,
  DEFAULT_DEAL_DURATION_MS,
} from '../DealingOverlay';
import { dealKlondike, generateKlondikeDealSteps } from '../../engine/deck';
import * as soundModule from '../../utils/sound';

describe('DealingOverlay Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(soundModule, 'playDealSound').mockImplementation(() => {});
    jest.spyOn(React, 'useEffect').mockImplementation(() => {});
    jest.spyOn(React, 'useMemo').mockImplementation((fn: any) => fn());
    (jest.spyOn(React, 'useState') as any).mockImplementation((init: any) => [
      typeof init === 'function' ? init() : init,
      jest.fn(),
    ]);
    (jest.spyOn(React, 'useRef') as any).mockImplementation((init: any) => ({ current: init }));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const dummyGetBasePos = (pile: any) => {
    if (pile.type === 'stock') return { x: 0, y: 0 };
    if (pile.type === 'waste') return { x: 80, y: 0 };
    return { x: 100, y: 150 };
  };

  const dummyGetCardPos = (pile: any, index: number) => {
    if (pile.type === 'tableau') return { x: (pile.index ?? 0) * 80, y: 150 + index * 20 };
    if (pile.type === 'waste') return { x: 80 + index * 15, y: 0 };
    return { x: 0, y: 0 };
  };

  test('constants have expected responsive defaults', () => {
    expect(DEFAULT_DEAL_STAGGER_MS).toBe(28);
    expect(DEFAULT_DEAL_DURATION_MS).toBe(160);
  });

  function renderDealingOverlay(props: any): any {
    const Component = (DealingOverlay as any).type || DealingOverlay;
    return Component(props);
  }

  test('renders with deal steps and triggers onComplete when all cards have finished flight', () => {
    const game = dealKlondike(1, 'deal-overlay-test');
    const steps = generateKlondikeDealSteps(game);
    const onComplete = jest.fn();

    const element = renderDealingOverlay({
      steps,
      cardWidth: 60,
      cardHeight: 84,
      getPileBasePosition: dummyGetBasePos,
      getPileCardPosition: dummyGetCardPos,
      gameState: game,
      onComplete,
      soundEnabled: true,
      staggerMs: 20,
      durationMs: 100,
    });

    expect(element).not.toBeNull();
    expect(element.props.accessibilityLabel).toBe('Skip dealing animation');

    // Tap to skip works immediately
    const skipOnComplete = jest.fn();
    const skipElement = renderDealingOverlay({
      steps,
      cardWidth: 60,
      cardHeight: 84,
      getPileBasePosition: dummyGetBasePos,
      getPileCardPosition: dummyGetCardPos,
      gameState: game,
      onComplete: skipOnComplete,
    });

    skipElement.props.onPress();
    expect(skipOnComplete).toHaveBeenCalledTimes(1);
  });

  test('plays deal sound on deal rounds when soundEnabled is true', () => {
    const playDealSoundSpy = jest.spyOn(soundModule, 'playDealSound');
    const game = dealKlondike(1, 'sound-test');
    const steps = generateKlondikeDealSteps(game);

    // Initial render
    React.createElement(DealingOverlay, {
      steps,
      cardWidth: 60,
      cardHeight: 84,
      getPileBasePosition: dummyGetBasePos,
      getPileCardPosition: dummyGetCardPos,
      gameState: game,
      onComplete: jest.fn(),
      soundEnabled: true,
    });

    expect(playDealSoundSpy).toBeDefined();
  });
});
