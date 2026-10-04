export interface ConfettiOptions {
  particleCount?: number;
  angle?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
  ticks?: number;
  zIndex?: number;
  disableForReducedMotion?: boolean;
}

type ConfettiFn = ((options?: ConfettiOptions) => Promise<undefined> | null) & {
  reset?: () => void;
};

let cachedConfettiFn: ConfettiFn | null = null;

export function isConfettiSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Safely resolves the canvas-confetti function across all module bundlers
 * (ES modules, CommonJS, Metro, Webpack).
 */
export function getConfettiFunction(): ConfettiFn | null {
  if (!isConfettiSupported()) {
    return null;
  }

  if (cachedConfettiFn) {
    return cachedConfettiFn;
  }

  try {
    const imported = require('canvas-confetti');
    const fn = typeof imported === 'function' ? imported : imported?.default;
    if (typeof fn === 'function') {
      cachedConfettiFn = fn;
      return fn;
    }
  } catch (err) {
    console.warn('Failed to load canvas-confetti:', err);
  }

  return null;
}

export const WIN_CONFETTI_COLORS = [
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // ruby red
  '#3b82f6', // sapphire blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ffffff', // white
];

export const CONFETTI_Z_INDEX = 99999;

/**
 * Fires a sequence of celebratory confetti bursts across the screen.
 * Returns a cleanup function that cancels pending bursts and resets the canvas.
 */
export function triggerWinConfetti(): () => void {
  const confetti = getConfettiFunction();
  if (!confetti) {
    return () => {};
  }

  const timeouts: ReturnType<typeof setTimeout>[] = [];

  // Stage 1: Immediate celebratory center burst
  try {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: WIN_CONFETTI_COLORS,
      zIndex: CONFETTI_Z_INDEX,
    });
  } catch {}

  // Stage 2: Left corner cannon
  timeouts.push(
    setTimeout(() => {
      try {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.7 },
          colors: WIN_CONFETTI_COLORS,
          zIndex: CONFETTI_Z_INDEX,
        });
      } catch {}
    }, 250)
  );

  // Stage 3: Right corner cannon
  timeouts.push(
    setTimeout(() => {
      try {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.7 },
          colors: WIN_CONFETTI_COLORS,
          zIndex: CONFETTI_Z_INDEX,
        });
      } catch {}
    }, 400)
  );

  // Stage 4: Finale grand burst
  timeouts.push(
    setTimeout(() => {
      try {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.5 },
          colors: WIN_CONFETTI_COLORS,
          zIndex: CONFETTI_Z_INDEX,
        });
      } catch {}
    }, 700)
  );

  return () => {
    timeouts.forEach(clearTimeout);
    try {
      confetti.reset?.();
    } catch {}
  };
}

/**
 * Resets any active confetti animation and clears canvas particles.
 */
export function stopConfetti(): void {
  const confetti = getConfettiFunction();
  try {
    confetti?.reset?.();
  } catch {}
}

export function resetCachedConfettiForTesting(): void {
  cachedConfettiFn = null;
}
