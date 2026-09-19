import React, { useEffect } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WinModalProps {
  visible: boolean;
  score: number;
  moves: number;
  elapsedSeconds: number;
  onNewGame: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({
  visible,
  score,
  moves,
  elapsedSeconds,
  onNewGame,
}) => {
  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      try {
        const confetti = require('canvas-confetti');
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Confetti fallback if canvas not available
      }
    }
  }, [visible]);

  if (!visible) return null;

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.celebrationIcon}>🎉</Text>
          <Text style={styles.title}>Victory!</Text>
          <Text style={styles.subtitle}>You completed the game!</Text>

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

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onNewGame}
            style={styles.playAgainBtn}
          >
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
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
    backgroundColor: '#064e3b',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    borderWidth: 2,
    borderColor: '#34d399',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  celebrationIcon: {
    fontSize: 54,
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#a7f3d0',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
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
    color: '#6ee7b7',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  playAgainBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  playAgainText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
