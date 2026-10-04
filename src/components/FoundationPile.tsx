import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, FOUNDATION_SUITS, PileLocation, Suit } from '../engine/types';
import { CardView } from './CardView';
import { DraggableCard } from './DraggableCard';
import { colors, borderRadius, fontWeight } from '../theme';

interface FoundationPileProps {
  index: number;
  cards: Card[];
  width: number;
  height: number;
  onPress?: () => void;
  selectedCardId?: string | null;
  hiddenCardIds?: string[];
  isHintSource?: boolean;
  isHintTarget?: boolean;
  onDragStart?: (from: PileLocation, card: Card, cardIndex: number) => void;
  onDragMove?: (dx: number, dy: number) => void;
  onDragEnd?: (dx: number, dy: number, isDrag: boolean) => void;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const FoundationPile: React.FC<FoundationPileProps> = React.memo(({
  index,
  cards,
  width,
  height,
  onPress,
  selectedCardId,
  hiddenCardIds = [],
  isHintSource = false,
  isHintTarget = false,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const previousCard = cards.length >= 2 ? cards[cards.length - 2] : null;
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const isSelected = topCard ? topCard.id === selectedCardId : false;
  const isHidden = topCard ? hiddenCardIds.includes(topCard.id) : false;
  const isPrevHidden = previousCard ? hiddenCardIds.includes(previousCard.id) : false;
  const suit = FOUNDATION_SUITS[index % 4];
  const isRed = suit === 'hearts' || suit === 'diamonds';

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Base empty slot watermark */}
      <Pressable
        onPress={topCard !== null ? undefined : onPress}
        disabled={topCard !== null}
        style={({ pressed }) => [
          styles.emptySlot,
          { width, height },
          pressed && topCard === null && { opacity: 0.8 },
          isHintTarget && styles.emptySlotHintTarget,
        ]}
      >
        <Text
          style={[
            styles.watermark,
            {
              color: isRed ? colors.overlay.redWatermark : colors.overlay.whiteWatermark,
              fontSize: Math.floor(width * 0.4),
            },
          ]}
        >
          {SUIT_SYMBOLS[suit]}
        </Text>
      </Pressable>

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
          <DraggableCard
            card={topCard}
            from={{ type: 'foundation', index }}
            cardIndex={cards.length - 1}
            onPress={onPress}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          >
            <CardView
              card={topCard}
              width={width}
              height={height}
              isSelected={isSelected}
              isHintSource={isHintSource}
              isHintTarget={isHintTarget}
            />
          </DraggableCard>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
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
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.overlay.borderWhiteStrong,
    backgroundColor: colors.overlay.slotBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotHintTarget: {
    borderColor: colors.hint.targetBorder,
    borderWidth: 2,
    backgroundColor: colors.hint.targetBg,
  },
  watermark: {
    fontWeight: fontWeight.light,
  },
});
