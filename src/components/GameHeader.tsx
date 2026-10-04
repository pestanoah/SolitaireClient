import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onToggleDrawCount?: () => void;
  onToggleSound?: () => void;
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
  onOpenStats,
  onOpenSettings,
  onToggleDrawCount,
  onToggleSound,
}) => {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const handleOpenSettings = onOpenSettings || onToggleDrawCount || (() => {});

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

        <Pressable
          onPress={handleOpenSettings}
          style={({ pressed }) => [styles.modeBadge, pressed && { opacity: 0.7 }]}
          accessibilityLabel={`Draw mode: Draw ${drawCount}. Tap to open settings.`}
          accessibilityRole="button"
        >
          <Text style={styles.modeLabel}>Draw Mode</Text>
          <Text style={styles.modeValue}>Draw {drawCount}</Text>
        </Pressable>
      </View>

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <Pressable
          disabled={!canUndo}
          onPress={onUndo}
          style={({ pressed }) => [styles.actionBtn, !canUndo && styles.btnDisabled, pressed && canUndo && { opacity: 0.7 }]}
          accessibilityLabel="Undo move"
          accessibilityRole="button"
        >
          <Text style={[styles.actionBtnText, !canUndo && styles.btnTextDisabled]}>
            Undo
          </Text>
        </Pressable>

        {onHint && (
          <Pressable
            disabled={!canHint}
            onPress={onHint}
            style={({ pressed }) => [styles.actionBtn, !canHint && styles.btnDisabled, pressed && canHint && { opacity: 0.7 }]}
            accessibilityLabel="Show hint"
            accessibilityRole="button"
          >
            <Text style={[styles.actionBtnText, !canHint && styles.btnTextDisabled]}>
              Hint
            </Text>
          </Pressable>
        )}

        {onGiveUp && (
          <Pressable
            disabled={!canGiveUp}
            onPress={onGiveUp}
            style={({ pressed }) => [styles.actionBtn, !canGiveUp && styles.btnDisabled, pressed && canGiveUp && { opacity: 0.7 }]}
            accessibilityLabel="Give up game"
            accessibilityRole="button"
          >
            <Text style={[styles.actionBtnText, !canGiveUp && styles.btnTextDisabled]}>
              Give Up
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={onOpenStats}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
          accessibilityLabel="View statistics"
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnText}>Stats</Text>
        </Pressable>

        <Pressable
          onPress={handleOpenSettings}
          style={({ pressed }) => [styles.actionBtn, styles.settingsBtn, pressed && { opacity: 0.7 }]}
          accessibilityLabel="Open settings"
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnText}>⚙️</Text>
        </Pressable>

        <Pressable
          onPress={onNewGame}
          style={({ pressed }) => [styles.actionBtn, styles.newGameBtn, pressed && { opacity: 0.7 }]}
          accessibilityLabel="Deal new game"
          accessibilityRole="button"
        >
          <Text style={[styles.actionBtnText, styles.newGameText]}>New Game</Text>
        </Pressable>
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
  settingsBtn: {
    flex: 0,
    minWidth: 36,
    paddingHorizontal: spacing.sm,
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
