import React from 'react';
import { StyleSheet, ActivityIndicator, View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, spacing, radii } from '../theme';

/**
 * PrimaryButton — Componentes.dc.html
 * tone: 'ink' (cacao, acción principal · defecto) | 'brand' (tomate, escaneo) | 'ai' (frambuesa, Chef IA)
 *       | 'danger' (rojo, solo para confirmar acciones destructivas)
 * Píldora de 52 dp, plano (sin sombra de color). Presionado: tono más oscuro + escala 0.97.
 */
export type ButtonTone = 'ink' | 'brand' | 'ai' | 'danger';

export type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  tone?: ButtonTone;
  /** Ocupa todo el ancho disponible (por defecto se ajusta al contenedor, como antes). */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

const TONES: Record<ButtonTone, { bg: string; pressed: string; fg: string }> = {
  ink: { bg: colors.ink, pressed: colors.inkPressed, fg: colors.onInk },
  brand: { bg: colors.m3.primary, pressed: colors.m3.primaryPressed, fg: colors.m3.onPrimary },
  ai: { bg: colors.m3.tertiary, pressed: colors.m3.tertiaryPressed, fg: colors.m3.onTertiary },
  // Confirmaciones destructivas (Organismos.dc.html · M3Dialog «Eliminar»): blanco sobre #B3261E 6.54:1
  danger: { bg: colors.m3.error, pressed: colors.functional.expired.text, fg: colors.m3.onError },
};

export function PrimaryButton({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  iconName,
  tone = 'ink',
  style,
  accessibilityLabel,
  accessibilityHint,
}: PrimaryButtonProps) {
  const isDisabled = disabled || isLoading;
  const t = TONES[tone];
  const fg = disabled && !isLoading ? colors.textSecondary : t.fg;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: t.bg },
        pressed && !isDisabled && { backgroundColor: t.pressed, transform: [{ scale: 0.97 }] },
        disabled && !isLoading && styles.disabled,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={t.fg} size="small" />
      ) : (
        <View style={styles.content}>
          {iconName && <Ionicons name={iconName} size={20} color={fg} />}
          <AppText variant="body" weight="semibold" color={fg} align="center" style={styles.title} numberOfLines={2}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: spacing.buttonHeight,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexShrink: 1,
  },
  title: {
    flexShrink: 1,
  },
  disabled: {
    backgroundColor: colors.m3.surfaceContainerHigh,
  },
});
