import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { isDateSeed } from '../engine/deck';
import { colors, modalStyles, shadows, spacing, borderRadius, fontSize, fontWeight } from '../theme';

export interface GameOverModalProps {
  visible: boolean;
  score: number;
  moves: number;
  elapsedSeconds: number;
  seed?: string;
  reason?: 'no_moves' | 'forfeit';
  canUndo?: boolean;
  onUndo?: () => void;
  onReplayDraw?: () => void;
  onReplay?: () => void;
  onNewGame: () => void;
  onClose?: () => void;
  onShare?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  visible,
  score,
  moves,
  elapsedSeconds,
  seed,
  reason = 'no_moves',
  canUndo = false,
  onUndo,
  onReplayDraw,
  onReplay,
  onNewGame,
  onClose,
  onShare,
}) => {
  if (!visible) return null;

  const handleReplay = onReplayDraw || onReplay;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.backdropDark}>
        {onClose && (
          <Pressable
            style={modalStyles.backdropPressable}
            onPress={onClose}
            accessibilityLabel="Close game over modal"
            accessibilityRole="button"
          />
        )}
        <View style={[modalStyles.cardBase, modalStyles.cardGameOver, styles.card]}>
          <Text style={modalStyles.headerIcon}>💔</Text>
          <Text style={modalStyles.title}>Game Over</Text>
          <Text style={styles.subtitle}>
            {reason === 'forfeit'
              ? 'You surrendered this game.'
              : 'No more moves available to advance the game.'}
          </Text>

          <View style={modalStyles.statsContainer}>
            <View style={modalStyles.statItem}>
              <Text style={modalStyles.statValue}>{score}</Text>
              <Text style={modalStyles.statLabel}>Final Score</Text>
            </View>

            <View style={modalStyles.statItem}>
              <Text style={modalStyles.statValue}>{moves}</Text>
              <Text style={modalStyles.statLabel}>Moves</Text>
            </View>

            <View style={modalStyles.statItem}>
              <Text style={modalStyles.statValue}>{timeFormatted}</Text>
              <Text style={modalStyles.statLabel}>Time</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <View style={modalStyles.buttonRow}>
              {handleReplay && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleReplay}
                  style={[modalStyles.actionBtn, styles.replayBtn]}
                  accessibilityLabel="Replay draw"
                  accessibilityRole="button"
                >
                  <Text style={styles.replayBtnText}>Replay Draw</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onNewGame}
                style={[modalStyles.actionBtn, styles.newGameBtn]}
                accessibilityLabel="New game"
                accessibilityRole="button"
              >
                <Text style={styles.newGameBtnText}>New Game</Text>
              </TouchableOpacity>
            </View>

            {canUndo && onUndo && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onUndo}
                style={[modalStyles.actionBtn, styles.undoBtn, styles.undoBtnFull]}
                accessibilityLabel="Undo move"
                accessibilityRole="button"
              >
                <Text style={styles.undoBtnText}>Undo Move</Text>
              </TouchableOpacity>
            )}

            {onShare && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onShare}
                style={[modalStyles.actionBtn, styles.shareBtn]}
                accessibilityLabel="Share deck"
                accessibilityRole="button"
              >
                <Text style={styles.shareBtnText}>Share Deck</Text>
              </TouchableOpacity>
            )}

            {seed && (
              <View style={styles.seedBadge}>
                <Text style={styles.seedText} numberOfLines={1} ellipsizeMode="middle">
                  {isDateSeed(seed) ? `Daily Challenge: #${seed}` : `Seed: #${seed}`}
                </Text>
              </View>
            )}
          </View>

          {onClose && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.reviewBoardBtn}
              accessibilityLabel="Review board"
              accessibilityRole="button"
            >
              <Text style={styles.reviewBoardText}>Review Board</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.modalLg,
    padding: spacing.modalPadding,
    ...shadows.modalLoss,
  },
  subtitle: {
    color: colors.action.destructiveText,
    fontSize: fontSize.body,
    marginTop: spacing.xs,
    marginBottom: spacing.xxxl,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  undoBtn: {
    backgroundColor: colors.overlay.whiteFillSubtle,
    borderWidth: 1,
    borderColor: colors.overlay.whiteWatermark,
    ...shadows.button,
  },
  undoBtnFull: {
    width: '100%',
  },
  undoBtnText: {
    color: colors.slate[200],
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  replayBtn: {
    backgroundColor: colors.action.primary,
    ...shadows.button,
  },
  replayBtnText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
  },
  newGameBtn: {
    backgroundColor: colors.action.success,
    ...shadows.button,
  },
  newGameBtnText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
  },
  shareBtn: {
    backgroundColor: colors.action.primary,
    width: '100%',
    ...shadows.button,
  },
  shareBtnText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  seedBadge: {
    alignSelf: 'center',
    backgroundColor: colors.overlay.panelDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteSubtle,
    maxWidth: '90%',
    marginTop: spacing.xs,
  },
  seedText: {
    color: colors.slate[400],
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.bold,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  reviewBoardBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBoardText: {
    color: colors.slate[400],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textDecorationLine: 'underline',
  },
});
