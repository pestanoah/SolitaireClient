import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, Suit } from '../engine/types';
import { CardView } from './CardView';

interface FoundationPileProps {
  index: number;
  cards: Card[];
  width: number;
  height: number;
  onPress?: () => void;
}

const WATERMARK_SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const FoundationPile: React.FC<FoundationPileProps> = ({
  index,
  cards,
  width,
  height,
  onPress,
}) => {
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const suit = WATERMARK_SUITS[index % 4];
  const isRed = suit === 'hearts' || suit === 'diamonds';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, { width, height }]}
    >
      {topCard ? (
        <CardView card={topCard} width={width} height={height} />
      ) : (
        <View style={[styles.emptySlot, { width, height }]}>
          <Text
            style={[
              styles.watermark,
              {
                color: isRed ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.25)',
                fontSize: Math.floor(width * 0.4),
              },
            ]}
          >
            {SUIT_SYMBOLS[suit]}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 6,
  },
  emptySlot: {
    borderRadius: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermark: {
    fontWeight: '300',
  },
});
