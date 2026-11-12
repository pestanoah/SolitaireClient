import { Suit } from './types';

export type RewardCategory = 'felt' | 'cardBack' | 'cardFace' | 'confetti';

export interface FeltThemePalette {
  background: string;
  surface: string;
  border: string;
  banner: string;
  bannerBorder: string;
  textMuted: string;
  accent: string;
}

export interface CardBackPalette {
  backBg: string;
  backBorder: string;
  backInnerBg: string;
  backPatternBg: string;
  backEmblem: string;
  emblemSymbol: string;
}

export interface CardFacePalette {
  frontBg: string;
  border: string;
  redSuit: string;
  blackSuit: string;
  suitColors?: Partial<Record<Suit, string>>;
}

export interface ConfettiPalette {
  colors: string[];
}

export interface RewardItem {
  id: string;
  category: RewardCategory;
  name: string;
  description: string;
  cost: number;
  previewIcon: string;
  felt?: FeltThemePalette;
  cardBack?: CardBackPalette;
  cardFace?: CardFacePalette;
  confetti?: ConfettiPalette;
}

export interface EquippedRewards {
  felt: string;
  cardBack: string;
  cardFace: string;
  confetti: string;
}

export interface RewardsState {
  points: number;
  lifetimePoints: number;
  unlockedIds: string[];
  equipped: EquippedRewards;
}

export interface WinPointsParams {
  score: number;
  elapsedSeconds: number;
  drawCount: 1 | 3;
  isDaily?: boolean;
  isFirstDailyCompletion?: boolean;
  dailyStreak?: number;
}

export interface WinPointsBreakdown {
  baseWinPoints: number;
  scoreBonus: number;
  draw3Bonus: number;
  speedBonus: number;
  dailyChallengeBonus: number;
  streakBonus: number;
  totalEarned: number;
}

export const DEFAULT_EQUIPPED_REWARDS: EquippedRewards = {
  felt: 'felt_classic_emerald',
  cardBack: 'back_classic_navy',
  cardFace: 'face_classic_white',
  confetti: 'confetti_classic',
};

export const DEFAULT_FELT_PALETTE: FeltThemePalette = {
  background: '#064e3b',
  surface: '#047857',
  border: 'rgba(255, 255, 255, 0.15)',
  banner: '#0f766e',
  bannerBorder: '#14b8a6',
  textMuted: '#a7f3d0',
  accent: '#6ee7b7',
};

export const DEFAULT_CARD_BACK_PALETTE: CardBackPalette = {
  backBg: '#1e3a8a',
  backBorder: '#e2e8f0',
  backInnerBg: '#172554',
  backPatternBg: '#1e40af',
  backEmblem: '#93c5fd',
  emblemSymbol: '♦',
};

export const DEFAULT_CARD_FACE_PALETTE: CardFacePalette = {
  frontBg: '#ffffff',
  border: '#94a3b8',
  redSuit: '#dc2626',
  blackSuit: '#0f172a',
};

export const DEFAULT_CONFETTI_PALETTE: ConfettiPalette = {
  colors: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'],
};

