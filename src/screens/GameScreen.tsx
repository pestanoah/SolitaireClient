import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  PanResponderGestureState,
  Platform,
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

interface DropZone {
  type: 'foundation' | 'tableau';
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
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

  // Dragging state
  const [dragState, setDragState] = useState<{
    cards: Card[];
    from: PileLocation;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Registered drop zone hitboxes
  const dropZonesRef = useRef<Map<string, DropZone>>(new Map());
  const boardRef = useRef<View>(null);

  // Calculate responsive dimensions
  const maxBoardWidth = Math.min(windowWidth - 16, 760);
  const gap = Math.max(4, Math.floor(maxBoardWidth * 0.015));
  const cardWidth = Math.max(40, Math.floor((maxBoardWidth - gap * 6 - 16) / 7));
  const cardHeight = Math.floor(cardWidth * 1.4);

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
        // Standard rule: -2 points every 10 seconds (minimum 0)
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

  // Auto-complete runner
  useEffect(() => {
    if (gameState.status === 'playing' && canAutoComplete(gameState)) {
      const interval = setInterval(() => {
        setGameState((prev) => {
          const next = autoCompleteStep(prev);
          return next ?? prev;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  // Start new game
  const handleNewGame = useCallback(() => {
    setSelectedCards(null);
    setDragState(null);
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
    const newGame = dealKlondike(nextCount as 1 | 3);
    setGameState(newGame);
    saveGameState(newGame);
  }, [settings]);

  // Undo move
  const handleUndo = useCallback(() => {
    setSelectedCards(null);
    setGameState((prev) => undo(prev));
  }, []);

  // Stock press
  const handleStockPress = useCallback(() => {
    setSelectedCards(null);
    setGameState((prev) => drawCards(prev));
  }, []);

  // Waste card press (Tap-to-move or select)
  const handleWasteCardPress = useCallback(
    (card: Card) => {
      if (settings.autoMoveOnTap) {
        const smart = findSmartMove(gameState, card.id);
        if (smart) {
          const next = moveCards(gameState, smart.from, smart.to, smart.cardIds);
          if (next) {
            setGameState(next);
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
      // If we already have selected cards, check if clicking this card makes a valid target move
      if (selectedCards) {
        const next = moveCards(
          gameState,
          selectedCards.from,
          { type: 'tableau', index: colIndex },
          selectedCards.cardIds
        );
        if (next) {
          setGameState(next);
          setSelectedCards(null);
          return;
        }
      }

      // Tap-to-move smart placement
      if (settings.autoMoveOnTap) {
        const smart = findSmartMove(gameState, card.id);
        if (smart) {
          const next = moveCards(gameState, smart.from, smart.to, smart.cardIds);
          if (next) {
            setGameState(next);
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
      if (selectedCards) {
        const next = moveCards(
          gameState,
          selectedCards.from,
          { type: 'tableau', index: colIndex },
          selectedCards.cardIds
        );
        if (next) {
          setGameState(next);
          setSelectedCards(null);
        }
      }
    },
    [gameState, selectedCards]
  );

  // Foundation pile press
  const handleFoundationPress = useCallback(
    (fIndex: number) => {
      if (selectedCards) {
        const next = moveCards(
          gameState,
          selectedCards.from,
          { type: 'foundation', index: fIndex },
          selectedCards.cardIds
        );
        if (next) {
          setGameState(next);
          setSelectedCards(null);
        }
      }
    },
    [gameState, selectedCards]
  );

  // Hitbox registration for drop detection
  const registerDropZone = (key: string, zone: DropZone) => {
    dropZonesRef.current.set(key, zone);
  };

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

      <ScrollView
        contentContainerStyle={[styles.boardContent, { minHeight: windowHeight - 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <View ref={boardRef} style={[styles.board, { maxWidth: maxBoardWidth }]}>
          {/* Top Row: Stock + Waste on Left, 4 Foundations on Right */}
          <View style={[styles.topRow, { gap }]}>
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
            />

            <View style={styles.spacer} />

            <View style={[styles.foundationsRow, { gap }]}>
              {gameState.foundations.map((pile, idx) => (
                <View
                  key={`found_${idx}`}
                  onLayout={(e) => {
                    const { x, y, width, height } = e.nativeEvent.layout;
                    registerDropZone(`f_${idx}`, {
                      type: 'foundation',
                      index: idx,
                      x,
                      y,
                      width,
                      height,
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
          <View style={[styles.tableauRow, { gap }]}>
            {gameState.tableau.map((col, idx) => {
              const isSelectedCol = selectedCards?.from.type === 'tableau' && selectedCards.from.index === idx;
              return (
                <View
                  key={`tab_${idx}`}
                  onLayout={(e) => {
                    const { x, y, width, height } = e.nativeEvent.layout;
                    registerDropZone(`t_${idx}`, {
                      type: 'tableau',
                      index: idx,
                      x,
                      y,
                      width,
                      height: Math.max(height, cardHeight * 3),
                    });
                  }}
                >
                  <TableauColumn
                    columnIndex={idx}
                    cards={col}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    selectedCardIds={isSelectedCol ? selectedCards.cardIds : []}
                    onCardPress={handleTableauCardPress}
                    onEmptyColumnPress={handleEmptyColumnPress}
                  />
                </View>
              );
            })}
          </View>
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
  boardContent: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  board: {
    width: '100%',
    gap: 16,
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
});
