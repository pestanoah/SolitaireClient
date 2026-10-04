import { Platform, ViewStyle } from 'react-native';

interface ShadowConfig {
  color: string;
  x?: number;
  y: number;
  radius: number;
  opacity: number;
  elevation: number;
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('#')) {
    const raw = hex.slice(1);
    if (raw.length === 6) {
      const r = parseInt(raw.slice(0, 2), 16);
      const g = parseInt(raw.slice(2, 4), 16);
      const b = parseInt(raw.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return hex;
}

function createShadow(config: ShadowConfig): ViewStyle {
  const x = config.x ?? 0;
  const y = config.y;
  const rgba = hexToRgba(config.color, config.opacity);

  return Platform.select<ViewStyle>({
    web: {
      boxShadow: `${x}px ${y}px ${config.radius}px ${rgba}`,
    } as any,
    default: {
      shadowColor: config.color,
      shadowOffset: { width: x, height: y },
      shadowOpacity: config.opacity,
      shadowRadius: config.radius,
      elevation: config.elevation,
    },
  })!;
}

export const shadows = {
  card: createShadow({
    elevation: 3,
    color: '#000000',
    y: 1.5,
    opacity: 0.2,
    radius: 2.5,
  }),

  cardSelected: createShadow({
    elevation: 6,
    color: '#3b82f6',
    y: 2,
    opacity: 0.6,
    radius: 5,
  }),

  cardHintSource: createShadow({
    elevation: 7,
    color: '#f59e0b',
    y: 2,
    opacity: 0.8,
    radius: 6,
  }),

  cardHintTarget: createShadow({
    elevation: 7,
    color: '#38bdf8',
    y: 2,
    opacity: 0.8,
    radius: 6,
  }),

  cardDragging: createShadow({
    elevation: 8,
    color: '#000000',
    y: 4,
    opacity: 0.45,
    radius: 8,
  }),

  floatingDrag: createShadow({
    elevation: 12,
    color: '#000000',
    y: 6,
    opacity: 0.4,
    radius: 10,
  }),

  button: createShadow({
    elevation: 4,
    color: '#000000',
    y: 2,
    opacity: 0.3,
    radius: 4,
  }),

  modalWin: createShadow({
    elevation: 10,
    color: '#10b981',
    y: 4,
    opacity: 0.4,
    radius: 16,
  }),

  modalLoss: createShadow({
    elevation: 10,
    color: '#f43f5e',
    y: 4,
    opacity: 0.35,
    radius: 16,
  }),
} as const;