export const REWARD_CATALOG: RewardItem[] = [
  // 1. Felt / Board Themes
  {
    id: 'felt_classic_emerald',
    category: 'felt',
    name: 'Classic Emerald',
    description: 'Traditional casino green felt table',
    cost: 0,
    previewIcon: '🌿',
    felt: DEFAULT_FELT_PALETTE,
  },
  {
    id: 'felt_royal_sapphire',
    category: 'felt',
    name: 'Royal Sapphire',
    description: 'Deep ocean navy with crisp sky-blue accents',
    cost: 250,
    previewIcon: '💎',
    felt: {
      background: '#0c2d57',
      surface: '#1d4ed8',
      border: 'rgba(255, 255, 255, 0.16)',
      banner: '#1e3a8a',
      bannerBorder: '#38bdf8',
      textMuted: '#bae6fd',
      accent: '#7dd3fc',
    },
  },
  {
    id: 'felt_crimson_velvet',
    category: 'felt',
    name: 'Crimson Velvet',
    description: 'Monte Carlo burgundy cloth with rose-gold trim',
    cost: 350,
    previewIcon: '🍷',
    felt: {
      background: '#4c0519',
      surface: '#881337',
      border: 'rgba(255, 255, 255, 0.16)',
      banner: '#881337',
      bannerBorder: '#fb7185',
      textMuted: '#fecdd3',
      accent: '#fda4af',
    },
  },
  {
    id: 'felt_midnight_obsidian',
    category: 'felt',
    name: 'Midnight Obsidian',
    description: 'Sleek dark slate board built for night play',
    cost: 500,
    previewIcon: '🌑',
    felt: {
      background: '#090d16',
      surface: '#1e293b',
      border: 'rgba(255, 255, 255, 0.14)',
      banner: '#1e293b',
      bannerBorder: '#38bdf8',
      textMuted: '#cbd5e1',
      accent: '#38bdf8',
    },
  },
  {
    id: 'felt_amethyst_palace',
    category: 'felt',
    name: 'Amethyst Palace',
    description: 'Regal violet velvet with shimmering lavender highlights',
    cost: 650,
    previewIcon: '🔮',
    felt: {
      background: '#2e1065',
      surface: '#5b21b6',
      border: 'rgba(255, 255, 255, 0.16)',
      banner: '#4c1d95',
      bannerBorder: '#c084fc',
      textMuted: '#e9d5ff',
      accent: '#d8b4fe',
    },
  },
  {
    id: 'felt_sakura_blossom',
    category: 'felt',
    name: 'Cherry Blossom',
    description: 'Warm plum felt accented with soft sakura petals',
    cost: 800,
    previewIcon: '🌸',
    felt: {
      background: '#4a152c',
      surface: '#831843',
      border: 'rgba(255, 255, 255, 0.16)',
      banner: '#701a40',
      bannerBorder: '#f472b6',
      textMuted: '#fbcfe8',
      accent: '#f9a8d4',
    },
  },

  // 2. Card Back Designs
  {
    id: 'back_classic_navy',
    category: 'cardBack',
    name: 'Classic Navy',
    description: 'Traditional blue diamond lattice card back',
    cost: 0,
    previewIcon: '♦',
    cardBack: DEFAULT_CARD_BACK_PALETTE,
  },
  {
    id: 'back_crimson_royal',
    category: 'cardBack',
    name: 'Crimson Royal',
    description: 'Scarlet backing crowned with a golden emblem',
    cost: 200,
    previewIcon: '♛',
    cardBack: {
      backBg: '#7f1d1d',
      backBorder: '#fde68a',
      backInnerBg: '#450a0a',
      backPatternBg: '#991b1b',
      backEmblem: '#fbbf24',
      emblemSymbol: '♛',
    },
  },
  {
    id: 'back_emerald_lattice',
    category: 'cardBack',
    name: 'Emerald Filigree',
    description: 'Deep forest green with a mint geometric crest',
    cost: 300,
    previewIcon: '❖',
    cardBack: {
      backBg: '#065f46',
      backBorder: '#d1fae5',
      backInnerBg: '#022c22',
      backPatternBg: '#047857',
      backEmblem: '#6ee7b7',
      emblemSymbol: '❖',
    },
  },
  {
    id: 'back_imperial_gold',
    category: 'cardBack',
    name: 'Imperial Gold',
    description: 'Burnished bronze and gold starlight edition',
    cost: 500,
    previewIcon: '★',
    cardBack: {
      backBg: '#78350f',
      backBorder: '#fef08a',
      backInnerBg: '#451a03',
      backPatternBg: '#b45309',
      backEmblem: '#fde047',
      emblemSymbol: '★',
    },
  },
  {
    id: 'back_cyber_neon',
    category: 'cardBack',
    name: 'Cyber Neon',
    description: 'High-voltage dark synthwave deck with electric emblem',
    cost: 650,
    previewIcon: '⚡',
    cardBack: {
      backBg: '#0f172a',
      backBorder: '#38bdf8',
      backInnerBg: '#020617',
      backPatternBg: '#1e1b4b',
      backEmblem: '#f472b6',
      emblemSymbol: '⚡',
    },
  },
  {
    id: 'back_celestial_night',
    category: 'cardBack',
    name: 'Celestial Night',
    description: 'Astral indigo deck with a radiant golden sun crest',
    cost: 800,
    previewIcon: '☀',
    cardBack: {
      backBg: '#1e1b4b',
      backBorder: '#e0e7ff',
      backInnerBg: '#0f172a',
      backPatternBg: '#312e81',
      backEmblem: '#facc15',
      emblemSymbol: '☀',
    },
  },

  // 3. Card Face Styles
  {
    id: 'face_classic_white',
    category: 'cardFace',
    name: 'Classic Ivory',
    description: 'Crisp white card faces with classic red & black suits',
    cost: 0,
    previewIcon: '♠',
    cardFace: DEFAULT_CARD_FACE_PALETTE,
  },
  {
    id: 'face_four_color',
    category: 'cardFace',
    name: 'Tournament 4-Color',
    description: 'Instant suit recognition: Black ♠, Red ♥, Blue ♦, Green ♣',
    cost: 300,
    previewIcon: '♦',
    cardFace: {
      frontBg: '#ffffff',
      border: '#94a3b8',
      redSuit: '#dc2626',
      blackSuit: '#0f172a',
      suitColors: {
        spades: '#0f172a',
        hearts: '#dc2626',
        diamonds: '#2563eb',
        clubs: '#15803d',
      },
    },
  },
  {
    id: 'face_vintage_parchment',
    category: 'cardFace',
    name: 'Vintage Parchment',
    description: 'Warm antique cream paper with classic saloon ink',
    cost: 400,
    previewIcon: '📜',
    cardFace: {
      frontBg: '#fef3c7',
      border: '#d97706',
      redSuit: '#991b1b',
      blackSuit: '#292524',
    },
  },
  {
    id: 'face_midnight_dark',
    category: 'cardFace',
    name: 'Midnight Dark Mode',
    description: 'Low-glare charcoal faces with luminous coral & silver suits',
    cost: 600,
    previewIcon: '🌙',
    cardFace: {
      frontBg: '#1e293b',
      border: '#475569',
      redSuit: '#fb7185',
      blackSuit: '#f8fafc',
    },
  },

  // 4. Victory Confetti Themes
  {
    id: 'confetti_classic',
    category: 'confetti',
    name: 'Classic Fiesta',
    description: 'Vibrant multi-color celebration confetti burst',
    cost: 0,
    previewIcon: '🎉',
    confetti: DEFAULT_CONFETTI_PALETTE,
  },
  {
    id: 'confetti_gold_rush',
    category: 'confetti',
    name: 'Gold Rush',
    description: 'Luxurious shower of shimmering gold, amber, and champagne',
    cost: 250,
    previewIcon: '✨',
    confetti: {
      colors: ['#fbbf24', '#f59e0b', '#fde047', '#fef08a', '#d97706', '#ffffff'],
    },
  },
  {
    id: 'confetti_neon_arcade',
    category: 'confetti',
    name: 'Neon Arcade',
    description: 'Electric cyan, hot magenta, laser lime, and ultraviolet',
    cost: 400,
    previewIcon: '🕹️',
    confetti: {
      colors: ['#00f5d4', '#f15bb5', '#fee440', '#00bbf9', '#9b5de5', '#38bdf8'],
    },
  },
  {
    id: 'confetti_fire_and_ice',
    category: 'confetti',
    name: 'Fire & Ice',
    description: 'Blazing crimson flames colliding with glacier blue frost',
    cost: 550,
    previewIcon: '🔥',
    confetti: {
      colors: ['#ef4444', '#f97316', '#facc15', '#38bdf8', '#0284c7', '#e0f2fe'],
    },
  },
];

