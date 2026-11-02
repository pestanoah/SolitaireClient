import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { borderRadius, spacing } from './spacing';
import { fontSize, fontWeight } from './typography';

/**
 * Extra vertical bleed added below the modal backdrop's layout viewport edge
 * (via matching negative marginBottom and positive paddingBottom) so that on
 * mobile browsers and iOS standalone PWAs (where `bottom: 0` on `position: fixed`
 * modal containers stops above the bottom safe-area inset or floating browser
 * bar pocket), the dark shading extends seamlessly to the physical bottom of
 * the screen while keeping the modal card's vertical center and percentage
 * maxHeight unchanged.
 */
export const MODAL_BOTTOM_BLEED = 120;

export const modalStyles = StyleSheet.create({
  backdropDark: {
    flex: 1,
    backgroundColor: colors.overlay.backdropDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
    paddingBottom: spacing.xxxl + MODAL_BOTTOM_BLEED,
    marginBottom: -MODAL_BOTTOM_BLEED,
  },
  backdropMedium: {
    flex: 1,
    backgroundColor: colors.overlay.backdropMedium,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
    paddingBottom: spacing.xxxl + MODAL_BOTTOM_BLEED,
    marginBottom: -MODAL_BOTTOM_BLEED,
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
