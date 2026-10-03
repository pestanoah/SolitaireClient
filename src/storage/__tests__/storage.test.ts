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
});
