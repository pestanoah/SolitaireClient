import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, modalStyles, shadows, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { triggerWinConfetti } from '../utils/confetti';

interface WinModalProps {
  visible: boolean;
  score: number;
  moves: number;
  elapsedSeconds: number;
  onNewGame: () => void;
  onClose?: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({
  visible,
  score,
  moves,
  elapsedSeconds,
  onNewGame,
  onClose,
}) => {
  useEffect(() => {
    if (visible) {
      const cleanup = triggerWinConfetti();
      return () => {
        cleanup();
      };
    }
  }, [visible]);

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
            accessibilityLabel="Close victory modal"
            accessibilityRole="button"
          />
        )}
        <View style={[modalStyles.cardBase, modalStyles.cardFelt, styles.card]}>
          <Text style={styles.celebrationIcon}>🎉</Text>
          <Text style={modalStyles.title}>Victory!</Text>
          <Text style={styles.subtitle}>You completed the game!</Text>

          <View style={styles.statsContainer}>
            <View style={modalStyles.statItem}>
              <Text style={modalStyles.statValue}>{score}</Text>
              <Text style={styles.statLabel}>Final Score</Text>
            </View>

            <View style={modalStyles.statItem}>
              <Text style={modalStyles.statValue}>{moves}</Text>
              <Text style={styles.statLabel}>Moves</Text>
            </View>

            <View style={modalStyles.statItem}>
              <Text style={modalStyles.statValue}>{timeFormatted}</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onNewGame}
            style={styles.playAgainBtn}
          >
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.modalLg,
    padding: spacing.modalPadding,
    ...shadows.modalWin,
  },
  celebrationIcon: {
    fontSize: 54,
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.felt.textMuted,
    fontSize: fontSize.body,
    marginTop: spacing.xs,
    marginBottom: spacing.xxxl,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: colors.overlay.panelMedium,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    marginBottom: spacing.section,
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteSubtle,
  },
  statLabel: {
    color: colors.felt.accent,
    fontSize: fontSize.subtext,
    marginTop: spacing.xs,
    fontWeight: fontWeight.semibold,
  },
  playAgainBtn: {
    backgroundColor: colors.action.success,
    paddingVertical: spacing.xl,
    paddingHorizontal: 36,
    borderRadius: borderRadius.xl,
    ...shadows.button,
  },
  playAgainText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.heavy,
  },
});
