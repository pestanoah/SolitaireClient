import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getDailyChallengeSeed, isDailyChallenge } from '../engine/deck';
import { UserSettings } from '../engine/types';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  modalStyles,
  spacing,
} from '../theme';

export interface SettingsModalProps {
  visible: boolean;
  settings: UserSettings;
  currentSeed?: string;
  onClose: () => void;
  onChangeDrawCount: (drawCount: 1 | 3) => void;
  onToggleSound: (enabled: boolean) => void;
  onToggleAutoMove: (enabled: boolean) => void;
  onToggleRightHanded: (enabled: boolean) => void;
  onOpenSeedModal?: () => void;
  onPlayDailyChallenge?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  settings,
  currentSeed,
  onClose,
  onChangeDrawCount,
  onToggleSound,
  onToggleAutoMove,
  onToggleRightHanded,
  onOpenSeedModal,
  onPlayDailyChallenge,
}) => {
  const isSoundOn = settings.soundEnabled !== false;

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
          accessibilityLabel="Close settings modal"
          accessibilityRole="button"
        />
        <View style={[modalStyles.cardBase, modalStyles.cardDark, styles.card]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.closeIconBtn}
              accessibilityLabel="Close settings"
              accessibilityRole="button"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Settings Options */}
          <View style={styles.content}>
            {/* 1. Draw Mode */}
            <View style={styles.settingBlock}>
              <View style={styles.settingHeader}>
                <Text style={styles.settingTitle}>Draw Mode</Text>
                <Text style={styles.settingDescription}>
                  Cards flipped from the stock pile at a time
                </Text>
              </View>

              <View style={styles.segmentedContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onChangeDrawCount(1)}
                  style={[
                    styles.segmentBtn,
                    settings.drawCount === 1 && styles.segmentBtnActive,
                  ]}
                  accessibilityLabel="Draw 1 card"
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.segmentTitle,
                      settings.drawCount === 1 && styles.segmentTitleActive,
                    ]}
                  >
                    Draw 1
                  </Text>
                  <Text
                    style={[
                      styles.segmentSubtitle,
                      settings.drawCount === 1 && styles.segmentSubtitleActive,
                    ]}
                  >
                    Turn 1
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onChangeDrawCount(3)}
                  style={[
                    styles.segmentBtn,
                    settings.drawCount === 3 && styles.segmentBtnActive,
                  ]}
                  accessibilityLabel="Draw 3 cards"
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.segmentTitle,
                      settings.drawCount === 3 && styles.segmentTitleActive,
                    ]}
                  >
                    Draw 3
                  </Text>
                  <Text
                    style={[
                      styles.segmentSubtitle,
                      settings.drawCount === 3 && styles.segmentSubtitleActive,
                    ]}
                  >
                    Turn 3
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* 2. Sound Effects */}
            <View style={styles.settingRow}>
              <View style={styles.settingRowText}>
                <Text style={styles.settingTitle}>Sound Effects</Text>
                <Text style={styles.settingDescription}>
                  Audio feedback for card moves and deals
                </Text>
              </View>
              <Switch
                value={isSoundOn}
                onValueChange={onToggleSound}
                trackColor={{
                  false: colors.slate[700],
                  true: colors.action.success,
                }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.slate[700]}
                accessibilityLabel="Toggle sound effects"
              />
            </View>

            <View style={styles.divider} />

            {/* 3. Tap to Move */}
            <View style={styles.settingRow}>
              <View style={styles.settingRowText}>
                <Text style={styles.settingTitle}>Tap to Move</Text>
                <Text style={styles.settingDescription}>
                  Automatically send cards to best pile on tap
                </Text>
              </View>
              <Switch
                value={settings.autoMoveOnTap}
                onValueChange={onToggleAutoMove}
                trackColor={{
                  false: colors.slate[700],
                  true: colors.action.success,
                }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.slate[700]}
                accessibilityLabel="Toggle tap to move"
              />
            </View>

            <View style={styles.divider} />

            {/* 4. Right-Handed Mode */}
            <View style={styles.settingRow}>
              <View style={styles.settingRowText}>
                <Text style={styles.settingTitle}>Right-Handed Mode</Text>
                <Text style={styles.settingDescription}>
                  Invert board layout for easier right-hand reach
                </Text>
              </View>
              <Switch
                value={settings.rightHanded === true}
                onValueChange={onToggleRightHanded}
                trackColor={{
                  false: colors.slate[700],
                  true: colors.action.success,
                }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.slate[700]}
                accessibilityLabel="Toggle right-handed mode"
              />
            </View>

            {onOpenSeedModal && (
              <>
                <View style={styles.divider} />
                <View style={styles.settingBlock}>
                  <View style={styles.settingHeader}>
                    <Text style={styles.settingTitle}>Daily Challenge & Seeds</Text>
                    <Text style={styles.settingDescription}>
                      {isDailyChallenge(currentSeed)
                        ? `Playing Daily Challenge: #${currentSeed}`
                        : currentSeed
                        ? `Active deck seed: #${currentSeed}`
                        : `Today's seed: ${getDailyChallengeSeed()}`}
                    </Text>
                  </View>
                  <View style={styles.seedButtonsRow}>
                    {onPlayDailyChallenge && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          onClose();
                          onPlayDailyChallenge();
                        }}
                        style={styles.dailyChallengeBtn}
                        accessibilityLabel="Play today's daily challenge"
                        accessibilityRole="button"
                      >
                        <Text style={styles.dailyChallengeBtnText}>Daily Challenge</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        onClose();
                        onOpenSeedModal();
                      }}
                      style={[styles.seedModalBtn, onPlayDailyChallenge ? { flex: 1 } : null]}
                      accessibilityLabel="Manage seed and challenge"
                      accessibilityRole="button"
                    >
                      <Text style={styles.seedModalBtnText}>Custom Seed</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Done Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={styles.doneBtn}
            accessibilityLabel="Done"
            accessibilityRole="button"
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
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
    marginBottom: spacing.xxl,
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
  content: {
    width: '100%',
    marginBottom: spacing.xxxl,
  },
  settingBlock: {
    width: '100%',
  },
  settingHeader: {
    marginBottom: spacing.md,
  },
  settingTitle: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  settingDescription: {
    color: colors.slate[400],
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
  },
  segmentedContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  segmentBtn: {
    flex: 1,
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.slate[700],
  },
  segmentBtnActive: {
    backgroundColor: colors.felt.surface,
    borderColor: colors.action.successBorder,
  },
  segmentTitle: {
    color: colors.slate[300],
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  segmentTitleActive: {
    color: colors.white,
    fontWeight: fontWeight.heavy,
  },
  segmentSubtitle: {
    color: colors.slate[400],
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
  segmentSubtitleActive: {
    color: colors.felt.textMuted,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: spacing.md,
  },
  settingRowText: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate[800],
    marginVertical: spacing.lg,
    width: '100%',
  },
  doneBtn: {
    backgroundColor: colors.action.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    width: '100%',
    alignItems: 'center',
  },
  doneText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  seedModalBtn: {
    backgroundColor: colors.slate[800],
    borderWidth: 1,
    borderColor: colors.felt.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedModalBtnText: {
    color: colors.felt.accent,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  seedButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  dailyChallengeBtn: {
    flex: 1,
    backgroundColor: colors.felt.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyChallengeBtnText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
});
