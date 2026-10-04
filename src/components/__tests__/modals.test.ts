import React from 'react';
import { StatsModal } from '../StatsModal';
import { SettingsModal } from '../SettingsModal';
import { ConfirmModal } from '../ConfirmModal';
import { GameOverModal } from '../GameOverModal';
import { WinModal } from '../WinModal';
import { modalStyles } from '../../theme';

describe('Modal Backdrop Dismissal', () => {
  beforeEach(() => {
    jest.spyOn(React, 'useEffect').mockImplementation(() => {});
  });

  afterEach(() => {
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
  });
});
