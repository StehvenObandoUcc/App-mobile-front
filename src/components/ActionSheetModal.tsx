import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

/**
 * Componente unificado para menús contextuales y modales de confirmación (BUG-07, BUG-08).
 * Elimina la duplicación de modales y asegura coherencia visual con el Design System de Food AI.
 */
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
                    color={action.isDestructive ? '#DC2626' : '#10B981'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
    lineHeight: 20,
  },
  actionsList: {
    marginTop: 8,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  actionIcon: {
    marginRight: 2,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  destructiveLabel: {
    color: '#DC2626',
  },
  confirmationActions: {
    marginTop: 12,
    marginBottom: 8,
  },
  confirmBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDestructive: {
    backgroundColor: '#DC2626',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '600',
  },
});
