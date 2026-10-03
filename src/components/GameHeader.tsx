import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, letterSpacing } from '../theme';

interface GameHeaderProps {
  score: number;
  moves: number;
  elapsedSeconds: number;
  drawCount: 1 | 3;
  canUndo: boolean;
  canHint?: boolean;
  canGiveUp?: boolean;
  soundEnabled?: boolean;
  onUndo: () => void;
  onHint?: () => void;
  onGiveUp?: () => void;
  onNewGame: () => void;
  onToggleDrawCount: () => void;
  onToggleSound?: () => void;
  onOpenStats: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  score,
  moves,
  elapsedSeconds,
  drawCount,
  canUndo,
  canHint = true,
  canGiveUp = false,
  soundEnabled = true,
  onUndo,
  onHint,
  onGiveUp,
  onNewGame,
  onToggleDrawCount,
  onToggleSound,
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

        {onHint && (
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!canHint}
            onPress={onHint}
            style={[styles.actionBtn, !canHint && styles.btnDisabled]}
          >
            <Text style={[styles.actionBtnText, !canHint && styles.btnTextDisabled]}>
              Hint
            </Text>
          </TouchableOpacity>
        )}

        {onGiveUp && (
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!canGiveUp}
            onPress={onGiveUp}
            style={[styles.actionBtn, !canGiveUp && styles.btnDisabled]}
          >
            <Text style={[styles.actionBtnText, !canGiveUp && styles.btnTextDisabled]}>
              Give Up
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenStats}
          style={styles.actionBtn}
        >
          <Text style={styles.actionBtnText}>Stats</Text>
        </TouchableOpacity>

        {onToggleSound && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onToggleSound}
            style={[styles.actionBtn, styles.soundBtn]}
            accessibilityLabel={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            <Text style={styles.actionBtnText}>{soundEnabled ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
        )}

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
    backgroundColor: colors.felt.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.felt.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
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
    color: colors.felt.textMuted,
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wide,
  },
  metricValue: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.heavy,
  },
  modeBadge: {
    backgroundColor: colors.overlay.panelMedium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs - 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteMedium,
  },
  modeLabel: {
    color: colors.felt.accent,
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.bold,
  },
  modeValue: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.overlay.whiteFillSubtle,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteMedium,
  },
  soundBtn: {
    flex: 0,
    minWidth: 36,
    paddingHorizontal: spacing.sm,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnTextDisabled: {
    color: colors.slate[400],
  },
  newGameBtn: {
    backgroundColor: colors.felt.surface,
    borderColor: colors.action.success,
  },
  newGameText: {
    fontWeight: fontWeight.bold,
  },
});
