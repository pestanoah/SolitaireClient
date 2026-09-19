import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { CardView } from '../components/CardView';
import { FoundationPile } from '../components/FoundationPile';
import { GameHeader } from '../components/GameHeader';
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
import { canAutoComplete } from '../engine/rules';
import { Card, GameState, PileLocation, PlayerStats, UserSettings } from '../engine/types';
import {
  clearGameState,
  loadGameState,
  loadSettings,
  loadStats,
  recordGameEnd,
  saveGameState,
  saveSettings,
} from '../storage/storage';

interface AnimatingCardData {
  cards: Card[];
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  hiddenCardIds: string[];
}

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

  // Animation State
  const animProgress = useRef(new Animated.Value(0)).current;
  const [animatingCard, setAnimatingCard] = useState<AnimatingCardData | null>(null);
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
  const maxBoardWidth = Math.min(windowWidth - 16, 760);
  const gap = Math.max(4, Math.floor(maxBoardWidth * 0.015));
  const cardWidth = Math.max(40, Math.floor((maxBoardWidth - gap * 6 - 16) / 7));
  const cardHeight = Math.floor(cardWidth * 1.4);

  const downOffset = Math.max(12, Math.floor(cardHeight * 0.16));
  const upOffset = Math.max(22, Math.floor(cardHeight * 0.28));

  // Load initial saved game and stats
  useEffect(() => {
    (async () => {
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);

      const loadedStats = await loadStats();
      setStats(loadedStats);

      const savedGame = await loadGameState();
      if (savedGame) {
        setGameState(savedGame);
      } else {
        const newGame = dealKlondike(loadedSettings.drawCount);
        setGameState(newGame);
        saveGameState(newGame);
      }
    })();
  }, []);

  // Autosave game state
  useEffect(() => {
    if (gameState.status === 'won') {
      clearGameState();
    } else {
      saveGameState(gameState);
    }
  }, [gameState]);

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

  // Handle victory recording
  useEffect(() => {
    if (gameState.status === 'won') {
      (async () => {
        const updated = await recordGameEnd(true, gameState.score, gameState.elapsedSeconds);
        setStats(updated);
      })();
    }
  }, [gameState.status]);

  // Calculate card screen position in board coordinates
  const getPileCardPosition = (
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
      return {
        x: wasteLayoutRef.current.x,
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
  };

  // Animate and execute move
  const executeMoveWithAnimation = (
    from: PileLocation,
    to: PileLocation,
    cardIds: string[]
  ): boolean => {
    if (isAnimatingRef.current) return false;

    const nextState = moveCards(gameState, from, to, cardIds);
    if (!nextState) return false;

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

  // Stock press with draw animation
  const handleStockPress = useCallback(() => {
    if (isAnimatingRef.current) return;
    setSelectedCards(null);

    if (gameState.stock.length === 0) {
      // Recycle waste to stock
      setGameState((prev) => drawCards(prev));
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
    setAnimatingCard({
      cards: drawnCards,
      startX: startPos.x,
      startY: startPos.y,
      endX: endPos.x,
      endY: endPos.y,
      hiddenCardIds: drawnCards.map((c) => c.id),
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

      if (selectedCards) {
        const success = executeMoveWithAnimation(
          selectedCards.from,
          { type: 'foundation', index: fIndex },
          selectedCards.cardIds
        );
        if (success) {
          setSelectedCards(null);
        }
      }
    },
    [gameState, selectedCards]
  );

  // Auto-complete runner with animation
  useEffect(() => {
    if (gameState.status === 'playing' && canAutoComplete(gameState) && !isAnimatingRef.current) {
      const timer = setTimeout(() => {
        const next = autoCompleteStep(gameState);
        if (next && next.history.length > gameState.history.length) {
          const lastMove = next.history[next.history.length - 1];
          executeMoveWithAnimation(lastMove.from, lastMove.to, lastMove.cardIds);
        }
      }, 160);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Start new game
  const handleNewGame = useCallback(() => {
    setSelectedCards(null);
    setAnimatingCard(null);
    isAnimatingRef.current = false;
    const newGame = dealKlondike(settings.drawCount);
    setGameState(newGame);
    saveGameState(newGame);
  }, [settings.drawCount]);

  // Toggle Draw Mode (Turn 1 vs Turn 3)
  const handleToggleDrawCount = useCallback(() => {
    const nextCount = settings.drawCount === 1 ? 3 : 1;
    const nextSettings = { ...settings, drawCount: nextCount as 1 | 3 };
    setSettings(nextSettings);
    saveSettings(nextSettings);
    setSelectedCards(null);
    setAnimatingCard(null);
    isAnimatingRef.current = false;
    const newGame = dealKlondike(nextCount as 1 | 3);
    setGameState(newGame);
    saveGameState(newGame);
  }, [settings]);

  // Undo move
  const handleUndo = useCallback(() => {
    if (isAnimatingRef.current) return;
    setSelectedCards(null);
    setGameState((prev) => undo(prev));
  }, []);

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
    return false;
  })();

  const hiddenIds = animatingCard ? animatingCard.hiddenCardIds : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        score={gameState.score}
        moves={gameState.moves}
        elapsedSeconds={gameState.elapsedSeconds}
        drawCount={gameState.drawCount}
        canUndo={gameState.history.length > 0}
        onUndo={handleUndo}
        onNewGame={handleNewGame}
        onToggleDrawCount={handleToggleDrawCount}
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
                    onPress={() => handleFoundationPress(idx)}
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
                    selectedCardIds={isSelectedCol ? selectedCards.cardIds : []}
                    hiddenCardIds={hiddenIds}
                    onCardPress={handleTableauCardPress}
                    onEmptyColumnPress={handleEmptyColumnPress}
                  />
                </View>
              );
            })}
          </View>

          {/* Flying Animated Card Overlay */}
          {animatingCard && (
            <Animated.View
              pointerEvents="none"
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
              {animatingCard.cards.map((c, i) => (
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
        onNewGame={handleNewGame}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#064e3b',
  },
  hintBanner: {
    backgroundColor: '#0f766e',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#14b8a6',
  },
  hintText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  boardContent: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  board: {
    width: '100%',
    gap: 16,
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  spacer: {
    flex: 1,
    minWidth: 10,
  },
  foundationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableauRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: 40,
  },
  emptyColumnHighlight: {
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    borderStyle: 'dashed',
  },
  floatingAnimatedContainer: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});
