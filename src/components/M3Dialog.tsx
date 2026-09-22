import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { colors, typography, spacing, radii } from '../theme';

export interface M3DialogProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  iconName?: keyof typeof Ionicons.glyphMap;
  confirmText?: string;
  onConfirm: () => void;
  cancelText?: string;
  onCancel?: () => void;
}

export function M3Dialog({
  visible,
  title,
  message,
  type = 'info',
  iconName,
  confirmText = 'Entendido',
  onConfirm,
  cancelText,
  onCancel,
}: M3DialogProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const defaultIcons = {
    success: 'checkmark-circle' as const,
    info: 'information-circle' as const,
    warning: 'alert-circle' as const,
    error: 'close-circle' as const,
  };

  const typeStyles = {
    success: { bg: colors.functional.fresh.background, color: colors.functional.fresh.text },
    info: { bg: colors.primaryContainer, color: colors.primary },
    warning: { bg: colors.functional.expiringSoon.background, color: colors.functional.expiringSoon.text },
    error: { bg: colors.error.background, color: colors.error.text },
  };

  const selectedType = typeStyles[type] || typeStyles.info;
  const finalIcon = iconName || defaultIcons[type] || 'information-circle';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel || onConfirm}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel || onConfirm}
          accessibilityLabel="Cerrar diálogo"
        />
        <Animated.View
          style={[
            styles.dialogCard,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: selectedType.bg }]}>
            <Ionicons name={finalIcon} size={28} color={selectedType.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actionsRow}>
            {cancelText && onCancel && (
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <SecondaryButton
                  title={cancelText}
                  variant="outline"
                  onPress={onCancel}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title={confirmText}
                onPress={onConfirm}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.containers,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.circular,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: typography.sizes.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
  },
});
