const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

let audioCtx: AudioContext | null = null;
export let cachedNoiseBuffer: AudioBuffer | null = null;
let soundEnabled = true;

/**
 * Returns a cached 1-second white noise AudioBuffer for the AudioContext,
 * initialized once or lazily when needed.
 */
export function getCachedNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!cachedNoiseBuffer || cachedNoiseBuffer.sampleRate !== ctx.sampleRate) {
    const sampleRate = ctx.sampleRate;
    cachedNoiseBuffer = ctx.createBuffer(1, sampleRate, sampleRate);
    const output = cachedNoiseBuffer.getChannelData(0);
    for (let i = 0; i < sampleRate; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }
  return cachedNoiseBuffer;
}

export function resetCachedNoiseBufferForTesting(): void {
  cachedNoiseBuffer = null;
}

/**
 * Initializes and resumes AudioContext on user interaction (Web only).
 */
function getWebAudioContext(): AudioContext | null {
  if (!isBrowser) return null;

  try {
    if (!audioCtx) {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
        getCachedNoiseBuffer(audioCtx);
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch {
    return null;
  }
  return audioCtx;
}

/**
 * Synthesizes a resonant card-sliding "shoooooop" friction sound using Web Audio API.
 */
export function playWebCardSlide(
  ctx: AudioContext,
  startTime: number,
  startFreq: number,
  endFreq: number,
  duration: number,
  volume: number,
  q: number = 2.8
): void {
  try {
    let noiseBuffer: AudioBuffer;
    if (duration <= 1) {
      noiseBuffer = getCachedNoiseBuffer(ctx);
    } else {
      const sampleRate = ctx.sampleRate;
      const bufferSize = Math.max(1, Math.floor(sampleRate * duration));
      noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
    filter.Q.setValueAtTime(q, startTime);

    const noiseGain = ctx.createGain();
    const attack = Math.min(0.018, duration * 0.15);
    noiseGain.gain.setValueAtTime(0.0001, startTime);
    noiseGain.gain.linearRampToValueAtTime(volume, startTime + attack);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(startTime);
    whiteNoise.stop(startTime + duration);

    // Subtle low-body resonance representing card stock friction against felt
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq * 0.12, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq * 0.25), startTime + duration * 0.6);

    const bodyDuration = duration * 0.65;
    const bodyVol = volume * 0.25;
    oscGain.gain.setValueAtTime(0.0001, startTime);
    oscGain.gain.linearRampToValueAtTime(bodyVol, startTime + attack);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + bodyDuration);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + bodyDuration);
  } catch {
    // Ignore audio playback errors
  }
}

/**
 * Synthesizes a snappy card flick/deal "shwoop" sound using Web Audio API.
 */
function playWebSynthesizedDeal(): void {
  const ctx = getWebAudioContext();
  if (!ctx) return;
  playWebCardSlide(ctx, ctx.currentTime, 3800, 850, 0.11, 0.38, 3.2);
}

/**
 * Synthesizes an airy card slide "shoooooop" sound using Web Audio API.
 */
function playWebSynthesizedMove(): void {
  const ctx = getWebAudioContext();
  if (!ctx) return;
  playWebCardSlide(ctx, ctx.currentTime, 3200, 680, 0.14, 0.35, 2.8);
}

/**
 * Synthesizes a quick multi-card flutter/reset sound using Web Audio API.
 */
function playWebSynthesizedReset(): void {
  const ctx = getWebAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playWebCardSlide(ctx, now, 3400, 800, 0.08, 0.25, 3.0);
  playWebCardSlide(ctx, now + 0.035, 3600, 750, 0.08, 0.28, 3.0);
  playWebCardSlide(ctx, now + 0.070, 3200, 700, 0.09, 0.30, 3.0);
  playWebCardSlide(ctx, now + 0.105, 3000, 600, 0.12, 0.35, 2.8);
}

// Native players for iOS & Android
let nativeMovePlayer: any = null;
let nativeDealPlayer: any = null;
let nativeResetPlayer: any = null;

function getNativePlayer(type: 'move' | 'deal' | 'reset') {
  if (isBrowser) return null;

  try {
    const { createAudioPlayer } = require('expo-audio');
    if (type === 'move') {
      if (!nativeMovePlayer) {
        nativeMovePlayer = createAudioPlayer(require('../../assets/sounds/card_move.wav'));
      }
      return nativeMovePlayer;
    }
    if (type === 'deal') {
      if (!nativeDealPlayer) {
        nativeDealPlayer = createAudioPlayer(require('../../assets/sounds/card_deal.wav'));
      }
      return nativeDealPlayer;
    }
    if (type === 'reset') {
      if (!nativeResetPlayer) {
        nativeResetPlayer = createAudioPlayer(require('../../assets/sounds/card_reset.wav'));
      }
      return nativeResetPlayer;
    }
  } catch {
    return null;
  }
  return null;
}

export function playDealSound(): void {
  if (!soundEnabled) return;

  if (isBrowser) {
    playWebSynthesizedDeal();
  } else {
    try {
      const player = getNativePlayer('deal');
      if (player) {
        player.seekTo(0);
        player.play();
      }
    } catch {
      // Ignore native audio failure
    }
  }
}

export function playCardMoveSound(): void {
  if (!soundEnabled) return;

  if (isBrowser) {
    playWebSynthesizedMove();
  } else {
    try {
      const player = getNativePlayer('move');
      if (player) {
        player.seekTo(0);
        player.play();
      }
    } catch {
      // Ignore native audio failure
    }
  }
}

export function playResetSound(): void {
  if (!soundEnabled) return;

  if (isBrowser) {
    playWebSynthesizedReset();
  } else {
    try {
      const player = getNativePlayer('reset');
      if (player) {
        player.seekTo(0);
        player.play();
      }
    } catch {
      // Ignore native audio failure
    }
  }
}

/**
 * Synthesizes a gentle descending two-tone sound for game over.
 */
function playWebSynthesizedGameOver(): void {
  const ctx = getWebAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(320, now);
    osc1.frequency.exponentialRampToValueAtTime(260, now + 0.2);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(240, now + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(160, now + 0.5);
    gain2.gain.setValueAtTime(0.0001, now + 0.18);
    gain2.gain.linearRampToValueAtTime(0.28, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.55);
  } catch {
    // Ignore audio failure
  }
}

export function playGameOverSound(): void {
  if (!soundEnabled) return;

  if (isBrowser) {
    playWebSynthesizedGameOver();
  }
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

