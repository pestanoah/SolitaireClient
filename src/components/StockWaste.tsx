import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../engine/types';
import { CardView } from './CardView';

interface StockWasteProps {
  stock: Card[];
  waste: Card[];
  drawCount: 1 | 3;
  cardWidth: number;
  cardHeight: number;
  onStockPress: () => void;
  onWasteCardPress: (card: Card) => void;
  selectedCardId?: string | null;
}

export const StockWaste: React.FC<StockWasteProps> = ({
  stock,
  waste,
  drawCount,
  cardWidth,
  cardHeight,
  onStockPress,
  onWasteCardPress,
  selectedCardId,
}) => {
  const hasStock = stock.length > 0;
  const hasWaste = waste.length > 0;

  // In Turn 3 mode, show up to 3 fanned cards from waste
  const visibleWasteCount = drawCount === 3 ? Math.min(3, waste.length) : Math.min(1, waste.length);
  const visibleWaste = waste.slice(-visibleWasteCount);
  const fanOffset = Math.floor(cardWidth * 0.28);

  return (
    <View style={styles.container}>
      {/* Stock Pile */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onStockPress}
        style={[styles.pile, { width: cardWidth, height: cardHeight }]}
      >
        {hasStock ? (
          <View style={{ width: cardWidth, height: cardHeight }}>
            <CardView
              card={{ id: 'stock_back', suit: 'spades', rank: 1, faceUp: false }}
              width={cardWidth}
              height={cardHeight}
            />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stock.length}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.emptyStock, { width: cardWidth, height: cardHeight }]}>
            <Text style={styles.recycleIcon}>↺</Text>
            {hasWaste && <Text style={styles.recycleSubtext}>Reset</Text>}
          </View>
        )}
      </TouchableOpacity>

      {/* Waste Pile */}
      <View
        style={[
          styles.wasteArea,
          {
            width: cardWidth + (visibleWasteCount - 1) * fanOffset,
            height: cardHeight,
          },
        ]}
      >
        {hasWaste ? (
          visibleWaste.map((card, idx) => {
            const isTop = idx === visibleWaste.length - 1;
            const isSelected = card.id === selectedCardId;
            return (
              <View
                key={card.id}
                style={[
                  styles.fannedCard,
                  {
                    left: idx * fanOffset,
                    zIndex: idx + 1,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!isTop}
                  onPress={() => isTop && onWasteCardPress(card)}
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
        ) : (
          <View style={[styles.emptyWaste, { width: cardWidth, height: cardHeight }]} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pile: {
    borderRadius: 6,
  },
  emptyStock: {
    borderRadius: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recycleIcon: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 24,
    fontWeight: 'bold',
  },
  recycleSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  wasteArea: {
    position: 'relative',
  },
  fannedCard: {
    position: 'absolute',
    top: 0,
  },
  emptyWaste: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
});
