import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayerStats } from '../engine/types';

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
      <View style={styles.backdrop}>
        <View style={styles.card}>
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  statBox: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 8,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  wideBox: {
    width: '100%',
  },
  statValue: {
    color: '#38bdf8',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  closeBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  closeText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
