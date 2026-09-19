import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GameHeaderProps {
  score: number;
  moves: number;
  elapsedSeconds: number;
  drawCount: 1 | 3;
  canUndo: boolean;
  onUndo: () => void;
  onNewGame: () => void;
  onToggleDrawCount: () => void;
  onOpenStats: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  score,
  moves,
  elapsedSeconds,
  drawCount,
  canUndo,
  onUndo,
  onNewGame,
  onToggleDrawCount,
  onOpenStats,
}) => {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <View style={styles.header}>
      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>SCORE</Text>
          <Text style={styles.metricValue}>{score}</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>MOVES</Text>
          <Text style={styles.metricValue}>{moves}</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>TIME</Text>
          <Text style={styles.metricValue}>{timeFormatted}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onToggleDrawCount}
          style={styles.modeBadge}
        >
          <Text style={styles.modeLabel}>Draw Mode</Text>
          <Text style={styles.modeValue}>Draw {drawCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={!canUndo}
          onPress={onUndo}
          style={[styles.actionBtn, !canUndo && styles.btnDisabled]}
        >
          <Text style={[styles.actionBtnText, !canUndo && styles.btnTextDisabled]}>
            Undo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenStats}
          style={styles.actionBtn}
        >
          <Text style={styles.actionBtnText}>Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onNewGame}
          style={[styles.actionBtn, styles.newGameBtn]}
        >
          <Text style={[styles.actionBtnText, styles.newGameText]}>New Game</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#064e3b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#a7f3d0',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  modeBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modeLabel: {
    color: '#6ee7b7',
    fontSize: 8,
    fontWeight: '700',
  },
  modeValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnTextDisabled: {
    color: '#94a3b8',
  },
  newGameBtn: {
    backgroundColor: '#047857',
    borderColor: '#10b981',
  },
  newGameText: {
    fontWeight: '700',
  },
});
