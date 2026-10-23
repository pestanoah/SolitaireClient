import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayerStats } from '../engine/types';
import { colors, modalStyles, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { ConfirmModal } from './ConfirmModal';

export interface StatsModalProps {
  visible: boolean;
  stats: PlayerStats;
  dailyStreak?: number;
  longestDailyStreak?: number;
  dailyWonCount?: number;
  onClose: () => void;
  onResetStats?: () => void;
  onReset?: () => void;
  onOpenDailyModal?: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  visible,
  stats,
  dailyStreak,
  longestDailyStreak,
  dailyWonCount,
  onClose,
  onResetStats,
  onReset,
  onOpenDailyModal,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  const formatTime = (totalSecs: number | null): string => {
    if (totalSecs === null) return '--:--';
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    setShowConfirm(false);
    onClose();
  };

  const handleConfirmReset = () => {
    setShowConfirm(false);
    (onResetStats || onReset)?.();
  };

  const handleCancelReset = () => {
    setShowConfirm(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.backdropMedium}>
        <Pressable
          style={modalStyles.backdropPressable}
          onPress={handleClose}
          accessibilityLabel="Close statistics modal"
          accessibilityRole="button"
        />
        <View style={[modalStyles.cardBase, modalStyles.cardDark]}>
          <Text style={styles.title}>Statistics</Text>

          <View style={styles.grid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.gamesPlayed}</Text>
              <Text style={styles.statLabel}>Played</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.gamesWon}</Text>
              <Text style={styles.statLabel}>Won</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>{winRate}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.highScore}</Text>
              <Text style={styles.statLabel}>High Score</Text>
            </View>

            <View style={[styles.statBox, styles.wideBox]}>
              <Text style={styles.statValue}>{formatTime(stats.bestTimeSeconds)}</Text>
              <Text style={styles.statLabel}>Best Time</Text>
            </View>

            {dailyStreak !== undefined && (
              <>
                <View style={[styles.statBox, styles.streakBox]}>
                  <Text style={styles.streakValue}>{dailyStreak}</Text>
                  <Text style={styles.statLabel}>Daily Streak</Text>
                </View>

                <View style={[styles.statBox, styles.streakBox]}>
                  <Text style={styles.streakValue}>{longestDailyStreak ?? dailyStreak}</Text>
                  <Text style={styles.statLabel}>Best Streak</Text>
                </View>
              </>
            )}
          </View>

          {onOpenDailyModal && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                handleClose();
                onOpenDailyModal();
              }}
              style={styles.dailyCalendarLinkBtn}
              accessibilityLabel="View daily challenges calendar and streak"
              accessibilityRole="button"
            >
              <Text style={styles.dailyCalendarLinkText}>
                View Daily Challenge Calendar
              </Text>
            </TouchableOpacity>
          )}

          <View style={modalStyles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowConfirm(true)}
              style={[modalStyles.actionBtn, styles.resetBtn]}
              accessibilityLabel="Reset statistics"
              accessibilityRole="button"
            >
              <Text style={styles.resetText}>Reset Stats</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleClose}
              style={[modalStyles.actionBtn, styles.closeBtn]}
              accessibilityLabel="Close statistics"
              accessibilityRole="button"
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showConfirm && (
          <ConfirmModal
            visible={showConfirm}
            title="Reset Statistics?"
            message="Are you sure you want to reset all statistics? This action cannot be undone."
            confirmLabel="Reset"
            cancelLabel="Cancel"
            isDestructive={true}
            onConfirm={handleConfirmReset}
            onCancel={handleCancelReset}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  title: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
    marginBottom: spacing.xxxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.section,
  },
  statBox: {
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.xl,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[700],
  },
  wideBox: {
    width: '100%',
  },
  statValue: {
    color: colors.action.info,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
  },
  statLabel: {
    color: colors.slate[400],
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    fontWeight: fontWeight.semibold,
  },
  resetBtn: {
    backgroundColor: colors.slate[700],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
  },
  resetText: {
    color: colors.action.destructiveText,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  closeBtn: {
    backgroundColor: colors.action.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
  },
  closeText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  streakBox: {
    borderColor: colors.action.info,
  },
  streakValue: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
  },
  dailyCalendarLinkBtn: {
    backgroundColor: colors.slate[800],
    borderWidth: 1,
    borderColor: colors.felt.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.section,
  },
  dailyCalendarLinkText: {
    color: colors.felt.accent,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
});
