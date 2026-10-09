import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { generateRandomSeed, getDailyChallengeSeed, isDailyChallenge } from '../engine/deck';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  modalStyles,
  spacing,
} from '../theme';
import { shareGameDeck } from '../utils/share';

export interface SeedModalProps {
  visible: boolean;
  currentSeed?: string;
  drawCount: 1 | 3;
  onClose: () => void;
  onPlaySeed: (seed: string) => void;
  onShareSeed?: (seed: string) => void;
}

export const SeedModal: React.FC<SeedModalProps> = ({
  visible,
  currentSeed,
  drawCount,
  onClose,
  onPlaySeed,
  onShareSeed,
}) => {
  const [inputSeed, setInputSeed] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedTimeout, setCopiedTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  if (!visible) return null;

  const todaySeed = getDailyChallengeSeed();
  const isCurrentDaily = isDailyChallenge(currentSeed);

  const handleShareCurrent = async () => {
    if (!currentSeed) return;
    if (onShareSeed) {
      onShareSeed(currentSeed);
    } else {
      await shareGameDeck(currentSeed, drawCount);
    }

    if (copiedTimeout) clearTimeout(copiedTimeout);
    setCopied(true);
    const t = setTimeout(() => setCopied(false), 2500);
    setCopiedTimeout(t);
  };

  const handleRollRandom = () => {
    const randomSeed = generateRandomSeed();
    setInputSeed(randomSeed);
  };

  const handleStartGame = () => {
    const trimmed = inputSeed.trim();
    if (!trimmed) return;
    setInputSeed('');
    onPlaySeed(trimmed);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdropMedium}>
        <Pressable
          style={modalStyles.backdropPressable}
          onPress={onClose}
          accessibilityLabel="Close seed modal"
          accessibilityRole="button"
        />

        <View style={[modalStyles.cardBase, modalStyles.cardDark, styles.card]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Seeded Run</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.closeIconBtn}
              accessibilityLabel="Close seed modal"
              accessibilityRole="button"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Daily Challenge */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DAILY CHALLENGE</Text>
            <View style={styles.dailyRow}>
              <View style={styles.dailyInfo}>
                <Text style={styles.dailyTitle}>Today&apos;s Challenge</Text>
                <Text style={styles.dailySubtitle}>{todaySeed}</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  onPlaySeed(todaySeed);
                  onClose();
                }}
                style={[styles.dailyBtn, isCurrentDaily && styles.dailyBtnActive]}
                accessibilityLabel="Play today's daily challenge"
                accessibilityRole="button"
              >
                <Text style={styles.dailyBtnText}>
                  {isCurrentDaily ? 'Replay' : 'Play Today'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Current Game Seed */}
          {currentSeed ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {isCurrentDaily ? 'CURRENT DECK SEED (DAILY)' : 'CURRENT DECK SEED'}
              </Text>
              <View style={styles.seedDisplayRow}>
                <View style={styles.seedBadge}>
                  <Text style={styles.seedText} numberOfLines={1} ellipsizeMode="middle">
                    #{currentSeed}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleShareCurrent}
                  style={[styles.shareBtn, copied && styles.shareBtnCopied]}
                  accessibilityLabel="Share current seed"
                  accessibilityRole="button"
                >
                  <Text style={styles.shareBtnText}>
                    {copied ? 'Copied!' : 'Share'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Play Custom Seed */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PLAY CUSTOM SEED</Text>
            <Text style={styles.sectionDescription}>
              Enter any word, number, or code to deal an identical deterministic deck:
            </Text>

            <TextInput
              style={styles.input}
              value={inputSeed}
              onChangeText={setInputSeed}
              placeholder="e.g. lucky7, challenge, tournament"
              placeholderTextColor={colors.slate[500]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleStartGame}
              accessibilityLabel="Enter custom seed string"
            />

            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleRollRandom}
                style={styles.randomBtn}
                accessibilityLabel="Roll random seed"
                accessibilityRole="button"
              >
                <Text style={styles.randomBtnText}>Roll</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleStartGame}
                disabled={!inputSeed.trim()}
                style={[styles.playBtn, !inputSeed.trim() && styles.btnDisabled]}
                accessibilityLabel="Play seed"
                accessibilityRole="button"
              >
                <Text style={[styles.playBtnText, !inputSeed.trim() && styles.btnTextDisabled]}>
                  Deal Seed
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  card: {
    maxWidth: 380,
    alignItems: 'stretch',
    padding: spacing.xxl,
    borderRadius: borderRadius.modalLg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    width: '100%',
  },
  title: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
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
  section: {
    width: '100%',
  },
  sectionLabel: {
    color: colors.felt.accent,
    fontSize: fontSize.micro,
    fontWeight: fontWeight.heavy,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    color: colors.slate[400],
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  dailyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.slate[800],
    borderWidth: 1,
    borderColor: colors.felt.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dailyInfo: {
    flex: 1,
  },
  dailyTitle: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  dailySubtitle: {
    color: colors.felt.accent,
    fontSize: fontSize.subtext,
    fontFamily: 'monospace',
    marginTop: 2,
    fontWeight: fontWeight.semibold,
  },
  dailyBtn: {
    backgroundColor: colors.felt.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyBtnActive: {
    backgroundColor: colors.action.primary,
  },
  dailyBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  seedDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  seedBadge: {
    flex: 1,
    backgroundColor: colors.slate[800],
    borderWidth: 1,
    borderColor: colors.slate[700],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    justifyContent: 'center',
  },
  seedText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'monospace',
  },
  shareBtn: {
    backgroundColor: colors.action.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  shareBtnCopied: {
    backgroundColor: colors.action.success,
  },
  shareBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate[800],
    marginVertical: spacing.lg,
    width: '100%',
  },
  input: {
    backgroundColor: colors.slate[800],
    borderWidth: 1.5,
    borderColor: colors.slate[700],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.white,
    fontSize: fontSize.base,
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  randomBtn: {
    backgroundColor: colors.slate[800],
    borderWidth: 1,
    borderColor: colors.slate[600],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomBtnText: {
    color: colors.slate[300],
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  playBtn: {
    flex: 1,
    backgroundColor: colors.action.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnTextDisabled: {
    color: colors.slate[400],
  },
});
