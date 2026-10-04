import { StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, fontSize, fontWeight, shadows } from '../theme';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.felt.background,
  },
  hintBanner: {
    backgroundColor: colors.felt.banner,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.felt.bannerBorder,
  },
  hintText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  boardContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  board: {
    width: '100%',
    gap: spacing.xxl,
    position: 'relative',
    userSelect: 'none',
  } as any,
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  topRowRightHanded: {
    flexDirection: 'row-reverse',
  },
  spacer: {
    flex: 1,
    minWidth: spacing.lg,
  },
  foundationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableauRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: spacing.bottomBarPadding,
  },
  tableauRowRightHanded: {
    flexDirection: 'row-reverse',
  },
  floatingAnimatedContainer: {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 9999,
    ...shadows.floatingDrag,
  },
});
