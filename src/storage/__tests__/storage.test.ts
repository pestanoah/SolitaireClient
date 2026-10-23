import {
  clearDailyChallenges,
  clearGameState,
  clearStats,
  loadDailyChallenges,
  loadGameState,
  loadSettings,
  loadStats,
  recordDailyChallengeWon,
  recordGameEnd,
  resetStats,
  saveDailyChallenges,
  saveGameState,
  saveSettings,
} from '../storage';
import { dealKlondike } from '../../engine/deck';

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorage[key] = value;
  }),
  getItem: jest.fn(async (key: string) => {
    return mockStorage[key] || null;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete mockStorage[key];
  }),
}));

describe('Local Storage Persistence', () => {
  beforeEach(() => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
  });

  test('saves and loads active game state with moves', async () => {
    const game = dealKlondike(1, 999);
    game.moves = 1;
    await saveGameState(game);

    const loaded = await loadGameState();
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(game.id);
    expect(loaded!.tableau.length).toBe(7);

    await clearGameState();
    const afterClear = await loadGameState();
    expect(afterClear).toBeNull();
  });

  test('loadGameState ignores saved game state if status is not playing or moves is 0', async () => {
    const game = dealKlondike(1, 999);
    game.moves = 0; // Unplayed deal
    await saveGameState(game);

    const loadedZeroMoves = await loadGameState();
    expect(loadedZeroMoves).toBeNull();

    game.moves = 2;
    game.status = 'idle';
    await saveGameState(game);

    const loadedIdle = await loadGameState();
    expect(loadedIdle).toBeNull();

    game.status = 'won';
    await saveGameState(game);

    const loadedWon = await loadGameState();
    expect(loadedWon).toBeNull();
  });

  test('records game end stats correctly', async () => {
    const initialStats = await loadStats();
    expect(initialStats.gamesPlayed).toBe(0);

    const afterWin = await recordGameEnd(true, 350, 120);
    expect(afterWin.gamesPlayed).toBe(1);
    expect(afterWin.gamesWon).toBe(1);
    expect(afterWin.highScore).toBe(350);
    expect(afterWin.bestTimeSeconds).toBe(120);

    const afterLoss = await recordGameEnd(false, 100, 200);
    expect(afterLoss.gamesPlayed).toBe(2);
    expect(afterLoss.gamesWon).toBe(1);
    expect(afterLoss.highScore).toBe(350); // Unchanged
    expect(afterLoss.bestTimeSeconds).toBe(120); // Unchanged
  });

  test('resets stats back to default values', async () => {
    await recordGameEnd(true, 400, 95);
    const beforeReset = await loadStats();
    expect(beforeReset.gamesPlayed).toBe(1);
    expect(beforeReset.gamesWon).toBe(1);
    expect(beforeReset.highScore).toBe(400);
    expect(beforeReset.bestTimeSeconds).toBe(95);

    const resetResult = await resetStats();
    expect(resetResult.gamesPlayed).toBe(0);
    expect(resetResult.gamesWon).toBe(0);
    expect(resetResult.highScore).toBe(0);
    expect(resetResult.bestTimeSeconds).toBeNull();

    const loadedAfter = await loadStats();
    expect(loadedAfter.gamesPlayed).toBe(0);
    expect(loadedAfter.gamesWon).toBe(0);
    expect(loadedAfter.highScore).toBe(0);
    expect(loadedAfter.bestTimeSeconds).toBeNull();

    // Verify clearStats works as well
    await recordGameEnd(true, 200, 50);
    await clearStats();
    const loadedAfterClear = await loadStats();
    expect(loadedAfterClear.gamesPlayed).toBe(0);
  });

  test('loads default settings when none are stored', async () => {
    const loaded = await loadSettings();
    expect(loaded.drawCount).toBe(1);
    expect(loaded.autoMoveOnTap).toBe(true);
    expect(loaded.soundEnabled).toBe(true);
    expect(loaded.rightHanded).toBe(false);
  });

  test('saves and loads user settings including soundEnabled and rightHanded', async () => {
    await saveSettings({ drawCount: 3, autoMoveOnTap: false, soundEnabled: false, rightHanded: true });
    const loaded = await loadSettings();
    expect(loaded.drawCount).toBe(3);
    expect(loaded.autoMoveOnTap).toBe(false);
    expect(loaded.soundEnabled).toBe(false);
    expect(loaded.rightHanded).toBe(true);
  });

  test('toggles rightHanded setting and persists independently', async () => {
    let settings = await loadSettings();
    expect(settings.rightHanded).toBe(false);

    settings = { ...settings, rightHanded: true };
    await saveSettings(settings);

    let loaded = await loadSettings();
    expect(loaded.rightHanded).toBe(true);
    expect(loaded.drawCount).toBe(1);

    settings = { ...loaded, rightHanded: false };
    await saveSettings(settings);

    loaded = await loadSettings();
    expect(loaded.rightHanded).toBe(false);
  });

  describe('Daily Challenges Persistence', () => {
    test('returns empty object when no daily challenges have been recorded', async () => {
      const history = await loadDailyChallenges();
      expect(history).toEqual({});
    });

    test('records a daily challenge victory and persists record', async () => {
      const dateKey = '2026-10-22';
      const updated = await recordDailyChallengeWon(dateKey, 520, 75, 110);

      expect(updated[dateKey]).toBeDefined();
      expect(updated[dateKey].completed).toBe(true);
      expect(updated[dateKey].score).toBe(520);
      expect(updated[dateKey].moves).toBe(75);
      expect(updated[dateKey].elapsedSeconds).toBe(110);
      expect(updated[dateKey].completedAt).toBeDefined();

      const loaded = await loadDailyChallenges();
      expect(loaded[dateKey]).toEqual(updated[dateKey]);
    });

    test('replaying a daily challenge retains highest score and best time', async () => {
      const dateKey = '2026-10-21';
      // First win: score 400, moves 90, time 150
      await recordDailyChallengeWon(dateKey, 400, 90, 150);

      // Second win: higher score 600, fewer moves 70, faster time 120
      const afterBetter = await recordDailyChallengeWon(dateKey, 600, 70, 120);
      expect(afterBetter[dateKey].score).toBe(600);
      expect(afterBetter[dateKey].moves).toBe(70);
      expect(afterBetter[dateKey].elapsedSeconds).toBe(120);

      // Third win: lower score 300, more moves 100, slower time 200 -> should retain best stats
      const afterLower = await recordDailyChallengeWon(dateKey, 300, 100, 200);
      expect(afterLower[dateKey].score).toBe(600);
      expect(afterLower[dateKey].moves).toBe(70);
      expect(afterLower[dateKey].elapsedSeconds).toBe(120);
    });

    test('clears daily challenges history', async () => {
      await recordDailyChallengeWon('2026-10-20', 500, 80, 100);
      const before = await loadDailyChallenges();
      expect(Object.keys(before).length).toBe(1);

      await clearDailyChallenges();
      const after = await loadDailyChallenges();
      expect(after).toEqual({});
    });
  });
});