export const STARTER_UNLOCKED_IDS: string[] = REWARD_CATALOG.filter((r) => r.cost === 0).map(
  (r) => r.id
);

export const DEFAULT_REWARDS_STATE: RewardsState = {
  points: 0,
  lifetimePoints: 0,
  unlockedIds: [...STARTER_UNLOCKED_IDS],
  equipped: { ...DEFAULT_EQUIPPED_REWARDS },
};

/**
 * Looks up a reward item in the catalog by ID.
 */
export function getRewardById(rewardId: string): RewardItem | undefined {
  return REWARD_CATALOG.find((item) => item.id === rewardId);
}

/**
 * Returns all catalog rewards belonging to a given category.
 */
export function getRewardsByCategory(category: RewardCategory): RewardItem[] {
  return REWARD_CATALOG.filter((item) => item.category === category);
}

/**
 * Normalizes a partial or persisted RewardsState to ensure starter items are always unlocked
 * and equipped IDs always reference valid unlocked items.
 */
export function normalizeRewardsState(raw?: Partial<RewardsState> | null): RewardsState {
  if (!raw || typeof raw !== 'object') {
    return {
      points: 0,
      lifetimePoints: 0,
      unlockedIds: [...STARTER_UNLOCKED_IDS],
      equipped: { ...DEFAULT_EQUIPPED_REWARDS },
    };
  }

  const points = typeof raw.points === 'number' && raw.points >= 0 ? Math.floor(raw.points) : 0;
  const lifetimePoints =
    typeof raw.lifetimePoints === 'number' && raw.lifetimePoints >= points
      ? Math.floor(raw.lifetimePoints)
      : points;

  const unlockedSet = new Set<string>(STARTER_UNLOCKED_IDS);
  if (Array.isArray(raw.unlockedIds)) {
    for (const id of raw.unlockedIds) {
      if (typeof id === 'string' && getRewardById(id)) {
        unlockedSet.add(id);
      }
    }
  }

  const rawEquipped = raw.equipped ?? DEFAULT_EQUIPPED_REWARDS;
  const resolveEquippedCategory = (
    cat: RewardCategory,
    candidateId: string | undefined,
    fallbackId: string
  ): string => {
    if (!candidateId || !unlockedSet.has(candidateId)) {
      return fallbackId;
    }
    const item = getRewardById(candidateId);
    if (!item || item.category !== cat) {
      return fallbackId;
    }
    return candidateId;
  };

  const equipped: EquippedRewards = {
    felt: resolveEquippedCategory('felt', rawEquipped.felt, DEFAULT_EQUIPPED_REWARDS.felt),
    cardBack: resolveEquippedCategory(
      'cardBack',
      rawEquipped.cardBack,
      DEFAULT_EQUIPPED_REWARDS.cardBack
    ),
    cardFace: resolveEquippedCategory(
      'cardFace',
      rawEquipped.cardFace,
      DEFAULT_EQUIPPED_REWARDS.cardFace
    ),
    confetti: resolveEquippedCategory(
      'confetti',
      rawEquipped.confetti,
      DEFAULT_EQUIPPED_REWARDS.confetti
    ),
  };

  return {
    points,
    lifetimePoints,
    unlockedIds: Array.from(unlockedSet),
    equipped,
  };
}

