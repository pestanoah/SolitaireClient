import React from 'react';
import { BottomBar } from '../BottomBar';

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

describe('BottomBar Component', () => {
  const baseProps = {
    canUndo: true,
    canHint: true,
    canCheckWinnable: true,
    isCheckingWinnable: false,
    canGiveUp: true,
    onUndo: jest.fn(),
    onHint: jest.fn(),
    onCheckWinnable: jest.fn(),
    onGiveUp: jest.fn(),
  };

  function renderBar(props: any): any {
    const Component = (BottomBar as any).type || BottomBar;
    return Component(props);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Undo Button', () => {
    it('renders enabled Undo button and calls onUndo on press', () => {
      const onUndo = jest.fn();
      const tree = renderBar({ ...baseProps, onUndo });

      const btn = findByAccessibilityLabel(tree, 'Undo move');
      expect(btn).not.toBeNull();
      expect(btn.props.disabled).toBe(false);
      expect(findTextContaining(btn, 'Undo')).not.toBeNull();

      btn.props.onPress();
      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('disables Undo button when canUndo is false', () => {
      const tree = renderBar({ ...baseProps, canUndo: false });
      const btn = findByAccessibilityLabel(tree, 'Undo move');
      expect(btn).not.toBeNull();
      expect(btn.props.disabled).toBe(true);
    });
  });

  describe('Hint Button', () => {
    it('renders enabled Hint button and calls onHint on press', () => {
      const onHint = jest.fn();
      const tree = renderBar({ ...baseProps, onHint });

      const btn = findByAccessibilityLabel(tree, 'Show hint');
      expect(btn).not.toBeNull();
      expect(btn.props.disabled).toBe(false);
      expect(findTextContaining(btn, 'Hint')).not.toBeNull();

      btn.props.onPress();
      expect(onHint).toHaveBeenCalledTimes(1);
    });

    it('disables Hint button when canHint is false', () => {
      const tree = renderBar({ ...baseProps, canHint: false });
      const btn = findByAccessibilityLabel(tree, 'Show hint');
      expect(btn).not.toBeNull();
      expect(btn.props.disabled).toBe(true);
    });
  });

  describe('Winnable? Button', () => {
    it('renders enabled Winnable? button and calls onCheckWinnable on press', () => {
      const onCheckWinnable = jest.fn();
      const tree = renderBar({ ...baseProps, onCheckWinnable });

      const btn = findByAccessibilityLabel(tree, 'Check if game is winnable');
      expect(btn).not.toBeNull();
      expect(btn.props.disabled).toBe(false);
      expect(findTextContaining(btn, 'Winnable?')).not.toBeNull();

      btn.props.onPress();
      expect(onCheckWinnable).toHaveBeenCalledTimes(1);
    });

    it('shows Checking… and disables button when isCheckingWinnable is true', () => {
      const tree = renderBar({ ...baseProps, isCheckingWinnable: true });
      const btn = findByAccessibilityLabel(tree, 'Checking winnability');
      expect(btn).not.toBeNull();
      expect(btn.props.disabled).toBe(true);
      expect(findTextContaining(btn, 'Checking…')).not.toBeNull();
    });

    it('disables button when canCheckWinnable is false', () => {
      const tree = renderBar({ ...baseProps, canCheckWinnable: false });
      const btn = findByAccessibilityLabel(tree, 'Check if game is winnable');
      expect(btn).not.toBeNull();
      expect(btn.props.disabled).toBe(true);
    });
  });

  describe('Give Up Button', () => {
    it('renders Give Up button when onGiveUp is provided and calls onGiveUp on press', () => {
      const onGiveUp = jest.fn();
      const tree = renderBar({ ...baseProps, onGiveUp });

      const btn = findByAccessibilityLabel(tree, 'Give up game');
      expect(btn).not.toBeNull();
      expect(btn.props.disabled).toBe(false);
      expect(findTextContaining(btn, 'Give Up')).not.toBeNull();

      btn.props.onPress();
      expect(onGiveUp).toHaveBeenCalledTimes(1);
    });

    it('disables Give Up button when canGiveUp is false', () => {
      const tree = renderBar({ ...baseProps, canGiveUp: false });
      const btn = findByAccessibilityLabel(tree, 'Give up game');
      expect(btn).not.toBeNull();
      expect(btn.props.disabled).toBe(true);
    });
  });
});
