import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyChallengeHistory, DailyChallengeRecord } from '../engine/daily';
import { GameState, PlayerStats, UserSettings } from '../engine/types';

const STORAGE_KEYS = {
  ACTIVE_GAME: '@solitaire:active_game',
  STATS: '@solitaire:stats',
  SETTINGS: '@solitaire:settings',
  DAILY_CHALLENGES: '@solitaire:daily_challenges',
};

export const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  highScore: 0,
  bestTimeSeconds: null,
};

export const DEFAULT_SETTINGS: UserSettings = {
  drawCount: 1,
  autoMoveOnTap: true,
  soundEnabled: true,
  rightHanded: false,
  winningDealsOnly: true,
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
    if (parsed && parsed.version === 1 && parsed.status === 'playing' && parsed.moves > 0) {
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

export async function resetStats(): Promise<PlayerStats> {
  const fresh = { ...DEFAULT_STATS };
  await saveStats(fresh);
  return fresh;
}

export async function clearStats(): Promise<void> {
  await resetStats();
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

export async function loadDailyChallenges(): Promise<DailyChallengeHistory> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_CHALLENGES);
    if (!raw) return {};
    return JSON.parse(raw) as DailyChallengeHistory;
  } catch (e) {
    console.error('Failed to load daily challenges history', e);
    return {};
  }
}

export async function saveDailyChallenges(history: DailyChallengeHistory): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGES, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save daily challenges history', e);
  }
}

export async function recordDailyChallengeWon(
  dateStr: string,
  score: number,
  moves: number,
  elapsedSeconds: number
): Promise<DailyChallengeHistory> {
  const current = await loadDailyChallenges();
  const dateKey = dateStr.slice(0, 10);
  const existing = current[dateKey];

  const updatedRecord: DailyChallengeRecord = {
    completed: true,
    score: existing ? Math.max(existing.score, score) : score,
    moves: existing ? Math.min(existing.moves, moves) : moves,
    elapsedSeconds: existing
      ? Math.min(existing.elapsedSeconds, elapsedSeconds)
      : elapsedSeconds,
    completedAt: existing?.completedAt || new Date().toISOString(),
  };

  const nextHistory: DailyChallengeHistory = {
    ...current,
    [dateKey]: updatedRecord,
  };

  await saveDailyChallenges(nextHistory);
  return nextHistory;
}

export async function clearDailyChallenges(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_CHALLENGES);
  } catch (e) {
    console.error('Failed to clear daily challenges history', e);
  }
}