/**
 * Calculates the points earned for winning a game.
 */
export function calculateWinPoints(params: WinPointsParams): WinPointsBreakdown {
  const {
    score,
    elapsedSeconds,
    drawCount,
    isDaily = false,
    isFirstDailyCompletion = false,
    dailyStreak = 0,
  } = params;

  const baseWinPoints = 100;
  const scoreBonus = Math.max(0, Math.floor(score * 0.2));
  const draw3Bonus = drawCount === 3 ? 50 : 0;

  let speedBonus = 0;
  if (elapsedSeconds >= 0 && elapsedSeconds <= 120) {
    speedBonus = 50;
  } else if (elapsedSeconds > 120 && elapsedSeconds <= 240) {
    speedBonus = 25;
  }

  let dailyChallengeBonus = 0;
  let streakBonus = 0;
  if (isDaily) {
    dailyChallengeBonus = isFirstDailyCompletion ? 150 : 25;
    if (isFirstDailyCompletion && dailyStreak > 1) {
      streakBonus = Math.min(100, dailyStreak * 15);
    }
  }

  const totalEarned =
    baseWinPoints +
    scoreBonus +
    draw3Bonus +
    speedBonus +
    dailyChallengeBonus +
    streakBonus;

  return {
    baseWinPoints,
    scoreBonus,
    draw3Bonus,
    speedBonus,
    dailyChallengeBonus,
    streakBonus,
    totalEarned,
  };
}

