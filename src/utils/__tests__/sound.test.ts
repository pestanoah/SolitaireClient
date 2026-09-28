import {
  isSoundEnabled,
  playCardMoveSound,
  playDealSound,
  playResetSound,
  setSoundEnabled,
} from '../sound';

describe('Sound Utility', () => {
  beforeEach(() => {
    setSoundEnabled(true);
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
    }).not.toThrow();

    setSoundEnabled(false);
    expect(() => {
      playDealSound();
      playCardMoveSound();
      playResetSound();
    }).not.toThrow();
  });
});
