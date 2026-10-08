import {
  cachedNoiseBuffer,
  getCachedNoiseBuffer,
  isSoundEnabled,
  playCardMoveSound,
  playDealSound,
  playGameOverSound,
  playResetSound,
  playWebCardSlide,
  resetCachedNoiseBufferForTesting,
  setSoundEnabled,
} from '../sound';

function createMockAudioContext(sampleRate = 44100) {
  const createdGains: any[] = [];
  const mockGainNode = () => {
    const gain = {
      gain: {
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    createdGains.push(gain);
    return gain;
  };

  const createdFilters: any[] = [];
  const mockFilterNode = () => {
    const filter = {
      type: 'bandpass',
      frequency: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      Q: {
        setValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    createdFilters.push(filter);
    return filter;
  };

  const createdSources: any[] = [];
  const mockSourceNode = () => {
    const src = {
      buffer: null as any,
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null as any,
    };
    createdSources.push(src);
    return src;
  };

  const createdOscs: any[] = [];
  const mockOscNode = () => {
    const osc = {
      type: 'sine',
      frequency: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null as any,
    };
    createdOscs.push(osc);
    return osc;
  };

  const createdBuffers: any[] = [];
  const createBuffer = jest.fn((channels: number, length: number, sr: number) => {
    const channelData = new Float32Array(length);
    const buf = {
      sampleRate: sr,
      length,
      numberOfChannels: channels,
      getChannelData: jest.fn().mockReturnValue(channelData),
    };
    createdBuffers.push(buf);
    return buf;
  });

  const createBufferSource = jest.fn(() => {
    return mockSourceNode();
  });

  return {
    sampleRate,
    destination: {},
    createBuffer,
    createBufferSource,
    createBiquadFilter: jest.fn(mockFilterNode),
    createGain: jest.fn(mockGainNode),
    createOscillator: jest.fn(mockOscNode),
    createdBuffers,
    createdSources,
    createdGains,
    createdFilters,
    createdOscs,
  } as unknown as AudioContext & {
    createdBuffers: any[];
    createdSources: any[];
    createdGains: any[];
    createdFilters: any[];
    createdOscs: any[];
  };
}

describe('Sound Utility', () => {
  beforeEach(() => {
    setSoundEnabled(true);
    resetCachedNoiseBufferForTesting();
  });

  test('sound is enabled by default', () => {
    expect(isSoundEnabled()).toBe(true);
  });

  test('setSoundEnabled toggles sound state', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);

    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  test('playback functions execute safely without throwing', () => {
    expect(() => {
      playDealSound();
      playCardMoveSound();
      playResetSound();
      playGameOverSound();
    }).not.toThrow();

    setSoundEnabled(false);
    expect(() => {
      playDealSound();
      playCardMoveSound();
      playResetSound();
      playGameOverSound();
    }).not.toThrow();
  });

  describe('AudioBuffer caching and optimization', () => {
    test('getCachedNoiseBuffer lazily allocates 1-second buffer and populates samples', () => {
      const mockCtx = createMockAudioContext(44100);
      const buffer = getCachedNoiseBuffer(mockCtx);

      expect(mockCtx.createBuffer).toHaveBeenCalledTimes(1);
      expect(mockCtx.createBuffer).toHaveBeenCalledWith(1, 44100, 44100);
      expect(buffer).toBeDefined();

      const channelData = buffer.getChannelData(0);
      // Ensure samples are populated in [-1, 1] range
      expect(channelData.length).toBe(44100);
      let hasNonZero = false;
      for (let i = 0; i < 100; i++) {
        if (channelData[i] !== 0) hasNonZero = true;
        expect(channelData[i]).toBeGreaterThanOrEqual(-1);
        expect(channelData[i]).toBeLessThanOrEqual(1);
      }
      expect(hasNonZero).toBe(true);
    });

    test('getCachedNoiseBuffer reuses existing buffer on consecutive calls', () => {
      const mockCtx = createMockAudioContext(44100);
      const buffer1 = getCachedNoiseBuffer(mockCtx);
      const buffer2 = getCachedNoiseBuffer(mockCtx);

      expect(mockCtx.createBuffer).toHaveBeenCalledTimes(1);
      expect(buffer1).toBe(buffer2);
    });

    test('getCachedNoiseBuffer re-creates buffer if sample rate changes', () => {
      const mockCtx44 = createMockAudioContext(44100);
      const buffer44 = getCachedNoiseBuffer(mockCtx44);

      const mockCtx48 = createMockAudioContext(48000);
      const buffer48 = getCachedNoiseBuffer(mockCtx48);

      expect(mockCtx44.createBuffer).toHaveBeenCalledTimes(1);
      expect(mockCtx48.createBuffer).toHaveBeenCalledTimes(1);
      expect(buffer44).not.toBe(buffer48);
    });

    test('playWebCardSlide reuses cachedNoiseBuffer for duration <= 1 second', () => {
      const mockCtx = createMockAudioContext(44100);

      // Play 4 sounds as done in playWebSynthesizedReset
      playWebCardSlide(mockCtx, 0, 3400, 800, 0.08, 0.25);
      playWebCardSlide(mockCtx, 0.035, 3600, 750, 0.08, 0.28);
      playWebCardSlide(mockCtx, 0.070, 3200, 700, 0.09, 0.30);
      playWebCardSlide(mockCtx, 0.105, 3000, 600, 0.12, 0.35);

      // Only 1 buffer was allocated and cached for all 4 calls
      expect(mockCtx.createBuffer).toHaveBeenCalledTimes(1);
      expect(mockCtx.createdSources.length).toBe(4);
      for (const src of mockCtx.createdSources) {
        expect(src.buffer).toBe(cachedNoiseBuffer);
        expect(src.start).toHaveBeenCalled();
        expect(src.stop).toHaveBeenCalled();
      }
    });

    test('playWebCardSlide allocates new buffer for duration > 1 second', () => {
      const mockCtx = createMockAudioContext(44100);

      // First play short sound to initialize cachedNoiseBuffer
      playWebCardSlide(mockCtx, 0, 3400, 800, 0.1, 0.25);
      expect(mockCtx.createBuffer).toHaveBeenCalledTimes(1);

      // Long sound > 1 second
      playWebCardSlide(mockCtx, 0, 3400, 800, 1.5, 0.25);
      expect(mockCtx.createBuffer).toHaveBeenCalledTimes(2);
      expect(mockCtx.createBuffer).toHaveBeenLastCalledWith(1, Math.floor(44100 * 1.5), 44100);
    });

    test('playWebCardSlide registers onended cleanup handlers that disconnect audio nodes', () => {
      const mockCtx = createMockAudioContext(44100);
      playWebCardSlide(mockCtx, 0, 3400, 800, 0.1, 0.25);

      const source = mockCtx.createdSources[0];
      const osc = mockCtx.createdOscs[0];
      const filter = mockCtx.createdFilters[0];
      const gains = mockCtx.createdGains;

      expect(typeof source.onended).toBe('function');
      expect(typeof osc.onended).toBe('function');

      // Trigger onended callbacks
      source.onended();
      expect(source.disconnect).toHaveBeenCalled();
      expect(filter.disconnect).toHaveBeenCalled();
      expect(gains[0].disconnect).toHaveBeenCalled();

      osc.onended();
      expect(osc.disconnect).toHaveBeenCalled();
      expect(gains[1].disconnect).toHaveBeenCalled();
    });
  });
});
