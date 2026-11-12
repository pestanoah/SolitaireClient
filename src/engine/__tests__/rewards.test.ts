import {
  awardPoints,
  calculateWinPoints,
  DEFAULT_CARD_BACK_PALETTE,
  DEFAULT_CARD_FACE_PALETTE,
  DEFAULT_CONFETTI_PALETTE,
  DEFAULT_FELT_PALETTE,
  DEFAULT_REWARDS_STATE,
  equipReward,
  getRewardById,
  getRewardsByCategory,
  normalizeRewardsState,
  redeemReward,
   resolveEquippedThemes,
  REWARD_CATALOG,
  STARTER_UNLOCKED_IDS,
} from '../rewards';

describe('Rewards & Points Engine', () => {
  describe('Catalog & Normalization', () => {
    test('starter items have 0 cost and are unlocked by default', () => {
      expect(STARTER_UNLOCKED_IDS).toEqual([
        'felt_classic_emerald',
        'back_classic_navy',
        'face_classic_white',
        'confetti_classic',
      ]);
      expect(DEFAULT_REWARDS_STATE.unlockedIds).toEqual(STARTER_UNLOCKED_IDS);
    });

    test('getRewardsByCategory returns items for each category', () => {
      expect(getRewardsByCategory('felt').length).toBeGreaterThanOrEqual(5);
      expect(getRewardsByCategory('cardBack').length).toBeGreaterThanOrEqual(5);
      expect(getRewardsByCategory('cardFace').length).toBeGreaterThanOrEqual(4);
      expect(getRewardsByCategory('confetti').length).toBeGreaterThanOrEqual(4);
    });

    test('normalizeRewardsState falls back cleanly for corrupt or partial input', () => {
      const normalizedNull = normalizeRewardsState(null);
      expect(normalizedNull).toEqual(DEFAULT_REWARDS_STATE);

      const normalizedPartial = normalizeRewardsState({
        points: 350,
        unlockedIds: ['felt_royal_sapphire', 'invalid_item_id'],
        equipped: {
          felt: 'felt_royal_sapphire',
          cardBack: 'back_crimson_royal', // not unlocked yet!
          cardFace: 'invalid_face',
          confetti: 'confetti_classic',
        },
      });

      expect(normalizedPartial.points).toBe(350);
      expect(normalizedPartial.lifetimePoints).toBe(350);
      expect(normalizedPartial.unlockedIds).toContain('felt_classic_emerald');
      expect(normalizedPartial.unlockedIds).toContain('felt_royal_sapphire');
      expect(normalizedPartial.unlockedIds).not.toContain('invalid_item_id');
      expect(normalizedPartial.equipped.felt).toBe('felt_royal_sapphire');
      expect(normalizedPartial.equipped.cardBack).toBe('back_classic_navy');
      expect(normalizedPartial.equipped.cardFace).toBe('face_classic_white');
    });
  });

  describe('calculateWinPoints', () => {
    test('calculates standard Draw 1 win with slow time', () => {
      const result = calculateWinPoints({
        score: 400,
        elapsedSeconds: 300,
        drawCount: 1,
      });

      expect(result.baseWinPoints).toBe(100);
      expect(result.scoreBonus).toBe(80); // 400 * 0.2
      expect(result.draw3Bonus).toBe(0);
      expect(result.speedBonus).toBe(0);
      expect(result.dailyChallengeBonus).toBe(0);
      expect(result.streakBonus).toBe(0);
      expect(result.totalEarned).toBe(180);
    });

    test('calculates Draw 3 win with fast speed bonus (<= 120s)', () => {
      const result = calculateWinPoints({
        score: 500,
        elapsedSeconds: 95,
        drawCount: 3,
      });

      expect(result.baseWinPoints).toBe(100);
      expect(result.scoreBonus).toBe(100);
      expect(result.draw3Bonus).toBe(50);
      expect(result.speedBonus).toBe(50);
      expect(result.totalEarned).toBe(300);
    });

    test('calculates medium speed bonus (121s - 240s)', () => {
      const result = calculateWinPoints({
        score: 250,
        elapsedSeconds: 180,
        drawCount: 1,
      });

      expect(result.speedBonus).toBe(25);
      expect(result.totalEarned).toBe(100 + 50 + 25);
    });

    test('calculates Daily Challenge first win and streak bonus', () => {
      const firstWin = calculateWinPoints({
        score: 500,
        elapsedSeconds: 150,
        drawCount: 1,
        isDaily: true,
        isFirstDailyCompletion: true,
        dailyStreak: 4,
      });

      expect(firstWin.dailyChallengeBonus).toBe(150);
      expect(firstWin.streakBonus).toBe(60); // 4 * 15
      expect(firstWin.totalEarned).toBe(100 + 100 + 25 + 150 + 60);

      // Replay of an already-completed daily challenge
      const replayWin = calculateWinPoints({
        score: 500,
        elapsedSeconds: 150,
        drawCount: 1,
        isDaily: true,
        isFirstDailyCompletion: false,
        dailyStreak: 4,
      });

      expect(replayWin.dailyChallengeBonus).toBe(25);
      expect(replayWin.streakBonus).toBe(0);
    });
  });

  describe('awardPoints, redeemReward, and equipReward', () => {
    test('awardPoints increments current and lifetime points immutably', () => {
      const initial = { ...DEFAULT_REWARDS_STATE };
      const afterAward = awardPoints(initial, 275);

      expect(afterAward.points).toBe(275);
      expect(afterAward.lifetimePoints).toBe(275);
      expect(initial.points).toBe(0);
    });

    test('redeemReward unlocks and auto-equips item when player has enough points', () => {
      const withPoints = awardPoints(DEFAULT_REWARDS_STATE, 500);
      const result = redeemReward(withPoints, 'felt_royal_sapphire'); // cost 250

      expect(result.success).toBe(true);
      expect(result.state.points).toBe(250);
      expect(result.state.lifetimePoints).toBe(500);
      expect(result.state.unlockedIds).toContain('felt_royal_sapphire');
      expect(result.state.equipped.felt).toBe('felt_royal_sapphire');
    });

    test('redeemReward fails when points are insufficient or already unlocked', () => {
      const lowPoints = awardPoints(DEFAULT_REWARDS_STATE, 100);
      const insufficient = redeemReward(lowPoints, 'felt_royal_sapphire'); // cost 250
      expect(insufficient.success).toBe(false);
      expect(insufficient.state.points).toBe(100);

      const alreadyUnlocked = redeemReward(lowPoints, 'felt_classic_emerald');
      expect(alreadyUnlocked.success).toBe(false);
    });

    test('equipReward switches active reward within category when unlocked', () => {
      const unlockedState = redeemReward(
        awardPoints(DEFAULT_REWARDS_STATE, 500),
        'back_crimson_royal'
      ).state;
      expect(unlockedState.equipped.cardBack).toBe('back_crimson_royal');

      // Switch back to classic navy
      const switchedBack = equipReward(unlockedState, 'back_classic_navy');
      expect(switchedBack.success).toBe(true);
      expect(switchedBack.state.equipped.cardBack).toBe('back_classic_navy');

      // Cannot equip locked item
      const lockedAttempt = equipReward(unlockedState, 'back_celestial_night');
      expect(lockedAttempt.success).toBe(false);
    });

    test('resolveEquippedThemes returns matching palettes for equipped rewards', () => {
      const defaultResolved = resolveEquippedThemes(DEFAULT_REWARDS_STATE);
      expect(defaultResolved.felt).toEqual(DEFAULT_FELT_PALETTE);
      expect(defaultResolved.cardBack).toEqual(DEFAULT_CARD_BACK_PALETTE);
      expect(defaultResolved.cardFace).toEqual(DEFAULT_CARD_FACE_PALETTE);
      expect(defaultResolved.confetti).toEqual(DEFAULT_CONFETTI_PALETTE);

      const customState = redeemReward(
        awardPoints(DEFAULT_REWARDS_STATE, 1000),
        'face_four_color'
      ).state;
      const customResolved = resolveEquippedThemes(customState);
      expect(customResolved.cardFace.suitColors?.diamonds).toBe('#2563eb');
      expect(customResolved.cardFace.suitColors?.clubs).toBe('#15803d');
    });

    test('every catalog item has valid category-specific palette data', () => {
      for (const item of REWARD_CATALOG) {
        expect(getRewardById(item.id)).toBeDefined();
        if (item.category === 'felt') expect(item.felt).toBeDefined();
        if (item.category === 'cardBack') expect(item.cardBack).toBeDefined();
        if (item.category === 'cardFace') expect(item.cardFace).toBeDefined();
        if (item.category === 'confetti') expect(item.confetti?.colors.length).toBeGreaterThan(0);
      }
    });
  });
});
