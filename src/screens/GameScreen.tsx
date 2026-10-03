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
import { styles } from './GameScreen.styles';
import { CardView } from '../components/CardView';
import { ConfirmModal } from '../components/ConfirmModal';
import { FoundationPile } from '../components/FoundationPile';
import { GameHeader } from '../components/GameHeader';
import { GameOverModal } from '../components/GameOverModal';
import { StatsModal } from '../components/StatsModal';
import { StockWaste } from '../components/StockWaste';
import { TableauColumn } from '../components/TableauColumn';
import { WinModal } from '../components/WinModal';
import { dealKlondike } from '../engine/deck';
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
import { Card, FOUNDATION_SUITS, GameState, PileLocation, PlayerStats, UserSettings } from '../engine/types';
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

export const GameScreen: React.FC = () => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Settings & Stats
  const [settings, setSettings] = useState<UserSettings>({ drawCount: 1, autoMoveOnTap: true });
  const [stats, setStats] = useState<PlayerStats>({
    gamesPlayed: 0,
    gamesWon: 0,
    highScore: 0,
    bestTimeSeconds: null,
  });
  const [statsVisible, setStatsVisible] = useState(false);

  // Active Game State
  const [gameState, setGameState] = useState<GameState>(() => dealKlondike(1));
  const [selectedCards, setSelectedCards] = useState<{
    from: PileLocation;
    cardIds: string[];
  } | null>(null);
  const [lossReason, setLossReason] = useState<'no_moves' | 'forfeit'>('no_moves');
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

  // Toast / Hint for empty column
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHint = (msg: string) => {
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    setHintMessage(msg);
    hintTimeoutRef.current = setTimeout(() => {
      setHintMessage(null);
    }, 2400);
  };

  // Measured Board Layout Positions (Relative to styles.board)
  const topRowLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const tableauRowLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const foundationsRowLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const stockLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wasteLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const foundationLayoutsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const tableauLayoutsRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  // Calculate responsive dimensions
  const { maxBoardWidth, gap, cardWidth, cardHeight, downOffset, upOffset, fanOffset } =
    useMemo(() => {
      const maxBoardWidth = Math.min(windowWidth - 16, 760);
      const gap = Math.max(4, Math.floor(maxBoardWidth * 0.015));
      const cardWidth = Math.max(40, Math.floor((maxBoardWidth - gap * 6 - 16) / 7));
      const cardHeight = Math.floor(cardWidth * 1.4);

      const downOffset = Math.max(12, Math.floor(cardHeight * 0.16));
      const upOffset = Math.max(28, Math.floor(cardHeight * 0.32));
      const fanOffset = Math.max(14, Math.floor(cardWidth * 0.30));

      return {
        maxBoardWidth,
        gap,
        cardWidth,
        cardHeight,
        downOffset,
        upOffset,
        fanOffset,
      };
    }, [windowWidth]);

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

  // Calculate card screen position in board coordinates
  const getPileCardPosition = useCallback(
    (
      pile: PileLocation,
      cardIndexInPile: number,
      state: GameState
    ): { x: number; y: number } => {
      if (pile.type === 'stock') {
        return {
          x: stockLayoutRef.current.x,
          y: topRowLayoutRef.current.y + stockLayoutRef.current.y,
        };
      }

      if (pile.type === 'waste') {
        const effectiveCount = Math.max(
          1,
          cardIndexInPile !== undefined && cardIndexInPile >= 0 ? cardIndexInPile + 1 : state.waste.length
        );
        const visibleCount =
          state.drawCount === 3 ? Math.min(3, effectiveCount) : Math.min(1, effectiveCount);
        const hOffset = Math.max(0, visibleCount - 1) * fanOffset;
        return {
          x: wasteLayoutRef.current.x + hOffset,
          y: topRowLayoutRef.current.y + wasteLayoutRef.current.y,
        };
      }

      if (pile.type === 'foundation') {
        const fLayout = foundationLayoutsRef.current.get(pile.index) ?? { x: 0, y: 0 };
        return {
          x: foundationsRowLayoutRef.current.x + fLayout.x,
          y: topRowLayoutRef.current.y + foundationsRowLayoutRef.current.y + fLayout.y,
        };
      }

      // Tableau column
      const tLayout = tableauLayoutsRef.current.get(pile.index) ?? { x: 0, y: 0 };
      const col = state.tableau[pile.index] ?? [];
      let vertOffset = 0;
      const limit = Math.min(cardIndexInPile, col.length);
      for (let i = 0; i < limit; i++) {
        vertOffset += col[i].faceUp ? upOffset : downOffset;
      }

      return {
        x: tableauRowLayoutRef.current.x + tLayout.x,
        y: tableauRowLayoutRef.current.y + tLayout.y + vertOffset,
      };
    },
    [fanOffset, upOffset, downOffset]
  );

  // Animate and execute move
  const executeMoveWithAnimation = (
    from: PileLocation,
    to: PileLocation,
    cardIds: string[]
  ): boolean => {
    if (isAnimatingRef.current) return false;

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
      duration: 200,
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
          const fLayout = foundationLayoutsRef.current.get(f) ?? { x: 0, y: 0 };
          const fx = foundationsRowLayoutRef.current.x + fLayout.x;
          const fy = topRowLayoutRef.current.y + foundationsRowLayoutRef.current.y + fLayout.y;

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
        const tLayout = tableauLayoutsRef.current.get(t) ?? { x: 0, y: 0 };
        const tx = tableauRowLayoutRef.current.x + tLayout.x;
        const ty = tableauRowLayoutRef.current.y + tLayout.y;

        const col = gameState.tableau[t] ?? [];
        const colHeight = Math.max(cardHeight, (col.length - 1) * downOffset + cardHeight + 60);

        const inBounds =
          dropCenterX >= tx - gap &&
          dropCenterX <= tx + cardWidth + gap &&
          dropCenterY >= ty - 30 &&
          dropCenterY <= ty + colHeight + 80;

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
    [gameState, cardWidth, cardHeight, gap, downOffset]
  );

  // Drag-and-drop handlers
  const handleDragStart = useCallback(
    (from: PileLocation, card: Card, cardIndex: number) => {
      if (isAnimatingRef.current) return;
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
    [gameState, getPileCardPosition, dragPan]
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
    if (isAnimatingRef.current) return;
    setSelectedCards(null);

    if (gameState.stock.length === 0) {
      if (gameState.waste.length === 0) return;

      // Recycle waste to stock with animation
      const count = Math.min(gameState.drawCount === 3 ? 3 : 1, gameState.waste.length);
      const cardsToAnimate = gameState.waste.slice(-count);
      const allWasteIds = gameState.waste.map((c) => c.id);
      const nextState = drawCards(gameState);

      const startPos = {
        x: wasteLayoutRef.current.x,
        y: topRowLayoutRef.current.y + wasteLayoutRef.current.y,
      };
      const endPos = {
        x: stockLayoutRef.current.x,
        y: topRowLayoutRef.current.y + stockLayoutRef.current.y,
      };

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

    const startPos = {
      x: stockLayoutRef.current.x,
      y: topRowLayoutRef.current.y + stockLayoutRef.current.y,
    };
    const endPos = {
      x: wasteLayoutRef.current.x,
      y: topRowLayoutRef.current.y + wasteLayoutRef.current.y,
    };

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
  }, [gameState]);

  // Waste card press
  const handleWasteCardPress = useCallback(
    (card: Card) => {
      if (isAnimatingRef.current) return;

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
    [gameState, selectedCards, settings.autoMoveOnTap]
  );

  // Tableau card press
  const handleTableauCardPress = useCallback(
    (card: Card, colIndex: number) => {
      if (isAnimatingRef.current) return;

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
    [gameState, selectedCards, settings.autoMoveOnTap]
  );

  // Empty tableau column press (e.g. King target)
  const handleEmptyColumnPress = useCallback(
    (colIndex: number) => {
      if (isAnimatingRef.current) return;

      if (selectedCards) {
        const leadCardId = selectedCards.cardIds[0];
        // Check if lead card is a King
        let leadCard: Card | undefined;
        if (selectedCards.from.type === 'waste') {
          leadCard = gameState.waste[gameState.waste.length - 1];
        } else if (selectedCards.from.type === 'tableau') {
          const col = gameState.tableau[selectedCards.from.index];
          leadCard = col.find((c) => c.id === leadCardId);
        } else if (selectedCards.from.type === 'foundation') {
          const f = gameState.foundations[selectedCards.from.index];
          leadCard = f[f.length - 1];
        }

        if (leadCard && leadCard.rank !== 13) {
          showHint('In Klondike, only Kings can be placed on empty tableau spaces.');
          return;
        }

        const success = executeMoveWithAnimation(
          selectedCards.from,
          { type: 'tableau', index: colIndex },
          selectedCards.cardIds
        );
        if (success) {
          setSelectedCards(null);
        }
      }
    },
    [gameState, selectedCards]
  );

  // Foundation pile press
  const handleFoundationPress = useCallback(
    (fIndex: number) => {
      if (isAnimatingRef.current) return;

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
    [gameState, selectedCards, settings.autoMoveOnTap]
  );

  const handleFoundation0Press = useCallback(() => handleFoundationPress(0), [handleFoundationPress]);
  const handleFoundation1Press = useCallback(() => handleFoundationPress(1), [handleFoundationPress]);
  const handleFoundation2Press = useCallback(() => handleFoundationPress(2), [handleFoundationPress]);
  const handleFoundation3Press = useCallback(() => handleFoundationPress(3), [handleFoundationPress]);
  const foundationPressHandlers = useMemo(
    () => [handleFoundation0Press, handleFoundation1Press, handleFoundation2Press, handleFoundation3Press],
    [handleFoundation0Press, handleFoundation1Press, handleFoundation2Press, handleFoundation3Press]
  );

  // Auto-complete runner with animation
  useEffect(() => {
    const currentState = latestGameStateRef.current;
    if (currentState.status === 'playing' && canAutoComplete(currentState) && !isAnimatingRef.current) {
      const timer = setTimeout(() => {
        const activeState = latestGameStateRef.current;
        const next = autoCompleteStep(activeState);
        if (next && next.history.length > activeState.history.length) {
          const lastMove = next.history[next.history.length - 1];
          executeMoveWithAnimation(lastMove.from, lastMove.to, lastMove.cardIds);
        }
      }, 160);
      return () => clearTimeout(timer);
    }
  }, [gameState.id, gameState.history, gameState.status]);

  // Internal helper to deal a new game and reset animation/selection states
  const startNewGame = useCallback(
    (count?: 1 | 3) => {
      setSelectedCards(null);
      setAnimatingCard(null);
      isAnimatingRef.current = false;
      setLossReason('no_moves');
      playDealSound();
      const newGame = dealKlondike(count ?? settings.drawCount);
      setGameState(newGame);
    },
    [settings.drawCount]
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

  // Toggle Draw Mode (Turn 1 vs Turn 3)
  const handleToggleDrawCount = useCallback(() => {
    const nextCount = settings.drawCount === 1 ? 3 : 1;
    const nextSettings = { ...settings, drawCount: nextCount as 1 | 3 };

    const proceedWithToggle = async () => {
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
      startNewGame(nextCount as 1 | 3);
    };

    if (gameState.status === 'playing' && gameState.moves > 0) {
      setConfirmModal({
        visible: true,
        title: 'Change Draw Mode?',
        message: 'Changing draw mode will abandon the current game and record it as a loss.',
        confirmLabel: 'Change Mode',
        onConfirm: () => {
          setConfirmModal(null);
          proceedWithToggle();
        },
      });
      return;
    }

    proceedWithToggle();
  }, [settings, gameState.status, gameState.moves, gameState.id, gameState.score, gameState.elapsedSeconds, startNewGame]);

  // Toggle Sound Effects (Mute / Unmute)
  const handleToggleSound = useCallback(() => {
    const nextSound = settings.soundEnabled === false ? true : false;
    const nextSettings = { ...settings, soundEnabled: nextSound };
    setSettings(nextSettings);
    saveSettings(nextSettings);
    setSoundEnabled(nextSound);
    if (nextSound) {
      playCardMoveSound();
    }
  }, [settings]);

  // Undo move with animation
  const handleUndo = useCallback(() => {
    if (isAnimatingRef.current) return;
    if (gameState.history.length === 0) return;

    setSelectedCards(null);

    const lastMove = gameState.history[gameState.history.length - 1];
    const nextState = undo(gameState);

    // Case 1: Undo draw from stock to waste (return drawn cards to stock)
    if (lastMove.from.type === 'stock' && lastMove.to.type === 'waste') {
      const count = lastMove.cardIds.length;
      const cardsToAnimate = gameState.waste.slice(-count);
      const allUndoneWasteIds = cardsToAnimate.map((c) => c.id);

      const startPos = {
        x: wasteLayoutRef.current.x,
        y: topRowLayoutRef.current.y + wasteLayoutRef.current.y,
      };
      const endPos = {
        x: stockLayoutRef.current.x,
        y: topRowLayoutRef.current.y + stockLayoutRef.current.y,
      };

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

      const startPos = {
        x: stockLayoutRef.current.x,
        y: topRowLayoutRef.current.y + stockLayoutRef.current.y,
      };
      const endPos = {
        x: wasteLayoutRef.current.x,
        y: topRowLayoutRef.current.y + wasteLayoutRef.current.y,
      };

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
  }, [gameState]);

  // Check if selected card is King (for highlighting empty columns)
  const isSelectedKing = (() => {
    if (!selectedCards) return false;
    const leadId = selectedCards.cardIds[0];
    if (selectedCards.from.type === 'waste') {
      const c = gameState.waste[gameState.waste.length - 1];
      return c?.rank === 13;
    }
    if (selectedCards.from.type === 'tableau') {
      const col = gameState.tableau[selectedCards.from.index];
      const c = col.find((item) => item.id === leadId);
      return c?.rank === 13;
    }
    if (selectedCards.from.type === 'foundation') {
      const f = gameState.foundations[selectedCards.from.index];
      return f[f.length - 1]?.rank === 13;
    }
    return false;
  })();

  const hiddenIds = animatingCard ? animatingCard.hiddenCardIds : dragState ? dragState.cardIds : EMPTY_CARD_IDS;

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        score={gameState.score}
        moves={gameState.moves}
        elapsedSeconds={gameState.elapsedSeconds}
        drawCount={gameState.drawCount}
        canUndo={gameState.history.length > 0}
        canGiveUp={gameState.status === 'playing' && gameState.moves > 0}
        soundEnabled={settings.soundEnabled !== false}
        onUndo={handleUndo}
        onGiveUp={handleGiveUp}
        onNewGame={handleNewGame}
        onToggleDrawCount={handleToggleDrawCount}
        onToggleSound={handleToggleSound}
        onOpenStats={() => setStatsVisible(true)}
      />

      {hintMessage && (
        <View style={styles.hintBanner}>
          <Text style={styles.hintText}>{hintMessage}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.boardContent, { minHeight: windowHeight - 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.board, { maxWidth: maxBoardWidth }]}>
          {/* Top Row: Stock + Waste on Left, 4 Foundations on Right */}
          <View
            onLayout={(e) => {
              topRowLayoutRef.current = {
                x: e.nativeEvent.layout.x,
                y: e.nativeEvent.layout.y,
              };
            }}
            style={[styles.topRow, { gap }]}
          >
            <View
              onLayout={(e) => {
                stockLayoutRef.current = {
                  x: e.nativeEvent.layout.x,
                  y: e.nativeEvent.layout.y,
                };
                wasteLayoutRef.current = {
                  x: e.nativeEvent.layout.x + cardWidth + 10,
                  y: e.nativeEvent.layout.y,
                };
              }}
            >
              <StockWaste
                stock={gameState.stock}
                waste={gameState.waste}
                drawCount={gameState.drawCount}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                onStockPress={handleStockPress}
                onWasteCardPress={handleWasteCardPress}
                selectedCardId={
                  selectedCards?.from.type === 'waste' ? selectedCards.cardIds[0] : null
                }
                hiddenCardIds={hiddenIds}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
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
            onLayout={(e) => {
              tableauRowLayoutRef.current = {
                x: e.nativeEvent.layout.x,
                y: e.nativeEvent.layout.y,
              };
            }}
            style={[styles.tableauRow, { gap }]}
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
                  style={isSelectedKing && col.length === 0 ? styles.emptyColumnHighlight : null}
                >
                  <TableauColumn
                    columnIndex={idx}
                    cards={col}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    selectedCardIds={isSelectedCol ? selectedCards.cardIds : EMPTY_CARD_IDS}
                    hiddenCardIds={hiddenIds}
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

      <WinModal
        visible={gameState.status === 'won'}
        score={gameState.score}
        moves={gameState.moves}
        elapsedSeconds={gameState.elapsedSeconds}
        onNewGame={() => startNewGame()}
      />

      <GameOverModal
        visible={gameState.status === 'lost'}
        score={gameState.score}
        moves={gameState.moves}
        elapsedSeconds={gameState.elapsedSeconds}
        reason={lossReason}
        canUndo={gameState.history.length > 0}
        onUndo={handleUndo}
        onNewGame={() => startNewGame()}
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
