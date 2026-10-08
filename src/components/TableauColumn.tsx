import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, PileLocation } from '../engine/types';
import { CardView } from './CardView';
import { DraggableCard } from './DraggableCard';
import { colors, borderRadius, fontWeight } from '../theme';

export function calculateTableauOffsets(
  cards: Card[],
  cardHeight: number,
  upOffset: number,
  downOffset: number,
  maxColumnHeight?: number
): { offsets: number[]; columnHeight: number } {
  if (cards.length === 0) {
    return { offsets: [], columnHeight: cardHeight };
  }
  if (cards.length === 1) {
    return { offsets: [0], columnHeight: cardHeight };
  }

  let effectiveDown = downOffset;
  let effectiveUp = upOffset;

  if (maxColumnHeight && maxColumnHeight > cardHeight) {
    const availableCascade = maxColumnHeight - cardHeight;
    let normalCascade = 0;
    let downSteps = 0;
    let upSteps = 0;

    for (let i = 0; i < cards.length - 1; i++) {
      if (cards[i].faceUp) {
        upSteps++;
        normalCascade += upOffset;
      } else {
        downSteps++;
        normalCascade += downOffset;
      }
    }

    if (normalCascade > availableCascade && normalCascade > 0) {
      const compression = availableCascade / normalCascade;
      effectiveDown = Math.max(4, Math.floor(downOffset * compression));
      const remainingForUp = availableCascade - downSteps * effectiveDown;
      effectiveUp = upSteps > 0
        ? Math.max(9, Math.floor(remainingForUp / upSteps))
        : upOffset;
    }
  }

  const offsets: number[] = [];
  let currentTop = 0;
  for (let i = 0; i < cards.length; i++) {
    offsets.push(currentTop);
    if (i < cards.length - 1) {
      currentTop += cards[i].faceUp ? effectiveUp : effectiveDown;
    }
  }

  const columnHeight = currentTop + cardHeight;
  return { offsets, columnHeight };
}

interface TableauColumnProps {
  columnIndex: number;
  cards: Card[];
  cardWidth: number;
  cardHeight: number;
  downOffset?: number;
  upOffset?: number;
  maxColumnHeight?: number;
  selectedCardIds?: string[];
  hiddenCardIds?: string[];
  hintSourceCardIds?: string[];
  isHintTargetColumn?: boolean;
  onCardPress: (card: Card, colIndex: number) => void;
  onEmptyColumnPress?: (colIndex: number) => void;
  onDragStart?: (from: PileLocation, card: Card, cardIndex: number) => void;
  onDragMove?: (dx: number, dy: number) => void;
  onDragEnd?: (dx: number, dy: number, isDrag: boolean) => void;
}

const EMPTY_STRING_ARRAY: string[] = [];

export const TableauColumn: React.FC<TableauColumnProps> = React.memo(({
  columnIndex,
  cards,
  cardWidth,
  cardHeight,
  downOffset,
  upOffset,
  maxColumnHeight,
  selectedCardIds = EMPTY_STRING_ARRAY,
  hiddenCardIds = EMPTY_STRING_ARRAY,
  hintSourceCardIds = EMPTY_STRING_ARRAY,
  isHintTargetColumn = false,
  onCardPress,
  onEmptyColumnPress,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const fromLocation: PileLocation = useMemo(() => ({ type: 'tableau', index: columnIndex }), [columnIndex]);

  const { offsets, columnHeight } = useMemo(() => {
    const dOffset = downOffset ?? Math.max(8, Math.floor(cardHeight * 0.15));
    const uOffset = upOffset ?? Math.max(16, Math.floor(cardHeight * 0.28));
    return calculateTableauOffsets(cards, cardHeight, uOffset, dOffset, maxColumnHeight);
  }, [cards, cardHeight, downOffset, upOffset, maxColumnHeight]);

  const handleEmptyPress = useCallback(() => onEmptyColumnPress?.(columnIndex), [onEmptyColumnPress, columnIndex]);

  return (
    <View style={[styles.columnContainer, { width: cardWidth, minHeight: columnHeight }]}>
      {cards.length === 0 ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleEmptyPress}
          style={[
            styles.emptySlot,
            { width: cardWidth, height: cardHeight },
            isHintTargetColumn && styles.emptySlotHintTarget,
          ]}
        >
          <Text style={[styles.emptyK, { fontSize: Math.floor(cardWidth * 0.4) }]}>K</Text>
        </TouchableOpacity>
      ) : (
        cards.map((card, idx) => {
          const isSelected = selectedCardIds.includes(card.id);
          const isHidden = hiddenCardIds.includes(card.id);
          const isHintSource = hintSourceCardIds.includes(card.id);
          const isHintTarget = isHintTargetColumn && idx === cards.length - 1;
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
              {card.faceUp ? (
                <DraggableCard
                  card={card}
                  from={fromLocation}
                  cardIndex={idx}
                  onPress={() => onCardPress(card, columnIndex)}
                  onDragStart={onDragStart}
                  onDragMove={onDragMove}
                  onDragEnd={onDragEnd}
                >
                  <CardView
                    card={card}
                    width={cardWidth}
                    height={cardHeight}
                    isSelected={isSelected}
                    isHintSource={isHintSource}
                    isHintTarget={isHintTarget}
                  />
                </DraggableCard>
              ) : (
                <CardView
                  card={card}
                  width={cardWidth}
                  height={cardHeight}
                  isHintSource={isHintSource}
                  isHintTarget={isHintTarget}
                />
              )}
            </View>
          );
        })
      )}
    </View>
  );
});

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
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.overlay.whiteWatermark,
    backgroundColor: colors.overlay.slotSubtleBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyK: {
    color: colors.overlay.borderWhiteMedium,
    fontWeight: fontWeight.bold,
  },
  emptySlotHintTarget: {
    borderColor: colors.hint.targetBorder,
    borderWidth: 2,
    backgroundColor: colors.hint.targetBg,
  },
});
