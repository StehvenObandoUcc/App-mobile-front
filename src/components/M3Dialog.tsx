import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { DialogTitle } from './DialogTitle';
import { PrimaryButton, ButtonTone } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { colors, spacing, radii, elevations } from '../theme';

/**
 * M3Dialog — Organismos.dc.html (success · info · warning · error)
 * Tarjeta blanca radio 32 · icono en cuadrado pastel 52 · título 22/28 300 + 600 ·
 * mensaje 15/22 · botones a lo ancho. Misma API que antes (+ titleEmphasis y confirmTone opcionales).
 */
export interface M3DialogProps {
  visible: boolean;
  title: string;
  /** Parte del título en seminegrita; por defecto la última palabra. */
  titleEmphasis?: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  iconName?: keyof typeof Ionicons.glyphMap;
  confirmText?: string;
  onConfirm: () => void;
  /** Tono del botón principal: 'ink' (defecto) o 'danger' para confirmar algo destructivo. */
  confirmTone?: ButtonTone;
  cancelText?: string;
  onCancel?: () => void;
  /** Tocar fuera o «atrás»: por defecto onCancel (o onConfirm). Útil cuando «cancelar» es una acción real. */
  onDismiss?: () => void;
  /** 'row' (defecto): Cancelar | Confirmar. 'stacked': Confirmar a lo ancho y debajo un botón de texto (Compras/Escaneo). */
  actionsLayout?: 'row' | 'stacked';
  /** Icono 56 y título 26/32 (diálogos de éxito de Escaneo y Compras). */
  hero?: boolean;
  /** Contenido extra bajo el mensaje (p. ej. desglose «3 alimentos nuevos»). */
  children?: React.ReactNode;
}

const TYPES = {
  success: { bg: colors.functional.fresh.background, fg: colors.functional.fresh.text, icon: 'checkmark-circle-outline' },
  info: { bg: colors.tertiaryContainer, fg: colors.tertiary, icon: 'sparkles-outline' },
  warning: { bg: colors.functional.expiringSoon.background, fg: colors.functional.expiringSoon.text, icon: 'alert-circle-outline' },
  error: { bg: colors.error.background, fg: colors.error.text, icon: 'alert-circle-outline' },
} as const;

export function M3Dialog({
  visible,
  title,
  titleEmphasis,
  message,
  type = 'info',
  iconName,
  confirmText = 'Entendido',
  onConfirm,
  confirmTone = 'ink',
  cancelText,
  onCancel,
  onDismiss,
  actionsLayout = 'row',
  hero = false,
  children,
}: M3DialogProps) {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const t = TYPES[type] ?? TYPES.info;
  const hasCancel = Boolean(cancelText && onCancel);
  const dismiss = onDismiss || onCancel || onConfirm;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Cerrar diálogo" />
        <Animated.View
          style={[styles.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
          accessibilityViewIsModal
          accessibilityRole={type === 'error' || type === 'warning' ? 'alert' : undefined}
        >
          <View style={[styles.icon, hero && styles.iconHero, { backgroundColor: t.bg }]}>
            <Ionicons name={iconName ?? t.icon} size={26} color={t.fg} />
          </View>
          <DialogTitle title={title} emphasis={titleEmphasis} size={hero ? 26 : 22} lineHeight={hero ? 32 : 28} />
          {!!message && (
            <AppText variant="body" color={colors.textSecondary} style={styles.message}>
              {message}
            </AppText>
          )}
          {children}
          {actionsLayout === 'stacked' ? (
            <View style={styles.stacked}>
              <PrimaryButton title={confirmText} tone={confirmTone} onPress={onConfirm} />
              {hasCancel && (
                <Pressable
                  onPress={onCancel}
                  style={({ pressed }) => [styles.textBtn, pressed && styles.textBtnPressed]}
                  accessibilityRole="button"
                >
                  <AppText variant="body" weight="semibold" style={styles.textBtnLabel}>
                    {cancelText}
                  </AppText>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.actions}>
              {hasCancel && (
                <SecondaryButton title={cancelText!} variant="outline" onPress={onCancel!} style={styles.actionBtn} />
              )}
              <PrimaryButton title={confirmText} tone={confirmTone} onPress={onConfirm} style={styles.actionBtn} />
            </View>
          )}
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
    paddingHorizontal: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.containers,
    padding: spacing.xxl,
    gap: spacing.md,
    ...elevations.xl,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHero: {
    width: 56,
    height: 56,
  },
  stacked: {
    gap: 4,
    marginTop: 6,
  },
  textBtn: {
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBtnPressed: {
    backgroundColor: colors.surfaceVariant,
  },
  textBtnLabel: {
    fontSize: 15,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});
