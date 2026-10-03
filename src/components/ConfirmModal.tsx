import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, modalStyles, spacing, borderRadius, fontSize, fontWeight } from '../theme';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={modalStyles.backdropMedium}>
        <View style={[modalStyles.cardBase, modalStyles.cardDark]}>
          <Text style={modalStyles.titleMedium}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={modalStyles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onCancel}
              style={[modalStyles.actionBtn, styles.cancelBtn]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onConfirm}
              style={[
                modalStyles.actionBtn,
                isDestructive ? styles.destructiveBtn : styles.primaryBtn,
              ]}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  message: {
    color: colors.slate[400],
    fontSize: fontSize.body,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.section,
  },
  cancelBtn: {
    backgroundColor: colors.slate[700],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
  },
  cancelText: {
    color: colors.slate[200],
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  primaryBtn: {
    backgroundColor: colors.action.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
  },
  destructiveBtn: {
    backgroundColor: colors.action.destructive,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
  },
  confirmText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
});
