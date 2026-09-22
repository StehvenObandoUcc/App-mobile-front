import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../theme';

export interface ActionSheetOption {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isDestructive?: boolean;
}

export interface ActionSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: 'action_sheet' | 'confirmation';
  // Props para variante action_sheet
  actions?: ActionSheetOption[];
  // Props para variante confirmation
  confirmText?: string;
  confirmDestructive?: boolean;
  onConfirm?: () => void;
  cancelText?: string;
}

export function ActionSheetModal({
  visible,
  onClose,
  title,
  description,
  variant = 'action_sheet',
  actions = [],
  confirmText = 'Confirmar',
  confirmDestructive = false,
  onConfirm,
  cancelText = 'Cancelar',
}: ActionSheetModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Tirador visual de arrastre */}
          <View style={styles.handle} />

          {/* Cabecera */}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}

          {/* Contenido según variante */}
          {variant === 'action_sheet' ? (
            <View style={styles.actionsList}>
              {actions.map((action, idx) => (
                <Pressable
                  key={idx}
                  style={styles.actionRow}
                  onPress={() => {
                    onClose();
                    action.onPress();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <Ionicons
                    name={action.icon}
                    size={20}
                    color={action.isDestructive ? colors.error.text : colors.primary}
                    style={styles.actionIcon}
                  />
                  <Text
                    style={[
                      styles.actionLabel,
                      action.isDestructive && styles.destructiveLabel,
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.confirmationActions}>
              <Pressable
                style={[
                  styles.confirmBtn,
                  confirmDestructive && styles.confirmBtnDestructive,
                ]}
                onPress={() => {
                  onClose();
                  onConfirm?.();
                }}
                accessibilityRole="button"
                accessibilityLabel={confirmText}
              >
                <Text style={styles.confirmBtnText}>{confirmText}</Text>
              </Pressable>
            </View>
          )}

          {/* Botón Cancelar siempre presente */}
          <Pressable
            style={styles.cancelBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={cancelText}
          >
            <Text style={styles.cancelBtnText}>{cancelText}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.floatingNav,
    borderTopRightRadius: radii.floatingNav,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 36,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: typography.sizes.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
    lineHeight: 20,
  },
  actionsList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  actionIcon: {
    marginRight: 2,
  },
  actionLabel: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  destructiveLabel: {
    color: colors.error.text,
  },
  confirmationActions: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.circular,
    minHeight: 52,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDestructive: {
    backgroundColor: colors.error.text,
  },
  confirmBtnText: {
    color: colors.textInverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  cancelBtn: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.circular,
    minHeight: 52,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
});
