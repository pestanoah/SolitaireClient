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
    expect(findTextContaining(element, 'Current Streak')).not.toBeNull();
    expect(findTextContaining(element, 'Best Streak')).not.toBeNull();
    expect(findTextContaining(element, 'Completed')).not.toBeNull();
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

  test('focuses on the currentSeed date instead of today when currentSeed is provided', () => {
    const onPlayChallenge = jest.fn();
    const customHistory = {
      '2026-10-15': {
        completed: true,
        score: 710,
        moves: 58,
        elapsedSeconds: 90,
        completedAt: '2026-10-15T14:00:00Z',
      },
    };

    const element: any = DailyChallengeModal({
      visible: true,
      dailyHistory: customHistory,
      currentSeed: '2026-10-15_v2',
      onClose: jest.fn(),
      onPlayChallenge,
      referenceDate: fixedToday,
    });

    // Detail seed should show #2026-10-15
    expect(findTextContaining(element, '#2026-10-15')).not.toBeNull();
    expect(findTextContaining(element, '710')).not.toBeNull(); // Score for Oct 15

    const replayBtn = findByAccessibilityLabel(element, 'Replay daily challenge');
    expect(replayBtn).not.toBeNull();
    replayBtn.props.onPress();
    expect(onPlayChallenge).toHaveBeenCalledWith('2026-10-15', expect.any(String));
  });

  test('synchronizes active date and month view in useEffect when visible', () => {
    let effectCallback: (() => void) | null = null;
    jest.spyOn(React, 'useEffect').mockImplementation((fn: any) => {
      effectCallback = fn;
    });

    const setSelectedDate = jest.fn();
    const setViewYear = jest.fn();
    const setViewMonth = jest.fn();

    let stateCallIndex = 0;
    (jest.spyOn(React, 'useState') as any).mockImplementation((init: any) => {
      stateCallIndex++;
      if (stateCallIndex === 1) return [init, setSelectedDate];
      if (stateCallIndex === 2) return [init, setViewYear];
      if (stateCallIndex === 3) return [init, setViewMonth];
      return [init, jest.fn()];
    });

    DailyChallengeModal({
      visible: true,
      dailyHistory: {},
      currentSeed: '2026-08-10',
      onClose: jest.fn(),
      onPlayChallenge: jest.fn(),
      referenceDate: fixedToday,
    });

    expect(effectCallback).not.toBeNull();
    effectCallback!();

    expect(setSelectedDate).toHaveBeenCalledWith('2026-08-10');
    expect(setViewYear).toHaveBeenCalledWith(2026);
    expect(setViewMonth).toHaveBeenCalledWith(7); // August is month index 7
  });
});
