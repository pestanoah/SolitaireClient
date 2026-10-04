import {
  CONFETTI_Z_INDEX,
  WIN_CONFETTI_COLORS,
  getConfettiFunction,
  isConfettiSupported,
  resetCachedConfettiForTesting,
  stopConfetti,
  triggerWinConfetti,
} from '../confetti';

describe('confetti utility', () => {
  beforeEach(() => {
    jest.resetModules();
    resetCachedConfettiForTesting();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetCachedConfettiForTesting();
  });

  describe('in non-browser environment', () => {
    it('returns false for isConfettiSupported and null for getConfettiFunction', () => {
      // In jest/node environment, window/document are not defined
      expect(isConfettiSupported()).toBe(false);
      expect(getConfettiFunction()).toBeNull();
    });

    it('safely handles triggerWinConfetti returning a no-op cleanup', () => {
      const cleanup = triggerWinConfetti();
      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });

    it('safely handles stopConfetti without throwing', () => {
      expect(() => stopConfetti()).not.toThrow();
    });
  });

  describe('in browser environment', () => {
    let mockConfettiFn: jest.Mock & { reset?: jest.Mock };

    beforeEach(() => {
      mockConfettiFn = Object.assign(jest.fn(), {
        reset: jest.fn(),
      });
      // Mock global window and window.document
      (globalThis as any).window = {
        document: { createElement: jest.fn() },
      };
    });

    afterEach(() => {
      delete (globalThis as any).window;
    });

    it('returns true for isConfettiSupported', () => {
      expect(isConfettiSupported()).toBe(true);
    });

    it('triggers initial center burst with high z-index and win colors', () => {
      jest.useFakeTimers();

      jest.doMock('canvas-confetti', () => ({
        __esModule: true,
        default: mockConfettiFn,
      }));

      const cleanup = triggerWinConfetti();

      expect(mockConfettiFn).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: WIN_CONFETTI_COLORS,
          zIndex: CONFETTI_Z_INDEX,
        })
      );

      // Fast-forward through stage 2 (250ms left cannon)
      jest.advanceTimersByTime(250);
      expect(mockConfettiFn).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 50,
          angle: 60,
          zIndex: CONFETTI_Z_INDEX,
        })
      );

      // Fast-forward through stage 3 (400ms right cannon)
      jest.advanceTimersByTime(150);
      expect(mockConfettiFn).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 50,
          angle: 120,
          zIndex: CONFETTI_Z_INDEX,
        })
      );

      // Fast-forward through stage 4 (700ms finale burst)
      jest.advanceTimersByTime(300);
      expect(mockConfettiFn).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 80,
          spread: 100,
          zIndex: CONFETTI_Z_INDEX,
        })
      );

      // Calling cleanup triggers reset
      cleanup();
      expect(mockConfettiFn.reset).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('handles direct function export from canvas-confetti', () => {
      jest.isolateModules(() => {
        const directMock = Object.assign(jest.fn(), { reset: jest.fn() });
        jest.doMock('canvas-confetti', () => directMock);

        const {
          getConfettiFunction: getFn,
          resetCachedConfettiForTesting: resetCached,
        } = require('../confetti');
        resetCached();

        const fn = getFn();
        expect(fn).toBe(directMock);
      });
    });

    it('stopConfetti invokes reset on active confetti instance', () => {
      jest.doMock('canvas-confetti', () => ({
        __esModule: true,
        default: mockConfettiFn,
      }));

      stopConfetti();
      expect(mockConfettiFn.reset).toHaveBeenCalled();
    });
  });
});
