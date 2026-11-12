import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getRewardsByCategory,
  RewardCategory,
  RewardItem,
  RewardsState,
} from '../engine/rewards';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  modalStyles,
  spacing,
} from '../theme';

export interface RewardsModalProps {
  visible: boolean;
  rewardsState: RewardsState;
  onClose: () => void;
  onRedeemReward: (rewardId: string) => void;
  onEquipReward: (rewardId: string) => void;
}

const CATEGORIES: Array<{ id: RewardCategory; label: string }> = [
  { id: 'felt', label: 'Felt' },
  { id: 'cardBack', label: 'Card Backs' },
  { id: 'cardFace', label: 'Card Faces' },
  { id: 'confetti', label: 'Confetti' },
];

export const RewardsModal: React.FC<RewardsModalProps> = ({
  visible,
  rewardsState,
  onClose,
  onRedeemReward,
  onEquipReward,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<RewardCategory>('felt');

  if (!visible) return null;

  const items = getRewardsByCategory(selectedCategory);

  const renderPreviewSwatch = (item: RewardItem) => {
    if (item.category === 'felt' && item.felt) {
      return (
        <View
          style={[
            styles.feltPreview,
            {
              backgroundColor: item.felt.background,
              borderColor: item.felt.accent,
            },
          ]}
        >
          <View
            style={[
              styles.feltPreviewInner,
              {
                backgroundColor: item.felt.surface,
                borderColor: item.felt.border,
              },
            ]}
          >
            <Text style={styles.previewIconText}>{item.previewIcon}</Text>
          </View>
        </View>
      );
    }

    if (item.category === 'cardBack' && item.cardBack) {
      return (
        <View
          style={[
            styles.cardPreview,
            {
              backgroundColor: item.cardBack.backBg,
              borderColor: item.cardBack.backBorder,
            },
          ]}
        >
          <View
            style={[
              styles.cardBackPreviewInner,
              {
                backgroundColor: item.cardBack.backInnerBg,
              },
            ]}
          >
            <View
              style={[
                styles.cardBackPreviewPattern,
                { backgroundColor: item.cardBack.backPatternBg },
              ]}
            >
              <Text
                style={[
                  styles.cardBackPreviewEmblem,
                  { color: item.cardBack.backEmblem },
                ]}
              >
                {item.cardBack.emblemSymbol}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (item.category === 'cardFace' && item.cardFace) {
      const face = item.cardFace;
      const spadeColor = face.suitColors?.spades ?? face.blackSuit;
      const heartColor = face.suitColors?.hearts ?? face.redSuit;
      const diamondColor = face.suitColors?.diamonds ?? face.redSuit;
      const clubColor = face.suitColors?.clubs ?? face.blackSuit;

      return (
        <View
          style={[
            styles.cardPreview,
            styles.cardFacePreview,
            {
              backgroundColor: face.frontBg,
              borderColor: face.border,
            },
          ]}
        >
          <View style={styles.suitPreviewGrid}>
            <Text style={[styles.suitPreviewSymbol, { color: spadeColor }]}>♠</Text>
            <Text style={[styles.suitPreviewSymbol, { color: heartColor }]}>♥</Text>
            <Text style={[styles.suitPreviewSymbol, { color: diamondColor }]}>♦</Text>
            <Text style={[styles.suitPreviewSymbol, { color: clubColor }]}>♣</Text>
          </View>
        </View>
      );
    }

    if (item.category === 'confetti' && item.confetti) {
      return (
        <View style={styles.confettiPreviewBox}>
          <View style={styles.confettiDotsGrid}>
            {item.confetti.colors.slice(0, 6).map((hex, i) => (
              <View
                key={`${item.id}_dot_${i}`}
                style={[styles.confettiDot, { backgroundColor: hex }]}
              />
            ))}
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.backdropMedium}>
        <Pressable
          style={modalStyles.backdropPressable}
          onPress={onClose}
          accessibilityLabel="Close rewards shop modal"
          accessibilityRole="button"
        />

        <View style={[modalStyles.cardBase, modalStyles.cardDark, styles.modalCard]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Rewards Shop</Text>
              <Text style={styles.subtitle}>Win games to earn points & unlock themes</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.closeIconBtn}
              accessibilityLabel="Close rewards shop"
              accessibilityRole="button"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Points Balance Banner */}
          <View style={styles.pointsBanner}>
            <View style={styles.pointsBalanceGroup}>
              <Text style={styles.pointsCoinIcon}>🪙</Text>
              <View>
                <Text style={styles.pointsBalanceValue}>{rewardsState.points}</Text>
                <Text style={styles.pointsBalanceLabel}>Available Points</Text>
              </View>
            </View>

            <View style={styles.pointsDivider} />

            <View style={styles.pointsStatItem}>
              <Text style={styles.pointsStatValue}>{rewardsState.unlockedIds.length}</Text>
              <Text style={styles.pointsStatLabel}>Unlocked</Text>
            </View>

            <View style={styles.pointsDivider} />

            <View style={styles.pointsStatItem}>
              <Text style={styles.pointsStatValue}>{rewardsState.lifetimePoints}</Text>
              <Text style={styles.pointsStatLabel}>Lifetime Pts</Text>
            </View>
          </View>

          {/* Category Tabs */}
          <View style={styles.tabsRow}>
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  accessibilityLabel={`${cat.label} category`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Rewards List */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => {
              const isUnlocked = rewardsState.unlockedIds.includes(item.id);
              const isEquipped = rewardsState.equipped[item.category] === item.id;
              const canAfford = rewardsState.points >= item.cost;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemRow,
                    isEquipped && styles.itemRowEquipped,
                  ]}
                >
                  {renderPreviewSwatch(item)}

                  <View style={styles.itemInfo}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemName}>{item.name}</Text>
                    </View>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>

                  <View style={styles.itemActionCol}>
                    {isEquipped ? (
                      <View
                        style={styles.equippedBadge}
                        accessibilityLabel={`${item.name} equipped`}
                      >
                        <Text style={styles.equippedBadgeText}>Equipped ✓</Text>
                      </View>
                    ) : isUnlocked ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => onEquipReward(item.id)}
                        style={styles.equipBtn}
                        accessibilityLabel={`Equip ${item.name}`}
                        accessibilityRole="button"
                      >
                        <Text style={styles.equipBtnText}>Equip</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={canAfford ? 0.8 : 1}
                        disabled={!canAfford}
                        onPress={() => onRedeemReward(item.id)}
                        style={[
                          styles.unlockBtn,
                          !canAfford && styles.unlockBtnDisabled,
                        ]}
                        accessibilityLabel={`Unlock ${item.name} for ${item.cost} points`}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.unlockBtnText,
                            !canAfford && styles.unlockBtnTextDisabled,
                          ]}
                        >
                          🪙 {item.cost}
                        </Text>
                        <Text
                          style={[
                            styles.unlockSubtext,
                            !canAfford && styles.unlockBtnTextDisabled,
                          ]}
                        >
                          {canAfford ? 'Unlock' : 'Locked'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer Done Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={styles.doneBtn}
            accessibilityLabel="Done"
            accessibilityRole="button"
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalCard: {
    maxWidth: 430,
    maxHeight: '90%',
    alignItems: 'stretch',
    padding: spacing.xl,
    borderRadius: borderRadius.modalLg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
  },
  subtitle: {
    color: colors.slate[400],
    fontSize: fontSize.subtext,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.slate[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: colors.slate[400],
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  pointsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.slate[700],
  },
  pointsBalanceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1.3,
  },
  pointsCoinIcon: {
    fontSize: fontSize.xl,
  },
  pointsBalanceValue: {
    color: colors.hint.sourceBorder,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
  },
  pointsBalanceLabel: {
    color: colors.slate[400],
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  pointsDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.slate[700],
    marginHorizontal: spacing.xs,
  },
  pointsStatItem: {
    alignItems: 'center',
    flex: 0.85,
  },
  pointsStatValue: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
  },
  pointsStatLabel: {
    color: colors.slate[400],
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: colors.slate[800],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.slate[700],
  },
  tabBtnActive: {
    backgroundColor: colors.felt.surface,
    borderColor: colors.action.successBorder,
  },
  tabBtnText: {
    color: colors.slate[400],
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.bold,
  },
  tabBtnTextActive: {
    color: colors.white,
  },
  listScroll: {
    maxHeight: 340,
    marginBottom: spacing.md,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.slate[700],
    gap: spacing.md,
  },
  itemRowEquipped: {
    borderColor: colors.action.successBorder,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  feltPreview: {
    width: 44,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feltPreviewInner: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewIconText: {
    fontSize: fontSize.md,
  },
  cardPreview: {
    width: 44,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackPreviewInner: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.xs,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackPreviewPattern: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackPreviewEmblem: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
  },
  cardFacePreview: {
    padding: 4,
  },
  suitPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  suitPreviewSymbol: {
    width: '45%',
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black,
  },
  confettiPreviewBox: {
    width: 44,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.slate[700],
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiDotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemName: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  itemDescription: {
    color: colors.slate[400],
    fontSize: fontSize.subtext,
    marginTop: 2,
    lineHeight: 16,
  },
  itemActionCol: {
    minWidth: 82,
    alignItems: 'flex-end',
  },
  equippedBadge: {
    backgroundColor: colors.felt.surface,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.action.successBorder,
  },
  equippedBadgeText: {
    color: colors.white,
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.bold,
  },
  equipBtn: {
    backgroundColor: colors.action.primary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 74,
    alignItems: 'center',
  },
  equipBtnText: {
    color: colors.white,
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.bold,
  },
  unlockBtn: {
    backgroundColor: colors.slate[700],
    borderWidth: 1,
    borderColor: colors.hint.sourceBorder,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 76,
    alignItems: 'center',
  },
  unlockBtnDisabled: {
    borderColor: colors.slate[600],
    opacity: 0.55,
  },
  unlockBtnText: {
    color: colors.white,
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.heavy,
  },
  unlockSubtext: {
    color: colors.hint.sourceBorder,
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  unlockBtnTextDisabled: {
    color: colors.slate[400],
  },
  doneBtn: {
    backgroundColor: colors.action.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
});
