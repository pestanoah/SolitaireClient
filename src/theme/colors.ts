export const colors = {
  // Felt / Board Palette
  felt: {
    background: '#064e3b',
    surface: '#047857',
    border: 'rgba(255, 255, 255, 0.15)',
    banner: '#0f766e',
    bannerBorder: '#14b8a6',
    textMuted: '#a7f3d0',
    accent: '#6ee7b7',
  },

  // Card Palette
  card: {
    frontBg: '#ffffff',
    backBg: '#1e3a8a',
    backBorder: '#e2e8f0',
    backInnerBg: '#172554',
    backPatternBg: '#1e40af',
    backEmblem: '#93c5fd',
    border: '#94a3b8',
    selectedBorder: '#3b82f6',
    selectedShadow: '#3b82f6',
    redSuit: '#dc2626',
    blackSuit: '#0f172a',
  },

  // Slate Neutral Palette
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Action / Status Palette
  action: {
    primary: '#0284c7',
    primaryHover: '#0369a1',
    success: '#10b981',
    successBorder: '#34d399',
    destructive: '#e11d48',
    destructiveBorder: '#f43f5e',
    destructiveText: '#fda4af',
    info: '#38bdf8',
  },

  // Translucent Overlays & Watermarks
  overlay: {
    backdropDark: 'rgba(0, 0, 0, 0.75)',
    backdropMedium: 'rgba(0, 0, 0, 0.65)',
    panelDark: 'rgba(0, 0, 0, 0.35)',
    panelMedium: 'rgba(0, 0, 0, 0.25)',
    slotBg: 'rgba(0, 0, 0, 0.15)',
    slotSubtleBg: 'rgba(0, 0, 0, 0.12)',
    slotFaintBg: 'rgba(0, 0, 0, 0.08)',
    borderWhiteSubtle: 'rgba(255, 255, 255, 0.1)',
    borderWhiteMedium: 'rgba(255, 255, 255, 0.2)',
    borderWhiteStrong: 'rgba(255, 255, 255, 0.3)',
    borderWhiteHigh: 'rgba(255, 255, 255, 0.4)',
    whiteFillSubtle: 'rgba(255, 255, 255, 0.12)',
    whiteWatermark: 'rgba(255, 255, 255, 0.25)',
    redWatermark: 'rgba(239, 68, 68, 0.25)',
    highlightDashed: 'rgba(56, 189, 248, 0.15)',
  },

  // Base
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type Colors = typeof colors;
