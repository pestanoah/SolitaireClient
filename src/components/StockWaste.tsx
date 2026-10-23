import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, PileLocation } from '../engine/types';
import { CardView } from './CardView';
import { DraggableCard } from './DraggableCard';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../theme';

interface StockWasteProps {
  stock: Card[];
  waste: Card[];
  drawCount: 1 | 3;
  visibleWasteCount?: number;
  cardWidth: number;
  cardHeight: number;
  onStockPress: () => void;
  onWasteCardPress: (card: Card) => void;
  selectedCardId?: string | null;
  hiddenCardIds?: string[];
  isStockHintSource?: boolean;
  isStockHintTarget?: boolean;
  hintWasteCardId?: string | null;
  rightHanded?: boolean;
  fanOffset?: number;
  onDragStart?: (from: PileLocation, card: Card, cardIndex: number) => void;
  onDragMove?: (dx: number, dy: number) => void;
  onDragEnd?: (dx: number, dy: number, isDrag: boolean) => void;
  onStockLayout?: (x: number, y: number) => void;
  onWasteLayout?: (x: number, y: number) => void;
  hideStockBadge?: boolean;
  isIdle?: boolean;
}

export const StockWaste: React.FC<StockWasteProps> = React.memo(({
  stock,
  waste,
  drawCount,
  visibleWasteCount: propVisibleWasteCount,
  cardWidth,
  cardHeight,
  rightHanded = false,
  fanOffset: propFanOffset,
  onStockPress,
  onWasteCardPress,
  selectedCardId,
  hiddenCardIds = [],
  hideStockBadge = false,
  isIdle = false,
  isStockHintSource = false,
  isStockHintTarget = false,
  hintWasteCardId = null,
  onDragStart,
  onDragMove,
  onDragEnd,
  onStockLayout,
  onWasteLayout,
}) => {
  const hasStock = stock.length > 0;
  const hasWaste = waste.length > 0;

  // Show up to visibleWasteCount cards fanned from waste (falling back to standard drawCount limit)
  const maxVisibleCount =
    propVisibleWasteCount !== undefined
      ? propVisibleWasteCount
      : drawCount === 3
      ? Math.min(3, waste.length)
      : Math.min(1, waste.length);
  const visibleWasteCount = Math.min(maxVisibleCount, waste.length);
  const visibleWaste = waste.slice(-visibleWasteCount);
  const fanOffset = propFanOffset ?? Math.max(10, Math.floor(cardWidth * 0.28));
  const underlyingCard =
    waste.length > visibleWasteCount ? waste[waste.length - 1 - visibleWasteCount] : null;
  const isUnderlyingHidden = underlyingCard ? hiddenCardIds.includes(underlyingCard.id) : false;

  return (
    <View style={[styles.container, rightHanded && styles.containerRightHanded]}>
      {/* Stock Pile */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onStockPress}
        onLayout={(e) => onStockLayout?.(e.nativeEvent.layout.x, e.nativeEvent.layout.y)}
        style={[
          styles.pile,
          { width: cardWidth, height: cardHeight },
          isStockHintSource && styles.stockHintSource,
        ]}
      >
        {hasStock ? (
          <View style={{ width: cardWidth, height: cardHeight }}>
            <CardView
              card={{ id: 'stock_back', suit: 'spades', rank: 1, faceUp: false }}
              width={cardWidth}
              height={cardHeight}
              isHintSource={isStockHintSource}
            />
            {!hideStockBadge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stock.length}</Text>
              </View>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.emptyStock,
              { width: cardWidth, height: cardHeight },
              isStockHintTarget && styles.emptyStockHintTarget,
            ]}
          >
            {isIdle ? (
              <View style={styles.idleStock}>
                <Text style={styles.idleStockIcon}>🂠</Text>
                <Text style={styles.idleStockText}>Deal</Text>
              </View>
            ) : (
              <>
                <Text style={styles.recycleIcon}>↺</Text>
                {hasWaste && <Text style={styles.recycleSubtext}>Reset</Text>}
              </>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Waste Pile */}
      <View
        onLayout={(e) => onWasteLayout?.(e.nativeEvent.layout.x, e.nativeEvent.layout.y)}
        style={[
          styles.wasteArea,
          {
            width: cardWidth + Math.max(0, visibleWasteCount - 1) * fanOffset,
            height: cardHeight,
          },
        ]}
      >
        <View style={[styles.emptyWaste, { width: cardWidth, height: cardHeight }]} />

        {underlyingCard && (
          <View
            style={[
              styles.fannedCard,
              {
                left: 0,
                zIndex: 0,
                opacity: isUnderlyingHidden ? 0 : 1,
              },
            ]}
          >
            <CardView card={underlyingCard} width={cardWidth} height={cardHeight} />
          </View>
        )}

        {hasWaste &&
          visibleWaste.map((card, idx) => {
            const isTop = idx === visibleWaste.length - 1;
            const isSelected = card.id === selectedCardId;
            const isHidden = hiddenCardIds.includes(card.id);
            const isHintSource = card.id === hintWasteCardId;
            return (
              <View
                key={card.id}
                style={[
                  styles.fannedCard,
                  {
                    left: idx * fanOffset,
                    zIndex: idx + 1,
                    opacity: isHidden ? 0 : 1,
                  },
                ]}
              >
                {isTop ? (
                  <DraggableCard
                    card={card}
                    from={{ type: 'waste', index: 0 }}
                    cardIndex={waste.length - 1}
                    onPress={() => onWasteCardPress(card)}
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
                    />
                  </DraggableCard>
                ) : (
                  <CardView
                    card={card}
                    width={cardWidth}
                    height={cardHeight}
                    isSelected={isSelected}
                    isHintSource={isHintSource}
                  />
                )}
              </View>
            );
          })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  containerRightHanded: {
    flexDirection: 'row-reverse',
  },
  pile: {
    borderRadius: borderRadius.md,
  },
  emptyStock: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.overlay.borderWhiteStrong,
    backgroundColor: colors.overlay.slotBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idleStock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleStockIcon: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 22,
  },
  idleStockText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: fontSize.caption,
    marginTop: spacing.xxs,
    fontWeight: fontWeight.bold,
  },
  recycleIcon: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 24,
    fontWeight: 'bold',
  },
  recycleSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: fontSize.caption,
    marginTop: spacing.xxs,
    fontWeight: fontWeight.semibold,
  },
  badge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: colors.slate[900],
    borderRadius: borderRadius.xl,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.card.backBorder,
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
  },
  wasteArea: {
    position: 'relative',
  },
  fannedCard: {
    position: 'absolute',
    top: 0,
  },
  emptyWaste: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.overlay.borderWhiteSubtle,
    backgroundColor: colors.overlay.slotFaintBg,
  },
  stockHintSource: {
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.hint.sourceBorder,
    ...shadows.cardHintSource,
  },
  emptyStockHintTarget: {
    borderColor: colors.hint.targetBorder,
    borderWidth: 2,
    backgroundColor: colors.hint.targetBg,
  },
});
