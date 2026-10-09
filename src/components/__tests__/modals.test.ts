import React from 'react';
import { StatsModal } from '../StatsModal';
import { SettingsModal } from '../SettingsModal';
import { ConfirmModal } from '../ConfirmModal';
import { GameOverModal } from '../GameOverModal';
import { WinModal } from '../WinModal';
import { SeedModal } from '../SeedModal';
import { modalStyles } from '../../theme';
import { getDailyChallengeSeed } from '../../engine/deck';

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

describe('Modal Backdrop Dismissal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(React, 'useEffect').mockImplementation(() => {});
    (jest.spyOn(React, 'useState') as any).mockImplementation((init: any) => [
      typeof init === 'function' ? init() : init,
      jest.fn(),
    ]);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  describe('StatsModal', () => {
    test('renders backdrop pressable that triggers onClose when clicked', () => {
      const onClose = jest.fn();
      const stats = {
        gamesPlayed: 10,
        gamesWon: 5,
        highScore: 500,
        bestTimeSeconds: 120,
      };

      const element: any = StatsModal({ visible: true, stats, onClose });
      expect(element).not.toBeNull();
      expect(element.props.onRequestClose).toBe(onClose);

      const backdropView = element.props.children;
      const [backdropPressable]: any[] = React.Children.toArray(backdropView.props.children);

      expect(backdropPressable.props.style).toEqual(modalStyles.backdropPressable);
      expect(typeof backdropPressable.props.onPress).toBe('function');

      backdropPressable.props.onPress();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('SettingsModal', () => {
    test('renders backdrop pressable that triggers onClose when clicked', () => {
      const onClose = jest.fn();
      const settings = {
        drawCount: 1 as const,
        autoMoveOnTap: true,
        soundEnabled: true,
        rightHanded: false,
      };

      const element: any = SettingsModal({
        visible: true,
        settings,
        onClose,
        onChangeDrawCount: jest.fn(),
        onToggleSound: jest.fn(),
        onToggleAutoMove: jest.fn(),
        onToggleRightHanded: jest.fn(),
      });

      expect(element).not.toBeNull();
      expect(element.props.onRequestClose).toBe(onClose);

      const backdropView = element.props.children;
      const [backdropPressable]: any[] = React.Children.toArray(backdropView.props.children);

      expect(backdropPressable.props.style).toEqual(modalStyles.backdropPressable);
      expect(typeof backdropPressable.props.onPress).toBe('function');

      backdropPressable.props.onPress();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('renders Daily Challenge and Custom Seed buttons and handles clicks', () => {
      const onClose = jest.fn();
      const onOpenSeedModal = jest.fn();
      const onPlayDailyChallenge = jest.fn();
      const settings = {
        drawCount: 1 as const,
        autoMoveOnTap: true,
        soundEnabled: true,
        rightHanded: false,
      };

      const element: any = SettingsModal({
        visible: true,
        settings,
        onClose,
        onChangeDrawCount: jest.fn(),
        onToggleSound: jest.fn(),
        onToggleAutoMove: jest.fn(),
        onToggleRightHanded: jest.fn(),
        onOpenSeedModal,
        onPlayDailyChallenge,
        currentSeed: '2026-10-09',
      });

      const dailyBtn = findByAccessibilityLabel(element, "Play today's daily challenge");
      expect(dailyBtn).toBeDefined();
      dailyBtn.props.onPress();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onPlayDailyChallenge).toHaveBeenCalledTimes(1);

      const customSeedBtn = findByAccessibilityLabel(element, 'Manage seed and challenge');
      expect(customSeedBtn).toBeDefined();
      customSeedBtn.props.onPress();
      expect(onClose).toHaveBeenCalledTimes(2);
      expect(onOpenSeedModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('ConfirmModal', () => {
    test('renders backdrop pressable that triggers onCancel when clicked off', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      const element: any = ConfirmModal({
        visible: true,
        title: 'Confirm Action',
        message: 'Are you sure?',
        onConfirm,
        onCancel,
      });

      expect(element).not.toBeNull();
      expect(element.props.onRequestClose).toBe(onCancel);

      const backdropView = element.props.children;
      const [backdropPressable]: any[] = React.Children.toArray(backdropView.props.children);

      expect(backdropPressable.props.style).toEqual(modalStyles.backdropPressable);
      expect(typeof backdropPressable.props.onPress).toBe('function');

      backdropPressable.props.onPress();
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    test('returns null when visible is false', () => {
      const element = ConfirmModal({
        visible: false,
        title: 'Hidden',
        message: 'Hidden message',
        onConfirm: jest.fn(),
        onCancel: jest.fn(),
      });

      expect(element).toBeNull();
    });
  });

  describe('GameOverModal', () => {
    test('renders backdrop pressable that triggers onClose when onClose is provided', () => {
      const onNewGame = jest.fn();
      const onClose = jest.fn();

      const element: any = GameOverModal({
        visible: true,
        score: 100,
        moves: 20,
        elapsedSeconds: 60,
        onNewGame,
        onClose,
      });

      expect(element).not.toBeNull();
      expect(element.props.onRequestClose).toBe(onClose);

      const backdropView = element.props.children;
      const children: any[] = React.Children.toArray(backdropView.props.children);
      const backdropPressable = children[0];

      expect(backdropPressable.props.style).toEqual(modalStyles.backdropPressable);
      expect(typeof backdropPressable.props.onPress).toBe('function');

      backdropPressable.props.onPress();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('does not render backdrop pressable when onClose is not provided', () => {
      const onNewGame = jest.fn();

      const element: any = GameOverModal({
        visible: true,
        score: 100,
        moves: 20,
        elapsedSeconds: 60,
        onNewGame,
      });

      expect(element).not.toBeNull();
      const backdropView = element.props.children;
      const children = React.Children.toArray(backdropView.props.children);
      // Only the card is rendered when onClose is undefined
      expect(children.length).toBe(1);
    });

    test('returns null when visible is false', () => {
      const element = GameOverModal({
        visible: false,
        score: 0,
        moves: 0,
        elapsedSeconds: 0,
        onNewGame: jest.fn(),
      });

      expect(element).toBeNull();
    });

    test('renders "No more moves available to advance the game." subtitle and Review Board button', () => {
      const onClose = jest.fn();
      const element: any = GameOverModal({
        visible: true,
        score: 150,
        moves: 25,
        elapsedSeconds: 90,
        reason: 'no_moves',
        onNewGame: jest.fn(),
        onClose,
      });

      const backdropView = element.props.children;
      const children: any[] = React.Children.toArray(backdropView.props.children);
      const card = children[1];
      const cardChildren: any[] = React.Children.toArray(card.props.children);

      // subtitle is the 3rd child (icon, title, subtitle)
      const subtitle = cardChildren[2];
      expect(subtitle.props.children).toBe('No more moves available to advance the game.');

      // Review Board button is the last child when onClose is provided
      const reviewBoardBtn = cardChildren[cardChildren.length - 1];
      expect(reviewBoardBtn.props.accessibilityLabel).toBe('Review board');
      reviewBoardBtn.props.onPress();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('renders "Replay Draw" button and triggers onReplayDraw when clicked', () => {
      const onReplayDraw = jest.fn();
      const onNewGame = jest.fn();

      const element: any = GameOverModal({
        visible: true,
        score: 120,
        moves: 18,
        elapsedSeconds: 75,
        onReplayDraw,
        onNewGame,
      });

      const backdropView = element.props.children;
      const card = React.Children.toArray(backdropView.props.children)[0] as any;
      const cardChildren: any[] = React.Children.toArray(card.props.children);

      // buttonContainer is the 5th child (index 4)
      const buttonContainer = cardChildren[4];
      const buttonRow = React.Children.toArray(buttonContainer.props.children)[0] as any;
      const buttons = React.Children.toArray(buttonRow.props.children);

      const replayBtn = buttons[0] as any;
      expect(replayBtn.props.accessibilityLabel).toBe('Replay draw');
      replayBtn.props.onPress();
      expect(onReplayDraw).toHaveBeenCalledTimes(1);

      const newGameBtn = buttons[1] as any;
      expect(newGameBtn.props.accessibilityLabel).toBe('New game');
      newGameBtn.props.onPress();
      expect(onNewGame).toHaveBeenCalledTimes(1);
    });

    test('supports onReplay alias and renders Undo Move when canUndo is true', () => {
      const onReplay = jest.fn();
      const onUndo = jest.fn();
      const onNewGame = jest.fn();

      const element: any = GameOverModal({
        visible: true,
        score: 120,
        moves: 18,
        elapsedSeconds: 75,
        canUndo: true,
        onUndo,
        onReplay,
        onNewGame,
      });

      const backdropView = element.props.children;
      const card = React.Children.toArray(backdropView.props.children)[0] as any;
      const cardChildren: any[] = React.Children.toArray(card.props.children);

      const buttonContainer = cardChildren[4];
      const containerChildren = React.Children.toArray(buttonContainer.props.children);

      // Replay button in buttonRow
      const buttonRow = containerChildren[0] as any;
      const rowButtons = React.Children.toArray(buttonRow.props.children);
      const replayBtn = rowButtons[0] as any;
      expect(replayBtn.props.accessibilityLabel).toBe('Replay draw');
      replayBtn.props.onPress();
      expect(onReplay).toHaveBeenCalledTimes(1);

      // Undo button is the second child in buttonContainer
      const undoBtn = containerChildren[1] as any;
      expect(undoBtn.props.accessibilityLabel).toBe('Undo move');
      undoBtn.props.onPress();
      expect(onUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe('WinModal', () => {
    test('renders backdrop pressable that triggers onClose when onClose is provided', () => {
      const onNewGame = jest.fn();
      const onClose = jest.fn();

      const element: any = WinModal({
        visible: true,
        score: 500,
        moves: 50,
        elapsedSeconds: 180,
        onNewGame,
        onClose,
      });

      expect(element).not.toBeNull();
      expect(element.props.onRequestClose).toBe(onClose);

      const backdropView = element.props.children;
      const children: any[] = React.Children.toArray(backdropView.props.children);
      const backdropPressable = children[0];

      expect(backdropPressable.props.style).toEqual(modalStyles.backdropPressable);
      expect(typeof backdropPressable.props.onPress).toBe('function');

      backdropPressable.props.onPress();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('does not render backdrop pressable when onClose is not provided', () => {
      const onNewGame = jest.fn();

      const element: any = WinModal({
        visible: true,
        score: 500,
        moves: 50,
        elapsedSeconds: 180,
        onNewGame,
      });

      expect(element).not.toBeNull();
      const backdropView = element.props.children;
      const children = React.Children.toArray(backdropView.props.children);
      // Only the card is rendered when onClose is undefined
      expect(children.length).toBe(1);
    });

    test('returns null when visible is false', () => {
      const element = WinModal({
        visible: false,
        score: 0,
        moves: 0,
        elapsedSeconds: 0,
        onNewGame: jest.fn(),
      });

      expect(element).toBeNull();
    });

    test('renders Share Deck button and seed badge when seed and onShare are provided', () => {
      const onShare = jest.fn();
      const element: any = WinModal({
        visible: true,
        score: 300,
        moves: 30,
        elapsedSeconds: 120,
        seed: 'lucky-deck',
        onNewGame: jest.fn(),
        onShare,
      });

      expect(element).not.toBeNull();
      const backdropView = element.props.children;
      const card = React.Children.toArray(backdropView.props.children)[0] as any;
      const cardChildren = React.Children.toArray(card.props.children);

      // Verify seed text is present
      const seedBadge = cardChildren.find((c: any) =>
        c?.props?.children?.props?.children?.toString().includes('lucky-deck')
      );
      expect(seedBadge).toBeDefined();

      // Find share button
      const actionsRow = cardChildren.find((c: any) =>
        React.Children.toArray(c?.props?.children).some(
          (b: any) => b?.props?.accessibilityLabel === 'Share deck'
        )
      ) as any;
      expect(actionsRow).toBeDefined();
      const shareBtn = React.Children.toArray(actionsRow.props.children).find(
        (b: any) => b?.props?.accessibilityLabel === 'Share deck'
      ) as any;
      expect(shareBtn).toBeDefined();
      shareBtn.props.onPress();
      expect(onShare).toHaveBeenCalledTimes(1);
    });

    test('renders Daily Challenge badge when seed is a date', () => {
      const element: any = WinModal({
        visible: true,
        score: 300,
        moves: 30,
        elapsedSeconds: 120,
        seed: '2026-10-09',
        onNewGame: jest.fn(),
      });

      const seedBadge = findTextContaining(element, 'Daily Challenge: #2026-10-09');
      expect(seedBadge).not.toBeNull();
    });
  });

  describe('GameOverModal Seed & Share', () => {
    test('renders Share Deck button and triggers onShare when clicked', () => {
      const onShare = jest.fn();
      const element: any = GameOverModal({
        visible: true,
        score: 100,
        moves: 20,
        elapsedSeconds: 60,
        seed: 'challenge-42',
        onNewGame: jest.fn(),
        onShare,
      });

      const backdropView = element.props.children;
      const card = React.Children.toArray(backdropView.props.children)[0] as any;
      const cardChildren = React.Children.toArray(card.props.children);
      const buttonContainer = cardChildren[4] as any;
      const buttons = React.Children.toArray(buttonContainer.props.children);

      const shareBtn = buttons.find((b: any) => b?.props?.accessibilityLabel === 'Share deck') as any;
      expect(shareBtn).toBeDefined();
      shareBtn.props.onPress();
      expect(onShare).toHaveBeenCalledTimes(1);
    });

    test('renders Daily Challenge badge when seed is a date', () => {
      const element: any = GameOverModal({
        visible: true,
        score: 100,
        moves: 20,
        elapsedSeconds: 60,
        seed: '2026-10-09',
        onNewGame: jest.fn(),
      });

      const seedBadge = findTextContaining(element, 'Daily Challenge: #2026-10-09');
      expect(seedBadge).not.toBeNull();
    });
  });

  describe('SeedModal', () => {
    test('renders backdrop and triggers onClose when clicked off', () => {
      const onClose = jest.fn();
      const onPlaySeed = jest.fn();
      const element: any = SeedModal({
        visible: true,
        currentSeed: 'my-test-seed',
        drawCount: 1,
        onClose,
        onPlaySeed,
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
      const element = SeedModal({
        visible: false,
        drawCount: 1,
        onClose: jest.fn(),
        onPlaySeed: jest.fn(),
      });

      expect(element).toBeNull();
    });

    test('renders Daily Challenge button and triggers onPlaySeed with today seed', () => {
      const onClose = jest.fn();
      const onPlaySeed = jest.fn();
      const todaySeed = getDailyChallengeSeed();

      const element: any = SeedModal({
        visible: true,
        currentSeed: 'custom-seed',
        drawCount: 1,
        onClose,
        onPlaySeed,
      });

      const dailyBtn = findByAccessibilityLabel(element, "Play today's daily challenge");
      expect(dailyBtn).toBeDefined();

      const textChild = React.Children.toArray(dailyBtn.props.children)[0] as any;
      expect(textChild.props.children).toBe('Play Today');

      dailyBtn.props.onPress();
      expect(onPlaySeed).toHaveBeenCalledWith(todaySeed);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('renders Replay on Daily Challenge button when currentSeed is today', () => {
      const onClose = jest.fn();
      const onPlaySeed = jest.fn();
      const todaySeed = getDailyChallengeSeed();

      const element: any = SeedModal({
        visible: true,
        currentSeed: todaySeed,
        drawCount: 1,
        onClose,
        onPlaySeed,
      });

      const dailyBtn = findByAccessibilityLabel(element, "Play today's daily challenge");
      expect(dailyBtn).toBeDefined();

      const textChild = React.Children.toArray(dailyBtn.props.children)[0] as any;
      expect(textChild.props.children).toBe('Replay');
    });

    test('renders current seed and handles share button click', () => {
      const onClose = jest.fn();
      const onPlaySeed = jest.fn();
      const onShareSeed = jest.fn();

      const element: any = SeedModal({
        visible: true,
        currentSeed: 'my-active-seed',
        drawCount: 1,
        onClose,
        onPlaySeed,
        onShareSeed,
      });

      const shareBtn = findByAccessibilityLabel(element, 'Share current seed');
      expect(shareBtn).toBeDefined();
      shareBtn.props.onPress();
      expect(onShareSeed).toHaveBeenCalledWith('my-active-seed');
    });
  });
});
