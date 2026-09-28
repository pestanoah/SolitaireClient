import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, FOUNDATION_SUITS, Suit } from '../engine/types';
import { CardView } from './CardView';

interface FoundationPileProps {
  index: number;
  cards: Card[];
  width: number;
  height: number;
  onPress?: () => void;
  selectedCardId?: string | null;
  hiddenCardIds?: string[];
}

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
  selectedCardId,
  hiddenCardIds = [],
}) => {
  const previousCard = cards.length >= 2 ? cards[cards.length - 2] : null;
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const isSelected = topCard ? topCard.id === selectedCardId : false;
  const isHidden = topCard ? hiddenCardIds.includes(topCard.id) : false;
  const isPrevHidden = previousCard ? hiddenCardIds.includes(previousCard.id) : false;
  const suit = FOUNDATION_SUITS[index % 4];
  const isRed = suit === 'hearts' || suit === 'diamonds';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, { width, height }]}
    >
      {/* Base empty slot watermark */}
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

      {/* Card immediately underneath top card (revealed while top card is animating away) */}
      {previousCard && (
        <View
          style={[
            styles.cardLayer,
            { width, height, opacity: isPrevHidden ? 0 : 1 },
          ]}
        >
          <CardView card={previousCard} width={width} height={height} />
        </View>
      )}

      {/* Top card */}
      {topCard && (
        <View
          style={[
            styles.cardLayer,
            { width, height, opacity: isHidden ? 0 : 1 },
          ]}
        >
          <CardView
            card={topCard}
            width={width}
            height={height}
            isSelected={isSelected}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 6,
    position: 'relative',
  },
  cardLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  emptySlot: {
    position: 'absolute',
    top: 0,
    left: 0,
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
