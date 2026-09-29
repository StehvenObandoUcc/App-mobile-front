import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { DialogTitle } from './DialogTitle';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { M3Dialog } from './M3Dialog';
import { colors, spacing, radii, elevations } from '../theme';

/**
 * ActionSheetModal — Organismos.dc.html
 * Hoja inferior radio 32 con asa. Cabecera opcional con icono pastel (p. ej. el alimento).
 * - action_sheet: filas de 56 dp (icono 22 + texto 16); las destructivas van al final, en rojo,
 *   separadas por un filete.
 * - confirmation: se muestra como la tarjeta centrada de M3Dialog (icono de basura en rojo si es
 *   destructiva, título 300 + 600, descripción, «Cancelar» + confirmar en rojo o cacao).
 * Misma API que antes; `headerIconName`/`headerTone` son opcionales.
 */
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
  actions?: ActionSheetOption[];
  confirmText?: string;
  confirmDestructive?: boolean;
  onConfirm?: () => void;
  cancelText?: string;
  /** Icono pastel a la izquierda del título (filas de acciones de un alimento, etc.). */
  headerIconName?: keyof typeof Ionicons.glyphMap;
  headerTone?: { background: string; text: string };
  /** Parte del título en seminegrita en la confirmación («¿Eliminar **3 alimentos?**»). */
  titleEmphasis?: string;
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
  headerIconName,
  headerTone,
  titleEmphasis,
}: ActionSheetModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = React.useState(false);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
          Animated.timing(backdropOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setIsMounted(false));
    }
  }, [visible]);

  const normal = actions.filter((a) => !a.isDestructive);

  if (variant === 'confirmation') {
    return (
      <M3Dialog
        visible={visible}
        type={confirmDestructive ? 'error' : 'info'}
        iconName={confirmDestructive ? 'trash-outline' : undefined}
        title={title}
        titleEmphasis={titleEmphasis}
        message={description ?? ''}
        cancelText={cancelText}
        onCancel={onClose}
        confirmText={confirmText}
        confirmTone={confirmDestructive ? 'danger' : 'ink'}
        onConfirm={() => {
          onClose();
          onConfirm?.();
        }}
      />
    );
  }

  const destructive = actions.filter((a) => a.isDestructive);

  const renderRow = (action: ActionSheetOption, key: string) => {
    const fg = action.isDestructive ? colors.error.text : colors.textPrimary;
    return (
      <Pressable
        key={key}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => {
          onClose();
          action.onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={action.label}
      >
        <Ionicons name={action.icon} size={22} color={fg} />
        <AppText variant="body" weight={action.isDestructive ? 'semibold' : 'regular'} color={fg}>
          {action.label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <Modal visible={isMounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }], paddingBottom: Math.max(insets.bottom + 12, 24) }]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />

          {variant === 'action_sheet' ? (
            <>
              <View style={styles.header}>
                {headerIconName && (
                  <View style={[styles.headerIcon, { backgroundColor: headerTone?.background ?? colors.surfaceVariant }]}>
                    <Ionicons name={headerIconName} size={22} color={headerTone?.text ?? colors.textPrimary} />
                  </View>
                )}
                <View style={styles.headerTexts}>
                  <AppText variant="cardTitle" numberOfLines={2}>
                    {title}
                  </AppText>
                  {!!description && (
                    <AppText variant="metadata" color={colors.textSecondary} numberOfLines={2}>
                      {description}
                    </AppText>
                  )}
                </View>
              </View>
              {normal.map((a, i) => renderRow(a, `n${i}`))}
              {destructive.length > 0 && normal.length > 0 && <View style={styles.divider} />}
              {destructive.map((a, i) => renderRow(a, `d${i}`))}
            </>
          ) : (
            <View style={styles.confirm}>
              <DialogTitle title={title} />
              {!!description && (
                <AppText variant="body" color={colors.textSecondary} style={styles.description}>
                  {description}
                </AppText>
              )}
              <View style={styles.confirmActions}>
                <SecondaryButton title={cancelText} variant="outline" onPress={onClose} style={styles.confirmBtn} />
                <PrimaryButton
                  title={confirmText}
                  tone={confirmDestructive ? 'danger' : 'ink'}
                  onPress={() => {
                    onClose();
                    onConfirm?.();
                  }}
                  style={styles.confirmBtn}
                />
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.View>
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
    borderTopLeftRadius: radii.containers,
    borderTopRightRadius: radii.containers,
    paddingTop: 10,
    paddingHorizontal: spacing.lg,
    ...elevations.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.sm,
    paddingBottom: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.m3.surfaceContainer,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
    gap: 2,
  },
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.fields,
  },
  rowPressed: {
    backgroundColor: colors.surfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: colors.m3.surfaceContainer,
    marginVertical: 4,
  },
  confirm: {
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  confirmBtn: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});
