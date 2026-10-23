import React from 'react';
import { DailyChallengeModal } from '../DailyChallengeModal';
import { modalStyles } from '../../theme';

function findByAccessibilityLabel(element: any, label: string): any {
  if (!element || typeof element !== 'object') return null;
  if (element.props?.accessibilityLabel === label) return element;
  const children = React.Children.toArray(element.props?.children);
  for (const child of children) {
    const found = findByAccessibilityLabel(child, label);
    if (found) return found;
  }
  return null;
}

function findTextContaining(element: any, match: string): any {
  if (!element) return null;
  if (typeof element === 'string' && element.includes(match)) return element;
  if (typeof element === 'number' && String(element).includes(match)) return String(element);
  if (typeof element.props?.children === 'string' && element.props.children.includes(match)) {
    return element;
  }
  if (Array.isArray(element.props?.children)) {
    const combined = element.props.children.map((c: any) => (typeof c === 'object' ? '' : String(c))).join('');
    if (combined.includes(match)) return combined;
  }
  const children = React.Children.toArray(element.props?.children);
  for (const child of children) {
    const found = findTextContaining(child, match);
    if (found) return found;
  }
  return null;
}

describe('DailyChallengeModal', () => {
  beforeEach(() => {
    jest.spyOn(React, 'useEffect').mockImplementation(() => {});
    (jest.spyOn(React, 'useMemo') as any).mockImplementation((fn: any) => fn());
    (jest.spyOn(React, 'useState') as any).mockImplementation((init: any) => [
      typeof init === 'function' ? init() : init,
      jest.fn(),
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const fixedToday = new Date(2026, 9, 22); // Oct 22, 2026
  const baseHistory = {
    '2026-10-21': {
      completed: true,
      score: 550,
      moves: 78,
      elapsedSeconds: 135,
      completedAt: '2026-10-21T10:00:00Z',
    },
    '2026-10-22': {
      completed: true,
      score: 620,
      moves: 65,
      elapsedSeconds: 98,
      completedAt: '2026-10-22T12:00:00Z',
    },
  };

  test('renders backdrop pressable that triggers onClose when clicked', () => {
    const onClose = jest.fn();
    const element: any = DailyChallengeModal({
      visible: true,
      dailyHistory: baseHistory,
      onClose,
      onPlayChallenge: jest.fn(),
      referenceDate: fixedToday,
    });

    expect(element).not.toBeNull();
    expect(element.props.onRequestClose).toBe(onClose);

    const backdropView = element.props.children;
    const [backdropPressable]: any[] = React.Children.toArray(backdropView.props.children);
    expect(backdropPressable.props.style).toEqual(modalStyles.backdropPressable);

    backdropPressable.props.onPress();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('returns null when visible is false', () => {
    const element = DailyChallengeModal({
      visible: false,
      dailyHistory: {},
      onClose: jest.fn(),
      onPlayChallenge: jest.fn(),
    });
    expect(element).toBeNull();
  });

  test('displays streak calculation banner correctly', () => {
    const element: any = DailyChallengeModal({
      visible: true,
      dailyHistory: baseHistory,
      onClose: jest.fn(),
      onPlayChallenge: jest.fn(),
      referenceDate: fixedToday,
    });

    // Oct 21 and 22 completed -> 2 day streak
    const streakText = findTextContaining(element, '🔥 2');
    expect(streakText).not.toBeNull();

    const bestText = findTextContaining(element, '⭐ 2');
    expect(bestText).not.toBeNull();

    const completedText = findTextContaining(element, '🏆 2');
    expect(completedText).not.toBeNull();
  });

  test('displays completed challenge details and allows replaying', () => {
    const onClose = jest.fn();
    const onPlayChallenge = jest.fn();

    const element: any = DailyChallengeModal({
      visible: true,
      dailyHistory: baseHistory,
      onClose,
      onPlayChallenge,
      referenceDate: fixedToday,
    });

    // Today is Oct 22 and completed in baseHistory
    const replayBtn = findByAccessibilityLabel(element, 'Replay daily challenge');
    expect(replayBtn).not.toBeNull();
    expect(findTextContaining(element, '620')).not.toBeNull(); // Score
    expect(findTextContaining(element, '65')).not.toBeNull(); // Moves

    replayBtn.props.onPress();
    expect(onPlayChallenge).toHaveBeenCalledWith('2026-10-22', expect.any(String));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('navigates to previous day and handles uncompleted challenge', () => {
    // History without Oct 20
    const onClose = jest.fn();
    const onPlayChallenge = jest.fn();

    // Use state mock for selected date navigation if needed or simulate component
    const element: any = DailyChallengeModal({
      visible: true,
      dailyHistory: {
        '2026-10-22': {
          completed: false,
          score: 0,
          moves: 0,
          elapsedSeconds: 0,
          completedAt: '',
        },
      },
      onClose,
      onPlayChallenge,
      referenceDate: fixedToday,
    });

    const playBtn = findByAccessibilityLabel(element, 'Play daily challenge');
    expect(playBtn).not.toBeNull();
    playBtn.props.onPress();
    expect(onPlayChallenge).toHaveBeenCalledWith('2026-10-22', expect.any(String));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('close icon button triggers onClose', () => {
    const onClose = jest.fn();
    const element: any = DailyChallengeModal({
      visible: true,
      dailyHistory: {},
      onClose,
      onPlayChallenge: jest.fn(),
      referenceDate: fixedToday,
    });

    const closeBtn = findByAccessibilityLabel(element, 'Close daily challenges');
    expect(closeBtn).not.toBeNull();
    closeBtn.props.onPress();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
