import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../engine/types';
import { CardView } from './CardView';

interface TableauColumnProps {
  columnIndex: number;
  cards: Card[];
  cardWidth: number;
  cardHeight: number;
  selectedCardIds?: string[];
  hiddenCardIds?: string[];
  onCardPress: (card: Card, colIndex: number) => void;
  onEmptyColumnPress?: (colIndex: number) => void;
}

export const TableauColumn: React.FC<TableauColumnProps> = ({
  columnIndex,
  cards,
  cardWidth,
  cardHeight,
  selectedCardIds = [],
  hiddenCardIds = [],
  onCardPress,
  onEmptyColumnPress,
}) => {
  const downOffset = Math.max(12, Math.floor(cardHeight * 0.16));
  const upOffset = Math.max(22, Math.floor(cardHeight * 0.28));

  // Compute vertical offset positions for each card
  const offsets: number[] = [];
  let currentTop = 0;
  for (let i = 0; i < cards.length; i++) {
    offsets.push(currentTop);
    currentTop += cards[i].faceUp ? upOffset : downOffset;
  }

  const columnHeight = cards.length === 0 ? cardHeight : currentTop - (cards[cards.length - 1].faceUp ? upOffset : downOffset) + cardHeight;

  return (
    <View style={[styles.columnContainer, { width: cardWidth, minHeight: columnHeight }]}>
      {cards.length === 0 ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onEmptyColumnPress && onEmptyColumnPress(columnIndex)}
          style={[styles.emptySlot, { width: cardWidth, height: cardHeight }]}
        >
          <Text style={[styles.emptyK, { fontSize: Math.floor(cardWidth * 0.4) }]}>K</Text>
        </TouchableOpacity>
      ) : (
        cards.map((card, idx) => {
          const isSelected = selectedCardIds.includes(card.id);
          const isHidden = hiddenCardIds.includes(card.id);
          const topPosition = offsets[idx];

          return (
            <View
              key={card.id}
              style={[
                styles.cardPosition,
                {
                  top: topPosition,
                  zIndex: idx + 1,
                  opacity: isHidden ? 0 : 1,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={card.faceUp ? 0.75 : 1}
                disabled={!card.faceUp}
                onPress={() => card.faceUp && onCardPress(card, columnIndex)}
              >
                <CardView
                  card={card}
                  width={cardWidth}
                  height={cardHeight}
                  isSelected={isSelected}
                />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  columnContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  cardPosition: {
    position: 'absolute',
    left: 0,
  },
  emptySlot: {
    borderRadius: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyK: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontWeight: '700',
  },
});
