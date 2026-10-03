export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  xxxl: 20,
  section: 24,
  modalPadding: 28,
  bottomBarPadding: 40,
} as const;

export const borderRadius = {
  xs: 3,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  xxl: 12,
  modal: 16,
  modalLg: 20,
  full: 9999,
} as const;

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
