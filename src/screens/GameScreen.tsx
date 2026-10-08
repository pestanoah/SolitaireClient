import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
  Platform,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '../theme';
import { styles } from './GameScreen.styles';
import { CardView } from '../components/CardView';
import { ConfirmModal } from '../components/ConfirmModal';
import { FoundationPile } from '../components/FoundationPile';
import { GameHeader } from '../components/GameHeader';
import { GameOverModal } from '../components/GameOverModal';
import { SettingsModal } from '../components/SettingsModal';
import { StatsModal } from '../components/StatsModal';
import { StockWaste } from '../components/StockWaste';
import { TableauColumn, calculateTableauOffsets } from '../components/TableauColumn';
import { WinModal } from '../components/WinModal';

export { calculateTableauOffsets };
import { dealKlondike } from '../engine/deck';
import { findAvailableHints, Hint } from '../engine/hints';
import {
  autoCompleteStep,
  drawCards,
  findSmartMove,
  moveCards,
  undo,
} from '../engine/klondike';
import {
  canAutoComplete,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  hasAvailableMoves,
  isGameWon,
} from '../engine/rules';
import { Card, FOUNDATION_SUITS, GameState, PileLocation, PileType, PlayerStats, UserSettings } from '../engine/types';
import {
  clearGameState,
  loadGameState,
  loadSettings,
  loadStats,
  recordGameEnd,
  saveGameState,
  saveSettings,
} from '../storage/storage';
import {
  playCardMoveSound,
  playDealSound,
  playGameOverSound,
  playResetSound,
  setSoundEnabled,
} from '../utils/sound';

interface AnimatingCardData {
  cards: Card[];
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  hiddenCardIds: string[];
  direction?: 'horizontal' | 'vertical';
  isReset?: boolean;
}

interface DragState {
  from: PileLocation;
  cards: Card[];
  cardIds: string[];
  startPos: { x: number; y: number };
}

const EMPTY_CARD_IDS: string[] = [];

// Auto-complete speed configuration (2x speed: 80ms delay, 100ms move animation)
export const AUTO_COMPLETE_DELAY_MS = 80;
export const AUTO_COMPLETE_ANIMATION_DURATION_MS = 100;

export interface PilePositionParams {
  boardWidth: number;
  cardWidth: number;
  cardHeight: number;
  gap: number;
  fanOffset: number;
  upOffset: number;
  downOffset: number;
  isRightHanded: boolean;
  drawCount: 1 | 3;
  wasteCount: number;
  topRowY?: number;
  tableauRowY?: number;
  maxColumnHeight?: number;
}

export function calculatePileBasePosition(
  pile: { type: PileType; index?: number },
  params: PilePositionParams
): { x: number; y: number } {
  const {
    boardWidth,
    cardWidth,
    cardHeight,
    gap,
    fanOffset,
    isRightHanded,
    drawCount,
    wasteCount,
    topRowY = 0,
    tableauRowY = cardHeight + spacing.xxl,
  } = params;

  if (pile.type === 'stock') {
    if (isRightHanded) {
      return {
        x: boardWidth - cardWidth,
        y: topRowY,
      };
    }
    return {
      x: 0,
      y: topRowY,
    };
  }

  if (pile.type === 'waste') {
    const visibleCount = drawCount === 3 ? Math.min(3, wasteCount) : Math.min(1, wasteCount);
    const currentWasteWidth = cardWidth + Math.max(0, visibleCount - 1) * fanOffset;

    if (isRightHanded) {
      return {
        x: boardWidth - cardWidth - spacing.lg - currentWasteWidth,
        y: topRowY,
      };
    }
    return {
      x: cardWidth + spacing.lg,
      y: topRowY,
    };
  }

  if (pile.type === 'foundation') {
    const fIndex = pile.index ?? 0;
    if (isRightHanded) {
      return {
        x: fIndex * (cardWidth + gap),
        y: topRowY,
      };
    }
    const foundationsStartX = boardWidth - (4 * cardWidth + 3 * gap);
    return {
      x: foundationsStartX + fIndex * (cardWidth + gap),
      y: topRowY,
    };
  }

  // Tableau column
  const tIndex = pile.index ?? 0;
  const tableauGap = (boardWidth - 7 * cardWidth) / 6;
  const colX = isRightHanded
    ? (6 - tIndex) * (cardWidth + tableauGap)
    : tIndex * (cardWidth + tableauGap);

  return {
    x: colX,
    y: tableauRowY,
  };
}

export function calculatePileCardPosition(
  pile: { type: PileType; index?: number },
  cardIndexInPile: number,
  state: GameState,
  params: PilePositionParams
): { x: number; y: number } {
  const basePos = calculatePileBasePosition(pile, {
    ...params,
    wasteCount: state.waste.length,
    drawCount: state.drawCount,
  });

  if (pile.type === 'stock' || pile.type === 'foundation') {
    return basePos;
  }

  if (pile.type === 'waste') {
    const effectiveCount = Math.max(
      1,
      cardIndexInPile !== undefined && cardIndexInPile >= 0 ? cardIndexInPile + 1 : state.waste.length
    );
    const visibleCount =
      state.drawCount === 3 ? Math.min(3, effectiveCount) : Math.min(1, effectiveCount);
    const hOffset = Math.max(0, visibleCount - 1) * params.fanOffset;
    return {
      x: basePos.x + hOffset,
      y: basePos.y,
    };
  }

  // Tableau column
  const tIndex = pile.index ?? 0;
  const col = state.tableau[tIndex] ?? [];
  const { offsets } = calculateTableauOffsets(
    col,
    params.cardHeight,
    params.upOffset,
    params.downOffset,
    params.maxColumnHeight
  );

  let vertOffset = 0;
  if (cardIndexInPile < offsets.length) {
    vertOffset = offsets[cardIndexInPile];
  } else if (offsets.length > 0) {
    const lastCard = col[col.length - 1];
    vertOffset =
      offsets[offsets.length - 1] + (lastCard?.faceUp ? params.upOffset : params.downOffset);
  }

  return {
    x: basePos.x,
    y: basePos.y + vertOffset,
  };
}

