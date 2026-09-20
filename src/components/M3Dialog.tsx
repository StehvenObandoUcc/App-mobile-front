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
    success: { bg: '#EAF4ED', color: '#28613C' },
    info: { bg: '#FBE9E2', color: '#B94E35' },
    warning: { bg: '#FFF2D7', color: '#8A5A00' },
    error: { bg: '#FBE5E3', color: '#A93632' },
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
              <View style={{ flex: 1, marginRight: 8 }}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EBDDD2',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#2B211D',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2B211D',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    color: '#66534A',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
  },
});
