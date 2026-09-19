import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, PlayerStats, UserSettings } from '../engine/types';

const STORAGE_KEYS = {
  ACTIVE_GAME: '@solitaire:active_game',
  STATS: '@solitaire:stats',
  SETTINGS: '@solitaire:settings',
};

const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  highScore: 0,
  bestTimeSeconds: null,
};

const DEFAULT_SETTINGS: UserSettings = {
  drawCount: 1,
  autoMoveOnTap: true,
};

export async function saveGameState(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_GAME, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game state', e);
  }
}

export async function loadGameState(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_GAME);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed && parsed.version === 1) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load game state', e);
  }
  return null;
}

export async function clearGameState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME);
  } catch (e) {
    console.error('Failed to clear game state', e);
  }
}

export async function loadStats(): Promise<PlayerStats> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return { ...DEFAULT_STATS };
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load stats', e);
    return { ...DEFAULT_STATS };
  }
}

export async function saveStats(stats: PlayerStats): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats', e);
  }
}

export async function recordGameEnd(
  won: boolean,
  score: number,
  elapsedSeconds: number
): Promise<PlayerStats> {
  const current = await loadStats();
  const next: PlayerStats = {
    gamesPlayed: current.gamesPlayed + 1,
    gamesWon: current.gamesWon + (won ? 1 : 0),
    highScore: Math.max(current.highScore, score),
    bestTimeSeconds: won
      ? current.bestTimeSeconds === null
        ? elapsedSeconds
        : Math.min(current.bestTimeSeconds, elapsedSeconds)
      : current.bestTimeSeconds,
  };
  await saveStats(next);
  return next;
}

export async function loadSettings(): Promise<UserSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load settings', e);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}
