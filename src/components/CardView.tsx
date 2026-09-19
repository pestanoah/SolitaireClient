import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, getCardColor, Rank, Suit } from '../engine/types';

interface CardViewProps {
  card: Card;
  width: number;
  height: number;
  isDragging?: boolean;
  isSelected?: boolean;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const RANK_LABELS: Record<Rank, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export const CardView: React.FC<CardViewProps> = React.memo(
  ({ card, width, height, isDragging, isSelected }) => {
    if (!card.faceUp) {
      return (
        <View
          style={[
            styles.cardBase,
            styles.cardBack,
            { width, height },
            isDragging && styles.dragging,
          ]}
        >
          <View style={styles.cardBackInner}>
            <View style={styles.cardBackPattern}>
              <Text style={styles.cardBackEmblem}>♦</Text>
            </View>
          </View>
        </View>
      );
    }

    const color = getCardColor(card.suit);
    const textColor = color === 'red' ? '#dc2626' : '#0f172a';
    const suitSymbol = SUIT_SYMBOLS[card.suit];
    const rankLabel = RANK_LABELS[card.rank];
    const fontSize = Math.max(12, Math.floor(width * 0.28));
    const smallSuitSize = Math.max(10, Math.floor(width * 0.24));
    const centerSymbolSize = Math.max(18, Math.floor(width * 0.44));

    return (
      <View
        style={[
          styles.cardBase,
          styles.cardFront,
          { width, height },
          isSelected && styles.selected,
          isDragging && styles.dragging,
        ]}
      >
        {/* Top-left corner */}
        <View style={styles.cornerTopLeft}>
          <Text style={[styles.rankText, { color: textColor, fontSize }]}>{rankLabel}</Text>
          <Text style={[styles.smallSuit, { color: textColor, fontSize: smallSuitSize }]}>
            {suitSymbol}
          </Text>
        </View>

        {/* Center motif */}
        <View style={styles.centerContainer}>
          <Text style={[styles.centerSymbol, { color: textColor, fontSize: centerSymbolSize }]}>
            {suitSymbol}
          </Text>
        </View>

        {/* Bottom-right corner (inverted) */}
        <View style={styles.cornerBottomRight}>
          <Text style={[styles.rankText, { color: textColor, fontSize }]}>{rankLabel}</Text>
          <Text style={[styles.smallSuit, { color: textColor, fontSize: smallSuitSize }]}>
            {suitSymbol}
          </Text>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#94a3b8',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
  },
  cardFront: {
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
    padding: 3,
  },
  cardBack: {
    backgroundColor: '#1e3a8a',
    borderColor: '#e2e8f0',
    padding: 3,
  },
  cardBackInner: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: '#172554',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackPattern: {
    width: '80%',
    height: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e40af',
  },
  cardBackEmblem: {
    color: '#93c5fd',
    fontSize: 14,
    opacity: 0.8,
  },
  cornerTopLeft: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    minWidth: 18,
  },
  cornerBottomRight: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    transform: [{ rotate: '180deg' }],
    minWidth: 18,
  },
  rankText: {
    fontWeight: '800',
    lineHeight: 14,
  },
  smallSuit: {
    lineHeight: 12,
  },
  centerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSymbol: {
    opacity: 0.9,
  },
  selected: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.6,
    shadowRadius: 5,
  },
  dragging: {
    opacity: 0.85,
    elevation: 8,
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
});
