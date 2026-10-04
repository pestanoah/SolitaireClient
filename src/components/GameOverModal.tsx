import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, modalStyles, shadows, spacing, borderRadius, fontSize, fontWeight } from '../theme';

export interface GameOverModalProps {
  visible: boolean;
  score: number;
  moves: number;
  elapsedSeconds: number;
  reason?: 'no_moves' | 'forfeit';
  canUndo?: boolean;
  onUndo?: () => void;
  onNewGame: () => void;
  onClose?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  visible,
  score,
  moves,
  elapsedSeconds,
  reason = 'no_moves',
  canUndo = false,
  onUndo,
  onNewGame,
  onClose,
}) => {
  if (!visible) return null;

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
              : 'No more legal moves available.'}
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

          <View style={modalStyles.buttonRow}>
            {canUndo && onUndo && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onUndo}
                style={[modalStyles.actionBtn, styles.undoBtn]}
              >
                <Text style={styles.undoBtnText}>Undo Move</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onNewGame}
              style={[modalStyles.actionBtn, styles.newGameBtn]}
            >
              <Text style={styles.newGameBtnText}>New Game</Text>
            </TouchableOpacity>
          </View>
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
  undoBtn: {
    backgroundColor: colors.overlay.whiteFillSubtle,
    borderWidth: 1,
    borderColor: colors.overlay.whiteWatermark,
    ...shadows.button,
  },
  undoBtnText: {
    color: colors.slate[200],
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
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
});
