import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayerStats } from '../engine/types';
import { colors, modalStyles, spacing, borderRadius, fontSize, fontWeight } from '../theme';

interface StatsModalProps {
  visible: boolean;
  stats: PlayerStats;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ visible, stats, onClose }) => {
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.backdropMedium}>
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
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
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
  closeBtn: {
    backgroundColor: colors.action.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: 32,
    borderRadius: borderRadius.lg,
  },
  closeText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
});
