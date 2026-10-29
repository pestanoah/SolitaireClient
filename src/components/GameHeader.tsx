import React from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { isDateSeed } from '../engine/deck';
import { colors, spacing, borderRadius, fontSize, fontWeight, letterSpacing } from '../theme';

interface GameHeaderProps {
  score: number;
  moves: number;
  elapsedSeconds: number;
  drawCount: 1 | 3;
  canUndo: boolean;
  canHint?: boolean;
  canGiveUp?: boolean;
  canCheckWinnable?: boolean;
  isCheckingWinnable?: boolean;
  soundEnabled?: boolean;
  isLandscape?: boolean;
  seed?: string;
  dailyStreak?: number;
  topInset?: number;
  onUndo: () => void;
  onHint?: () => void;
  onCheckWinnable?: () => void;
  onGiveUp?: () => void;
  onNewGame: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onOpenSeed?: () => void;
  onOpenDailyChallenge?: () => void;
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
  canCheckWinnable = true,
  isCheckingWinnable = false,
  soundEnabled = true,
  isLandscape,
  seed,
  dailyStreak,
  topInset,
  onUndo,
  onHint,
  onCheckWinnable,
  onGiveUp,
  onNewGame,
  onOpenStats,
  onOpenSettings,
  onOpenSeed,
  onOpenDailyChallenge,
  onToggleDrawCount,
  onToggleSound,
}) => {
  const { width, height } = useWindowDimensions();
  const isLand = isLandscape !== undefined ? isLandscape : width > height;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const safePaddingTop: number | string =
    Platform.OS === 'web'
      ? isLand
        ? `calc(env(safe-area-inset-top, ${topInset ?? 0}px) + ${spacing.xs}px)`
        : `calc(env(safe-area-inset-top, ${topInset ?? 0}px) + ${spacing.sm}px)`
      : (topInset ?? 0) + (isLand ? spacing.xs : spacing.sm);

  const handleOpenSettings = onOpenSettings || onToggleDrawCount || (() => {});

  if (isLand) {
    return (
      <View style={[styles.header, styles.headerLandscape, { paddingTop: safePaddingTop } as any]}>
        {/* Metrics Row (Landscape) */}
        <View style={styles.metricsGroupLandscape}>
          <View style={styles.compactMetric}>
            <Text style={styles.compactMetricLabel}>SCORE</Text>
            <Text style={styles.compactMetricValue}>{score}</Text>
          </View>

          <View style={styles.compactMetric}>
            <Text style={styles.compactMetricLabel}>MOVES</Text>
            <Text style={styles.compactMetricValue}>{moves}</Text>
          </View>

          <View style={styles.compactMetric}>
            <Text style={styles.compactMetricLabel}>TIME</Text>
            <Text style={styles.compactMetricValue}>{timeFormatted}</Text>
          </View>

          <Pressable
            onPress={handleOpenSettings}
            style={({ pressed }) => [styles.modeBadgeLandscape, pressed && { opacity: 0.7 }]}
            accessibilityLabel={`Draw mode: Draw ${drawCount}. Tap to open settings.`}
            accessibilityRole="button"
          >
            <Text style={styles.modeValueLandscape}>Draw {drawCount}</Text>
          </Pressable>

          {seed && (onOpenDailyChallenge || onOpenSeed) && (
            <Pressable
              onPress={isDateSeed(seed) && onOpenDailyChallenge ? onOpenDailyChallenge : onOpenSeed}
              style={({ pressed }) => [styles.modeBadgeLandscape, pressed && { opacity: 0.7 }]}
              accessibilityLabel={
                isDateSeed(seed)
                  ? `Daily challenge: #${seed}. Tap to view calendar.`
                  : `Seed: ${seed}. Tap to manage seed.`
              }
              accessibilityRole="button"
            >
              <Text style={styles.modeValueLandscape}>
                {isDateSeed(seed)
                  ? `Daily #${seed}`
                  : `#${seed.length > 7 ? `${seed.slice(0, 6)}…` : seed}`}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Actions Row (Landscape) */}
        <View style={styles.actionsGroupLandscape}>
          <Pressable
            disabled={!canUndo}
            onPress={onUndo}
            style={({ pressed }) => [
              styles.actionBtnLandscape,
              !canUndo && styles.btnDisabled,
              pressed && canUndo && { opacity: 0.7 },
            ]}
            accessibilityLabel="Undo move"
            accessibilityRole="button"
          >
            <Text style={[styles.actionBtnTextLandscape, !canUndo && styles.btnTextDisabled]}>
              Undo
            </Text>
          </Pressable>

          {onHint && (
            <Pressable
              disabled={!canHint}
              onPress={onHint}
              style={({ pressed }) => [
                styles.actionBtnLandscape,
                !canHint && styles.btnDisabled,
                pressed && canHint && { opacity: 0.7 },
              ]}
              accessibilityLabel="Show hint"
              accessibilityRole="button"
            >
              <Text style={[styles.actionBtnTextLandscape, !canHint && styles.btnTextDisabled]}>
                Hint
              </Text>
            </Pressable>
          )}

          {onCheckWinnable && (
            <Pressable
              disabled={!canCheckWinnable || isCheckingWinnable}
              onPress={onCheckWinnable}
              style={({ pressed }) => [
                styles.actionBtnLandscape,
                (!canCheckWinnable || isCheckingWinnable) && styles.btnDisabled,
                pressed && canCheckWinnable && !isCheckingWinnable && { opacity: 0.7 },
              ]}
              accessibilityLabel={isCheckingWinnable ? 'Checking winnability' : 'Check if game is winnable'}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.actionBtnTextLandscape,
                  (!canCheckWinnable || isCheckingWinnable) && styles.btnTextDisabled,
                ]}
                numberOfLines={1}
              >
                {isCheckingWinnable ? 'Checking…' : 'Winnable?'}
              </Text>
            </Pressable>
          )}

          {canGiveUp && onGiveUp && (
            <Pressable
              onPress={onGiveUp}
              style={({ pressed }) => [
                styles.actionBtnLandscape,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityLabel="Give up game"
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnTextLandscape}>Give Up</Text>
            </Pressable>
          )}

          {onOpenSeed && (
            <Pressable
              onPress={onOpenSeed}
              style={({ pressed }) => [styles.actionBtnLandscape, pressed && { opacity: 0.7 }]}
              accessibilityLabel="Manage seed and sharing"
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnTextLandscape}>Seed</Text>
            </Pressable>
          )}

          {onOpenDailyChallenge && (
            <Pressable
              onPress={onOpenDailyChallenge}
              style={({ pressed }) => [styles.actionBtnLandscape, pressed && { opacity: 0.7 }]}
              accessibilityLabel="Open daily challenges"
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnTextLandscape}>
                {dailyStreak && dailyStreak > 0 ? `Daily (${dailyStreak})` : 'Daily'}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={onOpenStats}
            style={({ pressed }) => [styles.actionBtnLandscape, pressed && { opacity: 0.7 }]}
            accessibilityLabel="View statistics"
            accessibilityRole="button"
          >
            <Text style={styles.actionBtnTextLandscape}>Stats</Text>
          </Pressable>

          <Pressable
            onPress={handleOpenSettings}
            style={({ pressed }) => [
              styles.actionBtnLandscape,
              styles.settingsBtnLandscape,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Open settings"
            accessibilityRole="button"
          >
            <Text style={styles.actionBtnTextLandscape}>⚙️</Text>
          </Pressable>

          <Pressable
            onPress={onNewGame}
            style={({ pressed }) => [
              styles.actionBtnLandscape,
              styles.newGameBtnLandscape,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Deal new game"
            accessibilityRole="button"
          >
            <Text style={[styles.actionBtnTextLandscape, styles.newGameText]}>New Game</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const showModeBadge = !seed && (!onOpenDailyChallenge || width >= 390);
  const showDailyBtn = Boolean(onOpenDailyChallenge && (!seed || !isDateSeed(seed)));

  return (
    <View style={[styles.header, { paddingTop: safePaddingTop } as any]}>
      {/* Top Header Row (Single Compact Row in Portrait) */}
      <View style={styles.headerRowPortrait}>
        {/* Left: Metrics */}
        <View style={styles.metricsGroupPortrait}>
          <View style={styles.metricPortrait}>
            <Text style={styles.metricLabelPortrait}>SCORE</Text>
            <Text style={styles.metricValuePortrait}>{score}</Text>
          </View>

          <View style={styles.metricPortrait}>
            <Text style={styles.metricLabelPortrait}>MOVES</Text>
            <Text style={styles.metricValuePortrait}>{moves}</Text>
          </View>

          <View style={styles.metricPortrait}>
            <Text style={styles.metricLabelPortrait}>TIME</Text>
            <Text style={styles.metricValuePortrait}>{timeFormatted}</Text>
          </View>
        </View>

        {/* Right: Badges & System Actions */}
        <View style={styles.navGroupPortrait}>
          {seed && (onOpenDailyChallenge || onOpenSeed) && (
            <Pressable
              onPress={isDateSeed(seed) && onOpenDailyChallenge ? onOpenDailyChallenge : onOpenSeed}
              style={({ pressed }) => [styles.seedBadgePortrait, pressed && { opacity: 0.7 }]}
              accessibilityLabel={
                isDateSeed(seed)
                  ? `Daily challenge: #${seed}. Tap to view calendar.`
                  : `Seed: ${seed}. Tap to manage seed.`
              }
              accessibilityRole="button"
            >
              <Text style={styles.seedBadgeLabelPortrait}>
                {isDateSeed(seed) ? 'DAILY' : 'SEED'}
              </Text>
              <Text style={styles.seedBadgeValuePortrait} numberOfLines={1}>
                #{seed.length > 7 ? `${seed.slice(0, 6)}…` : seed}
              </Text>
            </Pressable>
          )}

          {showModeBadge && (
            <Pressable
              onPress={handleOpenSettings}
              style={({ pressed }) => [styles.modeBadgePortrait, pressed && { opacity: 0.7 }]}
              accessibilityLabel={`Draw mode: Draw ${drawCount}. Tap to open settings.`}
              accessibilityRole="button"
            >
              <Text style={styles.modeLabelPortrait}>MODE</Text>
              <Text style={styles.modeValuePortrait}>Draw {drawCount}</Text>
            </Pressable>
          )}

          {showDailyBtn && onOpenDailyChallenge && (
            <Pressable
              onPress={onOpenDailyChallenge}
              style={({ pressed }) => [styles.actionBtnPortrait, pressed && { opacity: 0.7 }]}
              accessibilityLabel="Open daily challenges"
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnTextPortrait}>
                {dailyStreak && dailyStreak > 0 ? `Daily (${dailyStreak})` : 'Daily'}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={onOpenStats}
            style={({ pressed }) => [styles.actionBtnPortrait, pressed && { opacity: 0.7 }]}
            accessibilityLabel="View statistics"
            accessibilityRole="button"
          >
            <Text style={styles.actionBtnTextPortrait}>Stats</Text>
          </Pressable>

          <Pressable
            onPress={handleOpenSettings}
            style={({ pressed }) => [
              styles.actionBtnPortrait,
              styles.settingsBtnPortrait,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Open settings"
            accessibilityRole="button"
          >
            <Text style={styles.actionBtnTextPortrait}>⚙️</Text>
          </Pressable>

          <Pressable
            onPress={onNewGame}
            style={({ pressed }) => [
              styles.actionBtnPortrait,
              styles.newGameBtnPortrait,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Deal new game"
            accessibilityRole="button"
          >
            <Text style={[styles.actionBtnTextPortrait, styles.newGameText]}>New Game</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: (Platform.OS === 'web' ? 'sticky' : 'relative') as any,
    top: 0,
    zIndex: 100,
    backgroundColor: colors.felt.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.felt.border,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    justifyContent: 'center',
  },
  headerRowPortrait: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,
    gap: spacing.xs,
  },
  metricsGroupPortrait: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metricPortrait: {
    alignItems: 'center',
    minWidth: 38,
  },
  metricLabelPortrait: {
    color: colors.felt.textMuted,
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wide,
    lineHeight: 11,
    textAlign: 'center',
  },
  metricValuePortrait: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.heavy,
    fontVariant: ['tabular-nums'],
    lineHeight: 18,
    textAlign: 'center',
  },
  navGroupPortrait: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modeBadgePortrait: {
    backgroundColor: colors.overlay.panelMedium,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteMedium,
    minHeight: 32,
  },
  modeLabelPortrait: {
    color: colors.felt.accent,
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.bold,
    lineHeight: 10,
    textAlign: 'center',
  },
  modeValuePortrait: {
    color: colors.white,
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.bold,
    lineHeight: 14,
    textAlign: 'center',
  },
  seedBadgePortrait: {
    backgroundColor: colors.overlay.panelMedium,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteMedium,
    minHeight: 32,
    maxWidth: 86,
  },
  seedBadgeLabelPortrait: {
    color: colors.felt.accent,
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.bold,
    lineHeight: 10,
    textAlign: 'center',
  },
  seedBadgeValuePortrait: {
    color: colors.white,
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.bold,
    lineHeight: 14,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  actionBtnPortrait: {
    backgroundColor: colors.overlay.whiteFillSubtle,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteMedium,
    minHeight: 32,
  },
  actionBtnTextPortrait: {
    color: colors.white,
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.semibold,
    lineHeight: 15,
    textAlign: 'center',
  },
  settingsBtnPortrait: {
    minWidth: 32,
    paddingHorizontal: spacing.xs,
  },
  newGameBtnPortrait: {
    backgroundColor: colors.felt.surface,
    borderColor: colors.action.success,
  },
  newGameText: {
    fontWeight: fontWeight.bold,
  },
  headerLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  metricsGroupLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  compactMetric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  compactMetricLabel: {
    color: colors.felt.textMuted,
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wide,
  },
  compactMetricValue: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.heavy,
    fontVariant: ['tabular-nums'],
  },
  modeBadgeLandscape: {
    backgroundColor: colors.overlay.panelMedium,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteMedium,
  },
  modeValueLandscape: {
    color: colors.white,
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.bold,
  },
  actionsGroupLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionBtnLandscape: {
    backgroundColor: colors.overlay.whiteFillSubtle,
    paddingVertical: spacing.xs - 1,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteMedium,
    minHeight: 28,
  },
  actionBtnTextLandscape: {
    color: colors.white,
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.semibold,
    lineHeight: 14,
    textAlign: 'center',
  },
  settingsBtnLandscape: {
    paddingHorizontal: spacing.xs + 2,
    minWidth: 28,
  },
  newGameBtnLandscape: {
    backgroundColor: colors.felt.surface,
    borderColor: colors.action.success,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnTextDisabled: {
    color: colors.slate[400],
  },
});
