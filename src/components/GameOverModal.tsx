import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface GameOverModalProps {
  visible: boolean;
  score: number;
  moves: number;
  elapsedSeconds: number;
  reason?: 'no_moves' | 'forfeit';
  canUndo?: boolean;
  onUndo?: () => void;
  onNewGame: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  visible,
  score,
  moves,
  elapsedSeconds,
  reason = 'no_moves',
  canUndo = false,
  onUndo,
  onNewGame,
}) => {
  if (!visible) return null;

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.headerIcon}>💔</Text>
          <Text style={styles.title}>Game Over</Text>
          <Text style={styles.subtitle}>
            {reason === 'forfeit'
              ? 'You surrendered this game.'
              : 'No more legal moves available.'}
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{score}</Text>
              <Text style={styles.statLabel}>Final Score</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{moves}</Text>
              <Text style={styles.statLabel}>Moves</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{timeFormatted}</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            {canUndo && onUndo && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onUndo}
                style={[styles.actionBtn, styles.undoBtn]}
              >
                <Text style={styles.undoBtnText}>Undo Move</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onNewGame}
              style={[styles.actionBtn, styles.newGameBtn]}
            >
              <Text style={styles.newGameBtnText}>New Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    borderWidth: 2,
    borderColor: '#f43f5e',
    alignItems: 'center',
    shadowColor: '#f43f5e',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  headerIcon: {
    fontSize: 50,
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#fda4af',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  undoBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  undoBtnText: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '700',
  },
  newGameBtn: {
    backgroundColor: '#10b981',
  },
  newGameBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
