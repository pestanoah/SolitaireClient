import {
  clearGameState,
  loadGameState,
  loadSettings,
  loadStats,
  recordGameEnd,
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

  test('saves and loads active game state', async () => {
    const game = dealKlondike(1, 999);
    await saveGameState(game);

    const loaded = await loadGameState();
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(game.id);
    expect(loaded!.tableau.length).toBe(7);

    await clearGameState();
    const afterClear = await loadGameState();
    expect(afterClear).toBeNull();
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

  test('saves and loads user settings', async () => {
    await saveSettings({ drawCount: 3, autoMoveOnTap: false });
    const loaded = await loadSettings();
    expect(loaded.drawCount).toBe(3);
    expect(loaded.autoMoveOnTap).toBe(false);
  });
});