/**
 * Immutably awards points to the player's rewards state.
 */
export function awardPoints(state: RewardsState, amount: number): RewardsState {
  const validAmount = Math.max(0, Math.floor(amount));
  if (validAmount === 0) return state;

  return {
    ...state,
    points: state.points + validAmount,
    lifetimePoints: state.lifetimePoints + validAmount,
  };
}

/**
 * Attempts to unlock and equip a reward item using the player's points balance.
 */
export function redeemReward(
  state: RewardsState,
  rewardId: string
): { success: boolean; state: RewardsState; error?: string } {
  const item = getRewardById(rewardId);
  if (!item) {
    return { success: false, state, error: 'Reward not found.' };
  }

  if (state.unlockedIds.includes(rewardId)) {
    return { success: false, state, error: 'Reward is already unlocked.' };
  }

  if (state.points < item.cost) {
    return {
      success: false,
      state,
      error: `Not enough points. Need ${item.cost - state.points} more points.`,
    };
  }

  const nextState: RewardsState = {
    ...state,
    points: state.points - item.cost,
    unlockedIds: [...state.unlockedIds, rewardId],
    equipped: {
      ...state.equipped,
      [item.category]: rewardId,
    },
  };

  return { success: true, state: nextState };
}

/**
 * Immutably equips an already-unlocked reward item.
 */
export function equipReward(
  state: RewardsState,
  rewardId: string
): { success: boolean; state: RewardsState; error?: string } {
  const item = getRewardById(rewardId);
  if (!item) {
    return { success: false, state, error: 'Reward not found.' };
  }

  if (!state.unlockedIds.includes(rewardId)) {
    return { success: false, state, error: 'Reward must be unlocked before equipping.' };
  }

  if (state.equipped[item.category] === rewardId) {
    return { success: true, state };
  }

  return {
    success: true,
    state: {
      ...state,
      equipped: {
        ...state.equipped,
        [item.category]: rewardId,
      },
    },
  };
}

export interface ResolvedEquippedThemes {
  felt: FeltThemePalette;
  cardBack: CardBackPalette;
  cardFace: CardFacePalette;
  confetti: ConfettiPalette;
}

/**
 * Resolves the concrete palette objects for the currently equipped reward IDs.
 */
export function resolveEquippedThemes(state?: RewardsState | null): ResolvedEquippedThemes {
  const equipped = state?.equipped ?? DEFAULT_EQUIPPED_REWARDS;

  const feltItem = getRewardById(equipped.felt);
  const backItem = getRewardById(equipped.cardBack);
  const faceItem = getRewardById(equipped.cardFace);
  const confettiItem = getRewardById(equipped.confetti);

  return {
    felt: feltItem?.felt ?? DEFAULT_FELT_PALETTE,
    cardBack: backItem?.cardBack ?? DEFAULT_CARD_BACK_PALETTE,
    cardFace: faceItem?.cardFace ?? DEFAULT_CARD_FACE_PALETTE,
    confetti: confettiItem?.confetti ?? DEFAULT_CONFETTI_PALETTE,
  };
}
