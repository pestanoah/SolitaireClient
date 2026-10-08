import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, getCardColor, Rank, Suit } from '../engine/types';
import { colors, borderRadius, fontSize, fontWeight, shadows } from '../theme';

interface CardViewProps {
  card: Card;
  width: number;
  height: number;
  isDragging?: boolean;
  isSelected?: boolean;
  isHintSource?: boolean;
  isHintTarget?: boolean;
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
  ({ card, width, height, isDragging, isSelected, isHintSource, isHintTarget }) => {
    if (!card.faceUp) {
      return (
        <View
          style={[
            styles.cardBase,
            styles.cardBack,
            { width, height },
            isHintSource && styles.hintSource,
            isHintTarget && styles.hintTarget,
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
    const textColor = color === 'red' ? colors.card.redSuit : colors.card.blackSuit;
    const suitSymbol = SUIT_SYMBOLS[card.suit];
    const rankLabel = RANK_LABELS[card.rank];
    const isTen = card.rank === 10;
    const rankScale = isTen ? 0.32 : 0.38;
    const rankFontSize = Math.max(isTen ? 12 : 13, Math.floor(width * rankScale));
    const smallSuitSize = Math.max(8, Math.floor(width * 0.20));
    const centerSymbolSize = Math.max(12, Math.floor(width * 0.36));
    const rankLineHeight = Math.round(rankFontSize * 1.05);
    const suitLineHeight = Math.round(smallSuitSize * 1.05);

    return (
      <View
        style={[
          styles.cardBase,
          styles.cardFront,
          { width, height },
          isSelected && styles.selected,
          isHintSource && styles.hintSource,
          isHintTarget && styles.hintTarget,
          isDragging && styles.dragging,
        ]}
      >
        {/* Top-left corner */}
        <View style={styles.cornerTopLeft}>
          <Text
            style={[
              styles.rankText,
              {
                color: textColor,
                fontSize: rankFontSize,
                lineHeight: rankLineHeight,
                letterSpacing: isTen ? -0.8 : 0,
              },
            ]}
          >
            {rankLabel}
          </Text>
          <Text
            style={[
              styles.smallSuit,
              { color: textColor, fontSize: smallSuitSize, lineHeight: suitLineHeight },
            ]}
          >
            {suitSymbol}
          </Text>
        </View>

        {/* Center motif (hidden on very short cards to prevent visual overlap) */}
        {height >= 55 && (
          <View style={styles.centerContainer}>
            <Text style={[styles.centerSymbol, { color: textColor, fontSize: centerSymbolSize }]}>
              {suitSymbol}
            </Text>
          </View>
        )}

        {/* Bottom-right corner (inverted) */}
        <View style={styles.cornerBottomRight}>
          <Text
            style={[
              styles.rankText,
              {
                color: textColor,
                fontSize: rankFontSize,
                lineHeight: rankLineHeight,
                letterSpacing: isTen ? -0.8 : 0,
              },
            ]}
          >
            {rankLabel}
          </Text>
          <Text
            style={[
              styles.smallSuit,
              { color: textColor, fontSize: smallSuitSize, lineHeight: suitLineHeight },
            ]}
          >
            {suitSymbol}
          </Text>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.card.border,
    touchAction: 'none',
    userSelect: 'none',
    ...shadows.card,
  } as any,
  cardFront: {
    backgroundColor: colors.card.frontBg,
    justifyContent: 'space-between',
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  cardBack: {
    backgroundColor: colors.card.backBg,
    borderColor: colors.card.backBorder,
    padding: 3,
  },
  cardBackInner: {
    flex: 1,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.overlay.borderWhiteHigh,
    backgroundColor: colors.card.backInnerBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackPattern: {
    width: '80%',
    height: '80%',
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteMedium,
    borderRadius: borderRadius.xs,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card.backPatternBg,
  },
  cardBackEmblem: {
    color: colors.card.backEmblem,
    fontSize: fontSize.body,
    opacity: 0.8,
  },
  cornerTopLeft: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 0,
  },
  cornerBottomRight: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    transform: [{ rotate: '180deg' }],
    gap: 0,
  },
  rankText: {
    fontWeight: fontWeight.black,
    textAlign: 'center',
  },
  smallSuit: {
    textAlign: 'center',
    fontWeight: fontWeight.bold,
  },
  centerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  centerSymbol: {
    opacity: 0.85,
  },
  selected: {
    borderColor: colors.card.selectedBorder,
    borderWidth: 2,
    ...shadows.cardSelected,
  },
  hintSource: {
    borderColor: colors.hint.sourceBorder,
    borderWidth: 2.5,
    ...shadows.cardHintSource,
  },
  hintTarget: {
    borderColor: colors.hint.targetBorder,
    borderWidth: 2.5,
    ...shadows.cardHintTarget,
  },
  dragging: {
    opacity: 0.85,
    ...shadows.cardDragging,
  },
});
