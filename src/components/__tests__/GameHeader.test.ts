import React from 'react';
import * as RN from 'react-native';
import { GameHeader } from '../GameHeader';

jest.spyOn(RN, 'useWindowDimensions').mockReturnValue({ width: 375, height: 667, scale: 2, fontScale: 1 });

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
  if (element === null || element === undefined) return null;
  if ((typeof element === 'string' || typeof element === 'number') && String(element).includes(match)) {
    return element;
  }
  if (
    (typeof element.props?.children === 'string' || typeof element.props?.children === 'number') &&
    String(element.props.children).includes(match)
  ) {
    return element;
  }
  const children = React.Children.toArray(element.props?.children);
  for (const child of children) {
    const found = findTextContaining(child, match);
    if (found) return found;
  }
  return null;
}

describe('GameHeader Winnable Button', () => {
  const baseProps = {
    score: 100,
    moves: 12,
    elapsedSeconds: 65,
    drawCount: 1 as const,
    canUndo: true,
    canHint: true,
    canGiveUp: true,
    canCheckWinnable: true,
    isCheckingWinnable: false,
    soundEnabled: true,
    isLandscape: false,
    onUndo: jest.fn(),
    onHint: jest.fn(),
    onGiveUp: jest.fn(),
    onCheckWinnable: jest.fn(),
    onNewGame: jest.fn(),
    onOpenStats: jest.fn(),
    onOpenSettings: jest.fn(),
  };

  function renderHeader(props: any): any {
    const Component = (GameHeader as any).type || GameHeader;
    return Component(props);
  }

  describe('GameHeader Landscape Winnable Button', () => {
    it('renders the Winnable? button in landscape mode', () => {
      const onCheckWinnable = jest.fn();
      const tree = renderHeader({
        ...baseProps,
        isLandscape: true,
        onCheckWinnable,
      });

      const btn = findByAccessibilityLabel(tree, 'Check if game is winnable');
      expect(btn).not.toBeNull();
      expect(btn.props.disabled).toBe(false);

      const text = findTextContaining(btn, 'Winnable?');
      expect(text).not.toBeNull();

      btn.props.onPress();
      expect(onCheckWinnable).toHaveBeenCalledTimes(1);
    });

    it('shows Checking… and disables the button when isCheckingWinnable is true in landscape', () => {
      const tree = renderHeader({
        ...baseProps,
        isLandscape: true,
        isCheckingWinnable: true,
      });

      const btn = findByAccessibilityLabel(tree, 'Checking winnability');
      expect(btn).not.toBeNull();
      expect(btn.props.disabled).toBe(true);

      const text = findTextContaining(btn, 'Checking…');
      expect(text).not.toBeNull();
    });

    it('disables the button when canCheckWinnable is false in landscape', () => {
      const tree = renderHeader({
        ...baseProps,
        isLandscape: true,
        canCheckWinnable: false,
      });

      const btn = findByAccessibilityLabel(tree, 'Check if game is winnable');
      expect(btn).not.toBeNull();
      expect(btn.props.disabled).toBe(true);
    });
  });

  describe('GameHeader Portrait Top Bar', () => {
    it('renders score, moves, formatted time, new game, stats, and settings buttons in portrait', () => {
      const onNewGame = jest.fn();
      const onOpenStats = jest.fn();
      const onOpenSettings = jest.fn();

      const tree = renderHeader({
        ...baseProps,
        onNewGame,
        onOpenStats,
        onOpenSettings,
      });

      expect(findTextContaining(tree, '100')).not.toBeNull();
      expect(findTextContaining(tree, '12')).not.toBeNull();
      expect(findTextContaining(tree, '01:05')).not.toBeNull();

      const newGameBtn = findByAccessibilityLabel(tree, 'Deal new game');
      expect(newGameBtn).not.toBeNull();
      newGameBtn.props.onPress();
      expect(onNewGame).toHaveBeenCalledTimes(1);

      const statsBtn = findByAccessibilityLabel(tree, 'View statistics');
      expect(statsBtn).not.toBeNull();
      statsBtn.props.onPress();
      expect(onOpenStats).toHaveBeenCalledTimes(1);

      const settingsBtn = findByAccessibilityLabel(tree, 'Open settings');
      expect(settingsBtn).not.toBeNull();
      settingsBtn.props.onPress();
      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });
  });

  it('renders Daily button and triggers onOpenDailyChallenge', () => {
    const onOpenDailyChallenge = jest.fn();
    const tree = renderHeader({
      ...baseProps,
      onOpenDailyChallenge,
    });

    const btn = findByAccessibilityLabel(tree, 'Open daily challenges');
    expect(btn).not.toBeNull();
    expect(findTextContaining(btn, 'Daily')).not.toBeNull();

    btn.props.onPress();
    expect(onOpenDailyChallenge).toHaveBeenCalledTimes(1);
  });

  it('displays streak count when dailyStreak is positive', () => {
    const tree = renderHeader({
      ...baseProps,
      onOpenDailyChallenge: jest.fn(),
      dailyStreak: 4,
    });

    const btn = findByAccessibilityLabel(tree, 'Open daily challenges');
    expect(btn).not.toBeNull();
    expect(findTextContaining(btn, 'Daily (4)')).not.toBeNull();
  });

  it('tapping Daily challenge seed badge opens daily challenge modal', () => {
    const onOpenDailyChallenge = jest.fn();
    const tree = renderHeader({
      ...baseProps,
      seed: '2026-10-22',
      onOpenDailyChallenge,
    });

    const badge = findByAccessibilityLabel(tree, 'Daily challenge: #2026-10-22. Tap to view calendar.');
    expect(badge).not.toBeNull();
    badge.props.onPress();
    expect(onOpenDailyChallenge).toHaveBeenCalledTimes(1);
  });

  describe('Safe Area Inset and Layout Styling', () => {
    it('applies top safe area padding in portrait mode with topInset', () => {
      const tree = renderHeader({
        ...baseProps,
        isLandscape: false,
        topInset: 47,
      });

      const style = RN.StyleSheet.flatten(tree.props.style);
      expect(style).toBeDefined();
      expect(style.backgroundColor).toBeDefined();
      expect(style.borderBottomWidth).toBe(1);
    });

    it('applies top safe area padding in landscape mode with topInset', () => {
      const tree = renderHeader({
        ...baseProps,
        isLandscape: true,
        topInset: 20,
      });

      const style = RN.StyleSheet.flatten(tree.props.style);
      expect(style).toBeDefined();
      expect(style.flexDirection).toBe('row');
    });
  });
});
