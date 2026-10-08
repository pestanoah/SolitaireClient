import { StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, fontSize, fontWeight, shadows } from '../theme';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.felt.background,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  hintBanner: {
    backgroundColor: colors.felt.banner,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.felt.bannerBorder,
  },
  hintBannerLandscape: {
    position: 'absolute',
    top: 42,
    zIndex: 9999,
    alignSelf: 'center',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.felt.bannerBorder,
    ...shadows.cardSelected,
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
    flexGrow: 1,
  },
  boardContentLandscape: {
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  board: {
    width: '100%',
    gap: spacing.xxl,
    position: 'relative',
    userSelect: 'none',
  } as any,
  boardLandscape: {
    gap: spacing.md,
  },
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
  tableauRowLandscape: {
    paddingBottom: 0,
  },
  tableauRowRightHanded: {
    flexDirection: 'row-reverse',
  },
  floatingAnimatedContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    pointerEvents: 'none',
    zIndex: 9999,
    ...shadows.floatingDrag,
  },
});
