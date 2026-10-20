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
  if (!element) return null;
  if (typeof element === 'string' && element.includes(match)) return element;
  if (typeof element.props?.children === 'string' && element.props.children.includes(match)) {
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

  it('renders the Winnable? button when onCheckWinnable is passed in portrait', () => {
    const onCheckWinnable = jest.fn();
    const tree = renderHeader({ ...baseProps, onCheckWinnable });

    const btn = findByAccessibilityLabel(tree, 'Check if game is winnable');
    expect(btn).not.toBeNull();
    expect(btn.props.disabled).toBe(false);

    // Verify button text
    const text = findTextContaining(btn, 'Winnable?');
    expect(text).not.toBeNull();

    // Trigger press
    btn.props.onPress();
    expect(onCheckWinnable).toHaveBeenCalledTimes(1);
  });

  it('shows Checking… and disables the button when isCheckingWinnable is true', () => {
    const tree = renderHeader({
      ...baseProps,
      isCheckingWinnable: true,
    });

    const btn = findByAccessibilityLabel(tree, 'Checking winnability');
    expect(btn).not.toBeNull();
    expect(btn.props.disabled).toBe(true);

    const text = findTextContaining(btn, 'Checking…');
    expect(text).not.toBeNull();
  });

  it('disables the button when canCheckWinnable is false', () => {
    const tree = renderHeader({
      ...baseProps,
      canCheckWinnable: false,
    });

    const btn = findByAccessibilityLabel(tree, 'Check if game is winnable');
    expect(btn).not.toBeNull();
    expect(btn.props.disabled).toBe(true);
  });

  it('renders the Winnable? button in landscape mode', () => {
    const onCheckWinnable = jest.fn();
    const tree = renderHeader({
      ...baseProps,
      isLandscape: true,
      onCheckWinnable,
    });

    const btn = findByAccessibilityLabel(tree, 'Check if game is winnable');
    expect(btn).not.toBeNull();

    const text = findTextContaining(btn, 'Winnable?');
    expect(text).not.toBeNull();

    btn.props.onPress();
    expect(onCheckWinnable).toHaveBeenCalledTimes(1);
  });
});
