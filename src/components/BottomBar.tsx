import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

export interface BottomBarProps {
  canUndo: boolean;
  canHint?: boolean;
  canCheckWinnable?: boolean;
  isCheckingWinnable?: boolean;
  canGiveUp?: boolean;
  onUndo: () => void;
  onHint?: () => void;
  onCheckWinnable?: () => void;
  onGiveUp?: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  canUndo,
  canHint = true,
  canCheckWinnable = true,
  isCheckingWinnable = false,
  canGiveUp = false,
  onUndo,
  onHint,
  onCheckWinnable,
  onGiveUp,
}) => {
  return (
    <View style={styles.bottomBar}>
      <Pressable
        disabled={!canUndo}
        onPress={onUndo}
        style={({ pressed }) => [
          styles.actionBtn,
          !canUndo && styles.btnDisabled,
          pressed && canUndo && styles.btnPressed,
        ]}
        accessibilityLabel="Undo move"
        accessibilityRole="button"
      >
        <Text style={[styles.actionBtnText, !canUndo && styles.textDisabled]}>Undo</Text>
      </Pressable>

      {onHint && (
        <Pressable
          disabled={!canHint}
          onPress={onHint}
          style={({ pressed }) => [
            styles.actionBtn,
            !canHint && styles.btnDisabled,
            pressed && canHint && styles.btnPressed,
          ]}
          accessibilityLabel="Show hint"
          accessibilityRole="button"
        >
          <Text style={[styles.actionBtnText, !canHint && styles.textDisabled]}>Hint</Text>
        </Pressable>
      )}

      {onCheckWinnable && (
        <Pressable
          disabled={!canCheckWinnable || isCheckingWinnable}
          onPress={onCheckWinnable}
          style={({ pressed }) => [
            styles.actionBtn,
            (!canCheckWinnable || isCheckingWinnable) && styles.btnDisabled,
            pressed && canCheckWinnable && !isCheckingWinnable && styles.btnPressed,
          ]}
          accessibilityLabel={
            isCheckingWinnable ? 'Checking winnability' : 'Check if game is winnable'
          }
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.actionBtnText,
              (!canCheckWinnable || isCheckingWinnable) && styles.textDisabled,
            ]}
            numberOfLines={1}
          >
            {isCheckingWinnable ? 'Checking…' : 'Winnable?'}
          </Text>
        </Pressable>
      )}

      {onGiveUp && (
        <Pressable
          disabled={!canGiveUp}
          onPress={onGiveUp}
          style={({ pressed }) => [
            styles.actionBtn,
            !canGiveUp && styles.btnDisabled,
            pressed && canGiveUp && styles.btnPressed,
          ]}
          accessibilityLabel="Give up game"
          accessibilityRole="button"
        >
          <Text style={[styles.actionBtnText, !canGiveUp && styles.textDisabled]}>Give Up</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.felt.background,
    borderTopWidth: 1,
    borderTopColor: colors.felt.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    minHeight: 52,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay.whiteFillSubtle,
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteMedium,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 44,
  },
  btnPressed: {
    opacity: 0.7,
    backgroundColor: colors.overlay.panelMedium,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    lineHeight: 18,
    textAlign: 'center',
  },
  textDisabled: {
    color: colors.slate[400],
  },
});
