import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { isDateSeed } from '../engine/deck';
import { colors, modalStyles, shadows, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { triggerWinConfetti } from '../utils/confetti';

export interface WinModalProps {
  visible: boolean;
  score: number;
  moves: number;
  elapsedSeconds: number;
  seed?: string;
  dailyStreak?: number;
  onNewGame: () => void;
  onReplaySeed?: () => void;
  onReplayDraw?: () => void;
  onReplay?: () => void;
  onClose?: () => void;
  onShare?: (stats?: { score: number; elapsedSeconds: number }) => void;
  onOpenDailyModal?: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({
  visible,
  score,
  moves,
  elapsedSeconds,
  seed,
  dailyStreak,
  onNewGame,
  onReplaySeed,
  onReplayDraw,
  onReplay,
  onClose,
  onShare,
  onOpenDailyModal,
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

  const handleReplay = onReplaySeed || onReplayDraw || onReplay;
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

          {seed ? (
            <View style={styles.seedBadge}>
              <Text style={styles.seedText} numberOfLines={1} ellipsizeMode="middle">
                {isDateSeed(seed) ? `Daily Challenge: #${seed}` : `Seed: #${seed}`}
              </Text>
            </View>
          ) : null}

          {isDateSeed(seed) && dailyStreak !== undefined && dailyStreak > 0 && (
            <View style={styles.streakWinBadge}>
              <Text style={styles.streakWinText}>{`🔥 ${dailyStreak} Day Streak!`}</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <View style={modalStyles.buttonRow}>
              {handleReplay ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleReplay}
                  style={[modalStyles.actionBtn, styles.replayBtn]}
                  accessibilityLabel="Replay seed"
                  accessibilityRole="button"
                >
                  <Text style={styles.replayBtnText}>Replay Seed</Text>
                </TouchableOpacity>
              ) : null}

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

            {isDateSeed(seed) && onOpenDailyModal && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  onClose?.();
                  onOpenDailyModal();
                }}
                style={[modalStyles.actionBtn, styles.calendarBtn]}
                accessibilityLabel="View daily challenges calendar"
                accessibilityRole="button"
              >
                <Text style={styles.calendarBtnText}>Daily Challenges Calendar</Text>
              </TouchableOpacity>
            )}

            {onShare ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onShare({ score, elapsedSeconds })}
                style={[modalStyles.actionBtn, styles.shareBtn]}
                accessibilityLabel="Share deck"
                accessibilityRole="button"
              >
                <Text style={styles.shareBtnText}>Share Deck</Text>
              </TouchableOpacity>
            ) : null}
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
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteSubtle,
  },
  seedBadge: {
    backgroundColor: colors.overlay.panelDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteSubtle,
    maxWidth: '90%',
  },
  seedText: {
    color: colors.felt.accent,
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.bold,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  statLabel: {
    color: colors.felt.accent,
    fontSize: fontSize.subtext,
    marginTop: spacing.xs,
    fontWeight: fontWeight.semibold,
  },
  replayBtn: {
    backgroundColor: colors.action.primary,
    paddingHorizontal: spacing.sm,
    ...shadows.button,
  },
  replayBtnText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
  },
  newGameBtn: {
    backgroundColor: colors.action.success,
    paddingHorizontal: spacing.sm,
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
  reviewBoardBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBoardText: {
    color: colors.felt.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textDecorationLine: 'underline',
  },
  streakWinBadge: {
    backgroundColor: colors.slate[800],
    borderWidth: 1,
    borderColor: colors.action.info,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  streakWinText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
  },
  calendarBtn: {
    backgroundColor: colors.slate[800],
    borderWidth: 1,
    borderColor: colors.felt.surface,
    width: '100%',
  },
  calendarBtnText: {
    color: colors.felt.accent,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
});
