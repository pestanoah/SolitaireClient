import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { borderRadius, spacing } from './spacing';
import { fontSize, fontWeight } from './typography';

export const modalStyles = StyleSheet.create({
  backdropDark: {
    flex: 1,
    backgroundColor: colors.overlay.backdropDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  backdropMedium: {
    flex: 1,
    backgroundColor: colors.overlay.backdropMedium,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  cardBase: {
    borderRadius: borderRadius.modal,
    padding: spacing.section,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    zIndex: 1,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.slate[700],
  },
  cardFelt: {
    backgroundColor: colors.felt.background,
    borderWidth: 2,
    borderColor: colors.action.successBorder,
  },
  cardGameOver: {
    backgroundColor: colors.slate[900],
    borderWidth: 2,
    borderColor: colors.action.destructiveBorder,
  },
  headerIcon: {
    fontSize: fontSize.display,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.title,
    fontWeight: fontWeight.black,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  titleMedium: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.heavy,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: colors.overlay.panelDark,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    marginBottom: spacing.section,
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteSubtle,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.heavy,
  },
  statLabel: {
    color: colors.slate[400],
    fontSize: fontSize.subtext,
    marginTop: spacing.xs,
    fontWeight: fontWeight.semibold,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