export const GameScreen: React.FC = () => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  // Settings & Stats
  const [settings, setSettings] = useState<UserSettings>({
    drawCount: 1,
    autoMoveOnTap: true,
    rightHanded: false,
  });
  const isRightHanded = settings.rightHanded === true;
  const [stats, setStats] = useState<PlayerStats>({
    gamesPlayed: 0,
    gamesWon: 0,
    highScore: 0,
    bestTimeSeconds: null,
  });
  const [statsVisible, setStatsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Active Game State
  const [gameState, setGameState] = useState<GameState>(() => dealKlondike(1));
  const [selectedCards, setSelectedCards] = useState<{
    from: PileLocation;
    cardIds: string[];
  } | null>(null);
  const [lossReason, setLossReason] = useState<'no_moves' | 'forfeit'>('no_moves');
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [winDismissed, setWinDismissed] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const recordedGameIdsRef = useRef<Set<string>>(new Set());

  // Animation State
  const animProgress = useRef(new Animated.Value(0)).current;
  const [animatingCard, setAnimatingCard] = useState<AnimatingCardData | null>(null);

  // Drag State
  const [dragState, setDraggedCard] = useState<DragState | null>(null);
  const dragPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isAnimatingRef = useRef(false);

  // Toast / Hint Banner
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active Hint State (Highlighting)
  const [activeHint, setActiveHint] = useState<Hint | null>(null);
  const hintIndexRef = useRef<number>(0);
  const hintHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearActiveHint = useCallback(() => {
    if (hintHighlightTimeoutRef.current) {
      clearTimeout(hintHighlightTimeoutRef.current);
      hintHighlightTimeoutRef.current = null;
    }
    setActiveHint(null);
  }, []);

  const showHint = useCallback((msg: string, duration = 2800) => {
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    setHintMessage(msg);
    hintTimeoutRef.current = setTimeout(() => {
      setHintMessage(null);
    }, duration);
  }, []);

  const handleHint = useCallback(() => {
    if (isAnimatingRef.current || canAutoComplete(gameState)) return;
    if (gameState.status !== 'playing') return;

    const hints = findAvailableHints(gameState);
    if (hints.length === 0) {
      showHint('No valid moves available.');
      clearActiveHint();
      return;
    }

    let nextIndex = 0;
    if (activeHint) {
      nextIndex = (hintIndexRef.current + 1) % hints.length;
    }
    hintIndexRef.current = nextIndex;
    const hint = hints[nextIndex];

    setActiveHint(hint);
    showHint(`💡 ${hint.message}`, 4000);

    if (hintHighlightTimeoutRef.current) {
      clearTimeout(hintHighlightTimeoutRef.current);
    }
    hintHighlightTimeoutRef.current = setTimeout(() => {
      setActiveHint(null);
    }, 4000);
  }, [gameState, activeHint, clearActiveHint, showHint]);

  // Measured Board Layout Positions (Relative to styles.board)
  const topRowLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const tableauRowLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const foundationsRowLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const stockLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wasteLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const foundationLayoutsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const tableauLayoutsRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const [measuredBoardWidth, setMeasuredBoardWidth] = useState<number>(0);

  const handleStockLayout = useCallback((_x: number, _y: number) => {}, []);
  const handleWasteLayout = useCallback((_x: number, _y: number) => {}, []);

  // Calculate responsive dimensions
  const {
    maxBoardWidth,
    gap,
    cardWidth,
    cardHeight,
    downOffset,
    upOffset,
    fanOffset,
    rowGap,
    maxColumnHeight,
  } = useMemo(() => {
    // Header & paddings based on orientation
    const headerHeight = isLandscape ? 38 : 95;
    const boardPaddingVertical = isLandscape ? 6 : spacing.xl;
    const tableauPaddingBottom = isLandscape ? 0 : spacing.bottomBarPadding;
    const rowGap = isLandscape
      ? Math.max(6, Math.min(12, Math.floor(windowHeight * 0.02)))
      : spacing.xxl;

    // Available width calculation
    const maxAvailableWidth = Math.min(windowWidth - (isLandscape ? 24 : 16), isLandscape ? 820 : 760);
    const preliminaryGap = Math.max(4, Math.floor(maxAvailableWidth * 0.015));
    const cardWidthFromWidth = Math.max(38, Math.floor((maxAvailableWidth - preliminaryGap * 6 - 16) / 7));
    const cardHeightFromWidth = Math.floor(cardWidthFromWidth * 1.4);

    // Available height calculation
    const availableBoardHeight = Math.max(
      200,
      windowHeight - headerHeight - boardPaddingVertical * 2 - tableauPaddingBottom
    );
    const heightBudget = Math.max(160, availableBoardHeight - rowGap);

    // Height-constrained card sizing (guarantees top row + tableau fit within available height without scrolling)
    const cardHeightFromHeight = Math.floor(heightBudget / (isLandscape ? 3.4 : 4.0));

    // Card dimensions respect BOTH width and height constraints
    const cardHeight = Math.max(
      48,
      Math.min(cardHeightFromWidth, isLandscape ? cardHeightFromHeight : cardHeightFromWidth)
    );
    const cardWidth = Math.max(34, Math.floor(cardHeight / 1.4));

    // Inter-column gap sized proportionally to card width so columns sit comfortably close together
    const gap = isLandscape
      ? Math.max(6, Math.min(10, Math.floor(cardWidth * 0.12)))
      : preliminaryGap;

    // Precise board width (7 columns + 6 gaps) so tableau columns are never over-spaced
    const targetBoardWidth = cardWidth * 7 + gap * 6;
    const maxBoardWidth = Math.min(maxAvailableWidth, targetBoardWidth);

    // Dynamic vertical offsets
    const downOffset = isLandscape
      ? Math.max(6, Math.floor(cardHeight * 0.12))
      : Math.max(12, Math.floor(cardHeight * 0.16));
    const upOffset = isLandscape
      ? Math.max(14, Math.floor(cardHeight * 0.24))
      : Math.max(28, Math.floor(cardHeight * 0.32));
    const fanOffset = Math.max(10, Math.floor(cardWidth * 0.28));

    // Max allowed tableau column height to guarantee zero vertical scrolling
    const maxColumnHeight = Math.max(cardHeight + 20, availableBoardHeight - cardHeight - rowGap);

    return {
      maxBoardWidth,
      gap,
      cardWidth,
      cardHeight,
      downOffset,
      upOffset,
      fanOffset,
      rowGap,
      maxColumnHeight,
    };
  }, [windowWidth, windowHeight, isLandscape]);

  // Persistence and Hydration tracking
  const isHydratedRef = useRef(false);
  const lastSavedGameRef = useRef<GameState | null>(null);
  const latestGameStateRef = useRef<GameState>(gameState);
  latestGameStateRef.current = gameState;

  // Load initial saved game and stats
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const loadedSettings = await loadSettings();
      if (!isMounted) return;
      setSettings(loadedSettings);
      setSoundEnabled(loadedSettings.soundEnabled !== false);

      const loadedStats = await loadStats();
      if (!isMounted) return;
      setStats(loadedStats);

      const savedGame = await loadGameState();
      if (!isMounted) return;
      if (savedGame) {
        lastSavedGameRef.current = savedGame;
        setGameState(savedGame);
      } else {
        const newGame = dealKlondike(loadedSettings.drawCount);
        lastSavedGameRef.current = newGame;
        setGameState(newGame);
        await saveGameState(newGame);
      }
      isHydratedRef.current = true;
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Autosave game state only on discrete game actions (moves, draws, undos, deals, wins)
  useEffect(() => {
    if (!isHydratedRef.current) return;

    if (gameState.status === 'won' || gameState.status === 'lost') {
      clearGameState();
      lastSavedGameRef.current = null;
      return;
    }

    // Skip if this game action has already been persisted (e.g. initial load or timer ticks)
    if (
      lastSavedGameRef.current?.id === gameState.id &&
      lastSavedGameRef.current?.history === gameState.history
    ) {
      return;
    }

    lastSavedGameRef.current = gameState;
    saveGameState(gameState);
  }, [gameState.id, gameState.history, gameState.status]);

  // Flush latest timer & score to storage on tab close, backgrounding, or unmount
  useEffect(() => {
    const handleFlush = () => {
      if (!isHydratedRef.current) return;
      const current = latestGameStateRef.current;
      if (current.status === 'playing') {
        saveGameState(current);
      }
    };

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        handleFlush();
      }
    });

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleFlush);
      window.addEventListener('pagehide', handleFlush);
    }

    return () => {
      appStateSub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleFlush);
        window.removeEventListener('pagehide', handleFlush);
      }
      handleFlush();
    };
  }, []);

  // Game timer loop
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const timer = setInterval(() => {
      setGameState((prev) => {
        if (prev.status !== 'playing') return prev;
        const nextSeconds = prev.elapsedSeconds + 1;
        const penalty = nextSeconds % 10 === 0 && prev.score > 0 ? 2 : 0;
        return {
          ...prev,
          elapsedSeconds: nextSeconds,
          score: Math.max(0, prev.score - penalty),
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.status]);

  // Reset modal dismissal state when a game is in progress
  useEffect(() => {
    if (gameState.status === 'playing') {
      setGameOverDismissed(false);
      setWinDismissed(false);
    }
  }, [gameState.status]);

  // Handle victory and loss recording
  useEffect(() => {
    if (gameState.status === 'won' || gameState.status === 'lost') {
      const isWon = gameState.status === 'won';
      if (!recordedGameIdsRef.current.has(gameState.id)) {
        recordedGameIdsRef.current.add(gameState.id);
        (async () => {
          const updated = await recordGameEnd(isWon, gameState.score, gameState.elapsedSeconds);
          setStats(updated);
        })();
      }
    }
  }, [gameState.status, gameState.id, gameState.score, gameState.elapsedSeconds]);

  // Check for game over (no legal moves left)
  useEffect(() => {
    if (
      gameState.status === 'playing' &&
      !canAutoComplete(gameState) &&
      !isGameWon(gameState.foundations)
    ) {
      const timer = setTimeout(() => {
        const current = latestGameStateRef.current;
        if (
          current.status === 'playing' &&
          !isAnimatingRef.current &&
          !canAutoComplete(current) &&
          !isGameWon(current.foundations) &&
          !hasAvailableMoves(current)
        ) {
          playGameOverSound();
          setLossReason('no_moves');
          setGameState((prev) => (prev.status === 'playing' ? { ...prev, status: 'lost' } : prev));
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const boardWidth = measuredBoardWidth > 0 ? measuredBoardWidth : maxBoardWidth;

  const pilePositionParams = useMemo<PilePositionParams>(
    () => ({
      boardWidth,
      cardWidth,
      cardHeight,
      gap,
      fanOffset,
      upOffset,
      downOffset,
      isRightHanded,
      drawCount: gameState.drawCount,
      wasteCount: gameState.waste.length,
      topRowY: topRowLayoutRef.current.y,
      tableauRowY: tableauRowLayoutRef.current.y || (cardHeight + rowGap),
      maxColumnHeight,
    }),
    [
      boardWidth,
      cardWidth,
      cardHeight,
      gap,
      fanOffset,
      upOffset,
      downOffset,
      isRightHanded,
      gameState.drawCount,
      gameState.waste.length,
      rowGap,
      maxColumnHeight,
    ]
  );

  const getPileBasePosition = useCallback(
    (pile: { type: PileType; index?: number }, wasteCountOverride?: number): { x: number; y: number } => {
      return calculatePileBasePosition(pile, {
        ...pilePositionParams,
        wasteCount: wasteCountOverride !== undefined ? wasteCountOverride : gameState.waste.length,
      });
    },
    [pilePositionParams, gameState.waste.length]
  );

  const getPileCardPosition = useCallback(
    (
      pile: { type: PileType; index?: number },
      cardIndexInPile: number,
      state: GameState
    ): { x: number; y: number } => {
      return calculatePileCardPosition(pile, cardIndexInPile, state, pilePositionParams);
    },
    [pilePositionParams]
  );

  useEffect(() => {
    stockLayoutRef.current = getPileBasePosition({ type: 'stock' });
    wasteLayoutRef.current = getPileBasePosition({ type: 'waste' });
    for (let f = 0; f < 4; f++) {
      foundationLayoutsRef.current.set(f, getPileBasePosition({ type: 'foundation', index: f }));
    }
    for (let t = 0; t < 7; t++) {
      tableauLayoutsRef.current.set(t, getPileBasePosition({ type: 'tableau', index: t }));
    }
  }, [getPileBasePosition]);

  // Animate and execute move
  const executeMoveWithAnimation = (
    from: PileLocation,
    to: PileLocation,
    cardIds: string[],
    durationOverride?: number
  ): boolean => {
    if (isAnimatingRef.current) return false;

    // Handle stock draw
    if (from.type === 'stock' && to.type === 'waste') {
      if (gameState.stock.length === 0) return false;
      const count = Math.min(gameState.drawCount, gameState.stock.length);
      const drawnCards = gameState.stock.slice(-count).map((c) => ({ ...c, faceUp: true }));
      const nextState = drawCards(gameState);

      const startPos = getPileBasePosition({ type: 'stock' });
      const endPos = getPileBasePosition({ type: 'waste' }, nextState.waste.length);

      isAnimatingRef.current = true;
      playDealSound();
      setAnimatingCard({
        cards: drawnCards,
        startX: startPos.x,
        startY: startPos.y,
        endX: endPos.x,
        endY: endPos.y,
        hiddenCardIds: drawnCards.map((c) => c.id),
        direction: 'horizontal',
      });

      animProgress.setValue(0);
      Animated.timing(animProgress, {
        toValue: 1,
        duration: durationOverride !== undefined ? durationOverride : 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        setGameState(nextState);
        setAnimatingCard(null);
        isAnimatingRef.current = false;
      });
      return true;
    }

    // Handle waste recycle to stock
    if (from.type === 'waste' && to.type === 'stock') {
      if (gameState.waste.length === 0) return false;
      const count = Math.min(gameState.drawCount === 3 ? 3 : 1, gameState.waste.length);
      const cardsToAnimate = gameState.waste.slice(-count);
      const allWasteIds = gameState.waste.map((c) => c.id);
      const nextState = drawCards(gameState);

      const startPos = getPileBasePosition({ type: 'waste' }, gameState.waste.length);
      const endPos = getPileBasePosition({ type: 'stock' });

      isAnimatingRef.current = true;
      playResetSound();
      setAnimatingCard({
        cards: cardsToAnimate,
        startX: startPos.x,
        startY: startPos.y,
        endX: endPos.x,
        endY: endPos.y,
        hiddenCardIds: allWasteIds,
        direction: 'horizontal',
        isReset: true,
      });

      animProgress.setValue(0);
      Animated.timing(animProgress, {
        toValue: 1,
        duration: durationOverride !== undefined ? durationOverride : 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        setGameState(nextState);
        setAnimatingCard(null);
        isAnimatingRef.current = false;
      });
      return true;
    }

    const nextState = moveCards(gameState, from, to, cardIds);
    if (!nextState) return false;

    playCardMoveSound();

    // Determine moving cards and initial index
    let movingCards: Card[] = [];
    let sourceCardIndex = 0;

    if (from.type === 'waste') {
      movingCards = [gameState.waste[gameState.waste.length - 1]];
      sourceCardIndex = gameState.waste.length - 1;
    } else if (from.type === 'tableau') {
      const col = gameState.tableau[from.index];
      sourceCardIndex = col.findIndex((c) => c.id === cardIds[0]);
      if (sourceCardIndex !== -1) {
        movingCards = col.slice(sourceCardIndex);
      }
    } else if (from.type === 'foundation') {
      const f = gameState.foundations[from.index];
      movingCards = [f[f.length - 1]];
      sourceCardIndex = f.length - 1;
    }

    if (movingCards.length === 0) {
      setGameState(nextState);
      return true;
    }

    const startPos = getPileCardPosition(from, sourceCardIndex, gameState);

    let destCardIndex = 0;
    if (to.type === 'tableau') {
      destCardIndex = gameState.tableau[to.index].length;
    } else if (to.type === 'foundation') {
      destCardIndex = gameState.foundations[to.index].length;
    }
    const endPos = getPileCardPosition(to, destCardIndex, gameState);

    // Run animation
    isAnimatingRef.current = true;
    setAnimatingCard({
      cards: movingCards,
      startX: startPos.x,
      startY: startPos.y,
      endX: endPos.x,
      endY: endPos.y,
      hiddenCardIds: cardIds,
    });

    animProgress.setValue(0);
    Animated.timing(animProgress, {
      toValue: 1,
      duration: durationOverride !== undefined ? durationOverride : 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setGameState(nextState);
      setAnimatingCard(null);
      isAnimatingRef.current = false;
    });

    return true;
  };

  // Find valid drop target under drop point
  const findDropTarget = useCallback(
    (
      cards: Card[],
      from: PileLocation,
      dropX: number,
      dropY: number
    ): PileLocation | null => {
      const leadCard = cards[0];
      const dropCenterX = dropX + cardWidth / 2;
      const dropCenterY = dropY + cardHeight / 2;

      // 1. Check Foundations if dragging a single card
      if (cards.length === 1) {
        let bestFoundation: { index: number; dist: number } | null = null;
        for (let f = 0; f < gameState.foundations.length; f++) {
          if (from.type === 'foundation' && from.index === f) continue;
          const pos = getPileBasePosition({ type: 'foundation', index: f });
          const fx = pos.x;
          const fy = pos.y;

          const inBounds =
            dropCenterX >= fx - 15 &&
            dropCenterX <= fx + cardWidth + 15 &&
            dropCenterY >= fy - 15 &&
            dropCenterY <= fy + cardHeight + 40;

          if (inBounds && canPlaceOnFoundation(leadCard, gameState.foundations[f], f)) {
            const fCenterX = fx + cardWidth / 2;
            const dist = Math.abs(dropCenterX - fCenterX);
            if (!bestFoundation || dist < bestFoundation.dist) {
              bestFoundation = { index: f, dist };
            }
          }
        }

        if (bestFoundation) {
          return { type: 'foundation', index: bestFoundation.index };
        }
      }

      // 2. Check Tableau columns
      let bestTableau: { index: number; dist: number } | null = null;
      for (let t = 0; t < gameState.tableau.length; t++) {
        if (from.type === 'tableau' && from.index === t) continue;
        const pos = getPileBasePosition({ type: 'tableau', index: t });
        const tx = pos.x;
        const ty = pos.y;

        const col = gameState.tableau[t] ?? [];
        const { columnHeight } = calculateTableauOffsets(
          col,
          cardHeight,
          upOffset,
          downOffset,
          maxColumnHeight
        );

        const inBounds =
          dropCenterX >= tx - gap &&
          dropCenterX <= tx + cardWidth + gap &&
          dropCenterY >= ty - 30 &&
          dropCenterY <= ty + columnHeight + 80;

        if (inBounds && canPlaceOnTableau(leadCard, col, false)) {
          const colCenterX = tx + cardWidth / 2;
          const dist = Math.abs(dropCenterX - colCenterX);
          if (!bestTableau || dist < bestTableau.dist) {
            bestTableau = { index: t, dist };
          }
        }
      }

      if (bestTableau) {
        return { type: 'tableau', index: bestTableau.index };
      }

      return null;
    },
    [gameState, cardWidth, cardHeight, gap, upOffset, downOffset, maxColumnHeight, getPileBasePosition]
  );

  // Drag-and-drop handlers
  const handleDragStart = useCallback(
    (from: PileLocation, card: Card, cardIndex: number) => {
      if (isAnimatingRef.current || canAutoComplete(gameState)) return;
      clearActiveHint();
      setSelectedCards(null);

      let movingCards: Card[] = [];
      if (from.type === 'tableau') {
        const col = gameState.tableau[from.index] ?? [];
        movingCards = col.slice(cardIndex);
      } else if (from.type === 'waste') {
        const top = gameState.waste[gameState.waste.length - 1];
        if (top) movingCards = [top];
      } else if (from.type === 'foundation') {
        const pile = gameState.foundations[from.index] ?? [];
        const top = pile[pile.length - 1];
        if (top) movingCards = [top];
      }

      if (movingCards.length === 0) return;

      const startPos = getPileCardPosition(from, cardIndex, gameState);
      dragPan.setValue({ x: 0, y: 0 });

      setDraggedCard({
        from,
        cards: movingCards,
        cardIds: movingCards.map((c) => c.id),
        startPos,
      });
    },
    [gameState, getPileCardPosition, dragPan, clearActiveHint]
  );

  const handleDragMove = useCallback(
    (dx: number, dy: number) => {
      dragPan.setValue({ x: dx, y: dy });
    },
    [dragPan]
  );

  const handleDragEnd = useCallback(
    (dx: number, dy: number, isDrag: boolean) => {
      if (!dragState) return;

      if (!isDrag) {
        setDraggedCard(null);
        return;
      }

      const dropX = dragState.startPos.x + dx;
      const dropY = dragState.startPos.y + dy;

      const target = findDropTarget(dragState.cards, dragState.from, dropX, dropY);

      if (target) {
        const nextState = moveCards(gameState, dragState.from, target, dragState.cardIds);
        if (nextState) {
          playCardMoveSound();
          let destCardIndex = 0;
          if (target.type === 'tableau') {
            destCardIndex = gameState.tableau[target.index].length;
          } else if (target.type === 'foundation') {
            destCardIndex = gameState.foundations[target.index].length;
          }
          const targetPos = getPileCardPosition(target, destCardIndex, gameState);

          isAnimatingRef.current = true;
          Animated.timing(dragPan, {
            toValue: {
              x: targetPos.x - dragState.startPos.x,
              y: targetPos.y - dragState.startPos.y,
            },
            duration: 120,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start(() => {
            setGameState(nextState);
            setDraggedCard(null);
            setSelectedCards(null);
            isAnimatingRef.current = false;
          });
          return;
        }
      }

      // Snap back if invalid drop
      isAnimatingRef.current = true;
      Animated.timing(dragPan, {
        toValue: { x: 0, y: 0 },
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        setDraggedCard(null);
        isAnimatingRef.current = false;
      });
    },
    [dragState, gameState, findDropTarget, getPileCardPosition, dragPan]
  );

  // Stock press with draw animation
  const handleStockPress = useCallback(() => {
    if (isAnimatingRef.current || canAutoComplete(gameState)) return;
    clearActiveHint();
    setSelectedCards(null);

    if (gameState.stock.length === 0) {
      if (gameState.waste.length === 0) return;

      // Recycle waste to stock with animation
      const count = Math.min(gameState.drawCount === 3 ? 3 : 1, gameState.waste.length);
      const cardsToAnimate = gameState.waste.slice(-count);
      const allWasteIds = gameState.waste.map((c) => c.id);
      const nextState = drawCards(gameState);

      const startPos = getPileBasePosition({ type: 'waste' }, gameState.waste.length);
      const endPos = getPileBasePosition({ type: 'stock' });

      isAnimatingRef.current = true;
      playResetSound();
      setAnimatingCard({
        cards: cardsToAnimate,
        startX: startPos.x,
        startY: startPos.y,
        endX: endPos.x,
        endY: endPos.y,
        hiddenCardIds: allWasteIds,
        direction: 'horizontal',
        isReset: true,
      });

      animProgress.setValue(0);
      Animated.timing(animProgress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        setGameState(nextState);
        setAnimatingCard(null);
        isAnimatingRef.current = false;
      });
      return;
    }

    const count = Math.min(gameState.drawCount, gameState.stock.length);
    const drawnCards = gameState.stock.slice(-count).map((c) => ({ ...c, faceUp: true }));
    const nextState = drawCards(gameState);

    const startPos = getPileBasePosition({ type: 'stock' });
    const endPos = getPileBasePosition({ type: 'waste' }, nextState.waste.length);

    isAnimatingRef.current = true;
    playDealSound();
    setAnimatingCard({
      cards: drawnCards,
      startX: startPos.x,
      startY: startPos.y,
      endX: endPos.x,
      endY: endPos.y,
      hiddenCardIds: drawnCards.map((c) => c.id),
      direction: 'horizontal',
    });

    animProgress.setValue(0);
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      setGameState(nextState);
      setAnimatingCard(null);
      isAnimatingRef.current = false;
    });
  }, [gameState, clearActiveHint, getPileBasePosition]);

  // Waste card press
  const handleWasteCardPress = useCallback(
    (card: Card) => {
      if (isAnimatingRef.current || canAutoComplete(gameState)) return;
      clearActiveHint();

      if (settings.autoMoveOnTap) {
        const smart = findSmartMove(gameState, card.id);
        if (smart) {
          const success = executeMoveWithAnimation(smart.from, smart.to, smart.cardIds);
          if (success) {
            setSelectedCards(null);
            return;
          }
        }
      }

      // Fallback to select
      if (selectedCards?.cardIds[0] === card.id) {
        setSelectedCards(null);
      } else {
        setSelectedCards({ from: { type: 'waste', index: 0 }, cardIds: [card.id] });
      }
    },
    [gameState, selectedCards, settings.autoMoveOnTap, clearActiveHint]
  );

  // Tableau card press
  const handleTableauCardPress = useCallback(
    (card: Card, colIndex: number) => {
      if (isAnimatingRef.current || canAutoComplete(gameState)) return;
      clearActiveHint();

      // If we already have selected cards, try to move onto this tableau column
      if (selectedCards) {
        const success = executeMoveWithAnimation(
          selectedCards.from,
          { type: 'tableau', index: colIndex },
          selectedCards.cardIds
        );
        if (success) {
          setSelectedCards(null);
          return;
        }
      }

      // Tap-to-move smart placement
      if (settings.autoMoveOnTap) {
        const smart = findSmartMove(gameState, card.id);
        if (smart) {
          const success = executeMoveWithAnimation(smart.from, smart.to, smart.cardIds);
          if (success) {
            setSelectedCards(null);
            return;
          }
        }
      }

      // Otherwise select card & its stack
      const col = gameState.tableau[colIndex];
      const cardIdx = col.findIndex((c) => c.id === card.id);
      const cardIds = col.slice(cardIdx).map((c) => c.id);

      if (selectedCards?.cardIds[0] === card.id) {
        setSelectedCards(null);
      } else {
        setSelectedCards({ from: { type: 'tableau', index: colIndex }, cardIds });
      }
    },
    [gameState, selectedCards, settings.autoMoveOnTap, clearActiveHint]
  );

  // Empty tableau column press (e.g. King target)
  const handleEmptyColumnPress = useCallback(
    (colIndex: number) => {
      if (isAnimatingRef.current || canAutoComplete(gameState)) return;
      clearActiveHint();

      if (selectedCards) {
        const success = executeMoveWithAnimation(
          selectedCards.from,
          { type: 'tableau', index: colIndex },
          selectedCards.cardIds
        );
        if (success) {
          setSelectedCards(null);
        } else {
          showHint('In Klondike, only Kings can be placed on empty tableau spaces.');
        }
      }
    },
    [gameState, selectedCards, clearActiveHint, showHint]
  );

  // Foundation pile press
  const handleFoundationPress = useCallback(
    (fIndex: number) => {
      if (isAnimatingRef.current || canAutoComplete(gameState)) return;
      clearActiveHint();

      const pile = gameState.foundations[fIndex];
      const topCard = pile.length > 0 ? pile[pile.length - 1] : null;

      // 1. If we already have a selection
      if (selectedCards) {
        // Tapping the same foundation card toggles/deselects it
        if (selectedCards.from.type === 'foundation' && selectedCards.from.index === fIndex) {
          setSelectedCards(null);
          return;
        }

        // Try to move the currently selected card(s) onto this foundation pile
        const success = executeMoveWithAnimation(
          selectedCards.from,
          { type: 'foundation', index: fIndex },
          selectedCards.cardIds
        );
        if (success) {
          setSelectedCards(null);
          return;
        }

        // If move was not valid:
        // If foundation is empty, display hint and clear selection
        if (!topCard) {
          const expectedSuit = FOUNDATION_SUITS[fIndex % FOUNDATION_SUITS.length];
          showHint(`This foundation is reserved for ${expectedSuit}.`);
          setSelectedCards(null);
          return;
        }
      }

      // 2. Either no card was selected or previous selection couldn't move here
      if (topCard) {
        // Tap-to-move smart placement down from foundation to tableau
        if (settings.autoMoveOnTap) {
          const smart = findSmartMove(gameState, topCard.id);
          if (smart) {
            const success = executeMoveWithAnimation(smart.from, smart.to, smart.cardIds);
            if (success) {
              setSelectedCards(null);
              return;
            }
          }
        }

        // Fallback to selecting the foundation card
        setSelectedCards({
          from: { type: 'foundation', index: fIndex },
          cardIds: [topCard.id],
        });
      }
    },
    [gameState, selectedCards, settings.autoMoveOnTap, clearActiveHint, showHint]
  );

  const handleFoundation0Press = useCallback(() => handleFoundationPress(0), [handleFoundationPress]);
  const handleFoundation1Press = useCallback(() => handleFoundationPress(1), [handleFoundationPress]);
  const handleFoundation2Press = useCallback(() => handleFoundationPress(2), [handleFoundationPress]);
  const handleFoundation3Press = useCallback(() => handleFoundationPress(3), [handleFoundationPress]);
  const foundationPressHandlers = useMemo(
    () => [handleFoundation0Press, handleFoundation1Press, handleFoundation2Press, handleFoundation3Press],
    [handleFoundation0Press, handleFoundation1Press, handleFoundation2Press, handleFoundation3Press]
  );

  // Auto-complete runner with animation (2x speed)
  useEffect(() => {
    const currentState = latestGameStateRef.current;
    if (currentState.status === 'playing' && canAutoComplete(currentState) && !isAnimatingRef.current) {
      clearActiveHint();
      setSelectedCards(null);
      const timer = setTimeout(() => {
        const activeState = latestGameStateRef.current;
        if (activeState.status !== 'playing' || !canAutoComplete(activeState) || isAnimatingRef.current) {
          return;
        }
        const next = autoCompleteStep(activeState);
        if (next && next.history.length > activeState.history.length) {
          const lastMove = next.history[next.history.length - 1];
          executeMoveWithAnimation(
            lastMove.from,
            lastMove.to,
            lastMove.cardIds,
            AUTO_COMPLETE_ANIMATION_DURATION_MS
          );
        }
      }, AUTO_COMPLETE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [gameState.id, gameState.history, gameState.status, clearActiveHint]);

  // Internal helper to deal a new game and reset animation/selection states
  const startNewGame = useCallback(
    (count?: 1 | 3) => {
      clearActiveHint();
      setSelectedCards(null);
      setAnimatingCard(null);
      isAnimatingRef.current = false;
      setLossReason('no_moves');
      setGameOverDismissed(false);
      setWinDismissed(false);
      playDealSound();
      const newGame = dealKlondike(count ?? settings.drawCount);
      setGameState(newGame);
    },
    [settings.drawCount, clearActiveHint]
  );

  // Start new game (prompts if active game has moves)
  const handleNewGame = useCallback(() => {
    if (gameState.status === 'playing' && gameState.moves > 0) {
      setConfirmModal({
        visible: true,
        title: 'Abandon Game?',
        message: 'Starting a new game will record the current game as a loss in your stats.',
        confirmLabel: 'Abandon & Deal',
        onConfirm: async () => {
          setConfirmModal(null);
          if (!recordedGameIdsRef.current.has(gameState.id)) {
            recordedGameIdsRef.current.add(gameState.id);
            const updated = await recordGameEnd(false, gameState.score, gameState.elapsedSeconds);
            setStats(updated);
          }
          startNewGame();
        },
      });
      return;
    }

    startNewGame();
  }, [gameState.status, gameState.moves, gameState.id, gameState.score, gameState.elapsedSeconds, startNewGame]);

  // Give up / forfeit game
  const handleGiveUp = useCallback(() => {
    if (gameState.status !== 'playing' || gameState.moves === 0) return;
    setConfirmModal({
      visible: true,
      title: 'Give Up Game?',
      message: 'Are you sure you want to end this game? It will be recorded as a loss in your stats.',
      confirmLabel: 'Give Up',
      onConfirm: () => {
        setConfirmModal(null);
        playGameOverSound();
        setLossReason('forfeit');
        setGameState((prev) => ({ ...prev, status: 'lost' }));
      },
    });
  }, [gameState.status, gameState.moves]);

  // Change Draw Mode (Turn 1 vs Turn 3)
  const handleChangeDrawCount = useCallback(
    (newCount: 1 | 3) => {
      if (newCount === settings.drawCount) return;

      const nextSettings = { ...settings, drawCount: newCount };

      const proceedWithChange = async () => {
        if (
          gameState.status === 'playing' &&
          gameState.moves > 0 &&
          !recordedGameIdsRef.current.has(gameState.id)
        ) {
          recordedGameIdsRef.current.add(gameState.id);
          const updated = await recordGameEnd(false, gameState.score, gameState.elapsedSeconds);
          setStats(updated);
        }
        setSettings(nextSettings);
        saveSettings(nextSettings);
        startNewGame(newCount);
      };

      if (gameState.status === 'playing' && gameState.moves > 0) {
        setSettingsVisible(false);
        setConfirmModal({
          visible: true,
          title: 'Change Draw Mode?',
          message: 'Changing draw mode will abandon the current game and record it as a loss.',
          confirmLabel: 'Change Mode',
          onConfirm: () => {
            setConfirmModal(null);
            proceedWithChange();
          },
        });
        return;
      }

      proceedWithChange();
    },
    [settings, gameState.status, gameState.moves, gameState.id, gameState.score, gameState.elapsedSeconds, startNewGame]
  );

  // Toggle Draw Mode (Turn 1 vs Turn 3)
  const handleToggleDrawCount = useCallback(() => {
    const nextCount = settings.drawCount === 1 ? 3 : 1;
    handleChangeDrawCount(nextCount as 1 | 3);
  }, [settings.drawCount, handleChangeDrawCount]);

  // Toggle Sound Effects (Mute / Unmute)
  const handleToggleSound = useCallback(
    (enabled?: boolean) => {
      const nextSound = typeof enabled === 'boolean' ? enabled : settings.soundEnabled === false;
      const nextSettings = { ...settings, soundEnabled: nextSound };
      setSettings(nextSettings);
      saveSettings(nextSettings);
      setSoundEnabled(nextSound);
      if (nextSound) {
        playCardMoveSound();
      }
    },
    [settings]
  );

  // Toggle Auto-Move on Tap
  const handleToggleAutoMove = useCallback(
    (enabled?: boolean) => {
      const nextAutoMove = typeof enabled === 'boolean' ? enabled : !settings.autoMoveOnTap;
      const nextSettings = { ...settings, autoMoveOnTap: nextAutoMove };
      setSettings(nextSettings);
      saveSettings(nextSettings);
    },
    [settings]
  );

  // Toggle Right-Handed Mode
  const handleToggleRightHanded = useCallback(
    (enabled?: boolean) => {
      const nextRightHanded = typeof enabled === 'boolean' ? enabled : !settings.rightHanded;
      const nextSettings = { ...settings, rightHanded: nextRightHanded };
      setSettings(nextSettings);
      saveSettings(nextSettings);
    },
    [settings]
  );

  // Undo move with animation
  const handleUndo = useCallback(() => {
    if (isAnimatingRef.current || canAutoComplete(gameState)) return;
    if (gameState.history.length === 0) return;

    clearActiveHint();
    setSelectedCards(null);

    const lastMove = gameState.history[gameState.history.length - 1];
    const nextState = undo(gameState);

    // Case 1: Undo draw from stock to waste (return drawn cards to stock)
    if (lastMove.from.type === 'stock' && lastMove.to.type === 'waste') {
      const count = lastMove.cardIds.length;
      const cardsToAnimate = gameState.waste.slice(-count);
      const allUndoneWasteIds = cardsToAnimate.map((c) => c.id);

      const startPos = getPileBasePosition({ type: 'waste' }, gameState.waste.length);
      const endPos = getPileBasePosition({ type: 'stock' });

      isAnimatingRef.current = true;
      playDealSound();
      setAnimatingCard({
        cards: cardsToAnimate,
        startX: startPos.x,
        startY: startPos.y,
        endX: endPos.x,
        endY: endPos.y,
        hiddenCardIds: allUndoneWasteIds,
        direction: 'horizontal',
        isReset: true,
      });

      animProgress.setValue(0);
      Animated.timing(animProgress, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        setGameState(nextState);
        setAnimatingCard(null);
        isAnimatingRef.current = false;
      });
      return;
    }

    // Case 2: Undo stock recycle (waste -> stock)
    if (lastMove.from.type === 'waste' && lastMove.to.type === 'stock') {
      const count = Math.min(gameState.drawCount === 3 ? 3 : 1, gameState.stock.length);
      const cardsToAnimate = gameState.stock.slice(0, count).map((c) => ({ ...c, faceUp: true }));

      const startPos = getPileBasePosition({ type: 'stock' });
      const endPos = getPileBasePosition({ type: 'waste' }, nextState.waste.length);

      isAnimatingRef.current = true;
      playResetSound();
      setAnimatingCard({
        cards: cardsToAnimate,
        startX: startPos.x,
        startY: startPos.y,
        endX: endPos.x,
        endY: endPos.y,
        hiddenCardIds: [],
        direction: 'horizontal',
      });

      animProgress.setValue(0);
      Animated.timing(animProgress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        setGameState(nextState);
        setAnimatingCard(null);
        isAnimatingRef.current = false;
      });
      return;
    }

    // Case 3: Undo move between piles (tableau, foundation, waste)
    let movingCards: Card[] = [];
    let sourceCardIndex = 0;

    if (lastMove.to.type === 'tableau') {
      const col = gameState.tableau[lastMove.to.index];
      const count = lastMove.cardIds.length;
      sourceCardIndex = Math.max(0, col.length - count);
      movingCards = col.slice(sourceCardIndex);
    } else if (lastMove.to.type === 'foundation') {
      const f = gameState.foundations[lastMove.to.index];
      sourceCardIndex = Math.max(0, f.length - 1);
      if (f.length > 0) {
        movingCards = [f[sourceCardIndex]];
      }
    } else if (lastMove.to.type === 'waste') {
      sourceCardIndex = Math.max(0, gameState.waste.length - 1);
      if (gameState.waste.length > 0) {
        movingCards = [gameState.waste[sourceCardIndex]];
      }
    }

    if (movingCards.length === 0) {
      playCardMoveSound();
      setGameState(nextState);
      return;
    }

    let destCardIndex = 0;
    if (lastMove.from.type === 'tableau') {
      destCardIndex = gameState.tableau[lastMove.from.index].length;
    } else if (lastMove.from.type === 'foundation') {
      destCardIndex = gameState.foundations[lastMove.from.index].length;
    } else if (lastMove.from.type === 'waste') {
      destCardIndex = gameState.waste.length;
    }

    const startPos = getPileCardPosition(lastMove.to, sourceCardIndex, gameState);
    const endPos = getPileCardPosition(lastMove.from, destCardIndex, gameState);

    isAnimatingRef.current = true;
    playCardMoveSound();
    setAnimatingCard({
      cards: movingCards,
      startX: startPos.x,
      startY: startPos.y,
      endX: endPos.x,
      endY: endPos.y,
      hiddenCardIds: lastMove.cardIds,
    });

    animProgress.setValue(0);
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setGameState(nextState);
      setAnimatingCard(null);
      isAnimatingRef.current = false;
    });
  }, [gameState, clearActiveHint, getPileBasePosition, getPileCardPosition]);

  const hiddenIds = animatingCard ? animatingCard.hiddenCardIds : dragState ? dragState.cardIds : EMPTY_CARD_IDS;

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        score={gameState.score}
        moves={gameState.moves}
        elapsedSeconds={gameState.elapsedSeconds}
        drawCount={gameState.drawCount}
        canUndo={gameState.history.length > 0}
        canHint={gameState.status === 'playing'}
        canGiveUp={gameState.status === 'playing' && gameState.moves > 0}
        soundEnabled={settings.soundEnabled !== false}
        isLandscape={isLandscape}
        onUndo={handleUndo}
        onHint={handleHint}
        onGiveUp={handleGiveUp}
        onNewGame={handleNewGame}
        onOpenStats={() => setStatsVisible(true)}
        onOpenSettings={() => setSettingsVisible(true)}
        onToggleDrawCount={handleToggleDrawCount}
        onToggleSound={handleToggleSound}
      />

      {hintMessage && (
        <View style={[styles.hintBanner, isLandscape && styles.hintBannerLandscape]}>
          <Text style={styles.hintText}>{hintMessage}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        scrollEnabled={!dragState && !isLandscape}
        contentContainerStyle={[
          styles.boardContent,
          isLandscape && styles.boardContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <View
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== measuredBoardWidth) {
              setMeasuredBoardWidth(w);
            }
          }}
          style={[
            styles.board,
            { maxWidth: maxBoardWidth },
            isLandscape && styles.boardLandscape,
            { gap: rowGap },
          ]}
        >
          {/* Top Row: Stock + Waste on Left (or Right if Right-Handed), 4 Foundations on Right (or Left if Right-Handed) */}
          <View
            key={`topRow_${isRightHanded ? 'rh' : 'lh'}`}
            onLayout={(e) => {
              topRowLayoutRef.current = {
                x: e.nativeEvent.layout.x,
                y: e.nativeEvent.layout.y,
              };
            }}
            style={[styles.topRow, { gap }, isRightHanded && styles.topRowRightHanded]}
          >
            <View>
              <StockWaste
                stock={gameState.stock}
                waste={gameState.waste}
                drawCount={gameState.drawCount}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                fanOffset={fanOffset}
                rightHanded={isRightHanded}
                onStockPress={handleStockPress}
                onWasteCardPress={handleWasteCardPress}
                selectedCardId={
                  selectedCards?.from.type === 'waste' ? selectedCards.cardIds[0] : null
                }
                hiddenCardIds={hiddenIds}
                isStockHintSource={activeHint?.type === 'draw' && activeHint.from.type === 'stock'}
                isStockHintTarget={activeHint?.type === 'recycle' && activeHint.to?.type === 'stock'}
                hintWasteCardId={
                  activeHint?.from.type === 'waste' ? activeHint.cardIds?.[0] ?? null : null
                }
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onStockLayout={handleStockLayout}
                onWasteLayout={handleWasteLayout}
              />
            </View>

            <View style={styles.spacer} />

            <View
              onLayout={(e) => {
                foundationsRowLayoutRef.current = {
                  x: e.nativeEvent.layout.x,
                  y: e.nativeEvent.layout.y,
                };
              }}
              style={[styles.foundationsRow, { gap }]}
            >
              {gameState.foundations.map((pile, idx) => (
                <View
                  key={`found_${idx}`}
                  onLayout={(e) => {
                    foundationLayoutsRef.current.set(idx, {
                      x: e.nativeEvent.layout.x,
                      y: e.nativeEvent.layout.y,
                    });
                  }}
                >
                  <FoundationPile
                    index={idx}
                    cards={pile}
                    width={cardWidth}
                    height={cardHeight}
                    onPress={foundationPressHandlers[idx]}
                    selectedCardId={
                      selectedCards?.from.type === 'foundation' && selectedCards.from.index === idx
                        ? selectedCards.cardIds[0]
                        : null
                    }
                    hiddenCardIds={hiddenIds}
                    isHintSource={activeHint?.from.type === 'foundation' && activeHint.from.index === idx}
                    isHintTarget={activeHint?.to?.type === 'foundation' && activeHint.to.index === idx}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Tableau Row: 7 Cascading Columns */}
          <View
            key={`tableauRow_${isRightHanded ? 'rh' : 'lh'}`}
            onLayout={(e) => {
              tableauRowLayoutRef.current = {
                x: e.nativeEvent.layout.x,
                y: e.nativeEvent.layout.y,
              };
            }}
            style={[
              styles.tableauRow,
              { gap },
              isLandscape && styles.tableauRowLandscape,
              isRightHanded && styles.tableauRowRightHanded,
            ]}
          >
            {gameState.tableau.map((col, idx) => {
              const isSelectedCol =
                selectedCards?.from.type === 'tableau' && selectedCards.from.index === idx;
              return (
                <View
                  key={`tab_${idx}`}
                  onLayout={(e) => {
                    tableauLayoutsRef.current.set(idx, {
                      x: e.nativeEvent.layout.x,
                      y: e.nativeEvent.layout.y,
                    });
                  }}
                >
                  <TableauColumn
                    columnIndex={idx}
                    cards={col}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    downOffset={downOffset}
                    upOffset={upOffset}
                    maxColumnHeight={maxColumnHeight}
                    selectedCardIds={isSelectedCol ? selectedCards.cardIds : EMPTY_CARD_IDS}
                    hiddenCardIds={hiddenIds}
                    hintSourceCardIds={
                      activeHint?.from.type === 'tableau' && activeHint.from.index === idx
                        ? activeHint.cardIds
                        : undefined
                    }
                    isHintTargetColumn={activeHint?.to?.type === 'tableau' && activeHint.to.index === idx}
                    onCardPress={handleTableauCardPress}
                    onEmptyColumnPress={handleEmptyColumnPress}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                  />
                </View>
              );
            })}
          </View>

          {/* Flying Animated Card Overlay */}
          {animatingCard && (
            <Animated.View
              style={[
                styles.floatingAnimatedContainer,
                {
                  left: animProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [animatingCard.startX, animatingCard.endX],
                  }),
                  top: animProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [animatingCard.startY, animatingCard.endY],
                  }),
                  transform: [
                    {
                      scale: animProgress.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.05, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {animatingCard.cards.map((c, i) => {
                const isHorizontal = animatingCard.direction === 'horizontal';
                const isReset = animatingCard.isReset === true;
                const animatedLeft = isHorizontal
                  ? animProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: isReset ? [i * fanOffset, 0] : [0, i * fanOffset],
                    })
                  : 0;
                const animatedTop = isHorizontal ? 0 : i * upOffset;

                return (
                  <Animated.View
                    key={c.id}
                    style={{
                      position: 'absolute',
                      top: animatedTop,
                      left: animatedLeft,
                      zIndex: i + 1,
                    }}
                  >
                    {isReset ? (
                      <Animated.View
                        style={{
                          width: cardWidth,
                          height: cardHeight,
                          transform: [
                            {
                              rotateY: animProgress.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: ['0deg', '90deg', '0deg'],
                              }),
                            },
                          ],
                        }}
                      >
                        <Animated.View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            opacity: animProgress.interpolate({
                              inputRange: [0, 0.49, 0.5, 1],
                              outputRange: [1, 1, 0, 0],
                            }),
                          }}
                        >
                          <CardView
                            card={c}
                            width={cardWidth}
                            height={cardHeight}
                            isDragging
                          />
                        </Animated.View>
                        <Animated.View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            opacity: animProgress.interpolate({
                              inputRange: [0, 0.5, 0.51, 1],
                              outputRange: [0, 0, 1, 1],
                            }),
                          }}
                        >
                          <CardView
                            card={{ ...c, faceUp: false }}
                            width={cardWidth}
                            height={cardHeight}
                            isDragging
                          />
                        </Animated.View>
                      </Animated.View>
                    ) : (
                      <CardView
                        card={c}
                        width={cardWidth}
                        height={cardHeight}
                        isDragging
                      />
                    )}
                  </Animated.View>
                );
              })}
            </Animated.View>
          )}

          {/* Floating Dragged Card Overlay */}
          {dragState && (
            <Animated.View
              style={[
                styles.floatingAnimatedContainer,
                {
                  left: Animated.add(dragState.startPos.x, dragPan.x),
                  top: Animated.add(dragState.startPos.y, dragPan.y),
                  zIndex: 10000,
                  transform: [{ scale: 1.05 }],
                },
              ]}
            >
              {dragState.cards.map((c, i) => (
                <View
                  key={c.id}
                  style={{
                    position: 'absolute',
                    top: i * upOffset,
                    left: 0,
                    zIndex: i + 1,
                  }}
                >
                  <CardView
                    card={c}
                    width={cardWidth}
                    height={cardHeight}
                    isDragging
                  />
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <StatsModal
        visible={statsVisible}
        stats={stats}
        onClose={() => setStatsVisible(false)}
      />

      <SettingsModal
        visible={settingsVisible}
        settings={settings}
        onClose={() => setSettingsVisible(false)}
        onChangeDrawCount={handleChangeDrawCount}
        onToggleSound={handleToggleSound}
        onToggleAutoMove={handleToggleAutoMove}
        onToggleRightHanded={handleToggleRightHanded}
      />

      <WinModal
        visible={gameState.status === 'won' && !winDismissed}
        score={gameState.score}
        moves={gameState.moves}
        elapsedSeconds={gameState.elapsedSeconds}
        onNewGame={() => startNewGame()}
        onClose={() => setWinDismissed(true)}
      />

      <GameOverModal
        visible={gameState.status === 'lost' && !gameOverDismissed}
        score={gameState.score}
        moves={gameState.moves}
        elapsedSeconds={gameState.elapsedSeconds}
        reason={lossReason}
        canUndo={gameState.history.length > 0}
        onUndo={handleUndo}
        onNewGame={() => startNewGame()}
        onClose={() => setGameOverDismissed(true)}
      />

      {confirmModal && (
        <ConfirmModal
          visible={confirmModal.visible}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </SafeAreaView>
  );
};
