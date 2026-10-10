import React from 'react';
import { StyleSheet, Pressable, View, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CountBadge } from './CountBadge';
import { spacing, radii } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/colors';

/**
 * IconButton (NUEVO) — Componentes.dc.html
 * 48 × 48 dp siempre (touchTargetMin). accessibilityLabel obligatorio.
 * variant: surface (blanco + filete) · ink (cacao) · tonal (durazno) · neutral (avena) · ghost (sin fondo)
 */
export type IconButtonVariant = 'surface' | 'white' | 'ink' | 'tonal' | 'neutral' | 'ghost';

export type IconButtonProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  iconSize?: number;
  /** Color del icono si no es el de la variante (p. ej. rojo para «Quitar»). */
  iconColor?: string;
  disabled?: boolean;
  /** Número opcional en esquina (p. ej. pendientes). */
  badgeCount?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const variantsFor = (colors: ThemeColors): Record<IconButtonVariant, { bg: string; pressed: string; fg: string; border?: string }> => ({
  surface: { bg: colors.surface, pressed: colors.m3.surfaceContainerLow, fg: colors.textPrimary, border: colors.border },
  // Blanco sin filete: botón «volver» de las pantallas (mockups: círculo blanco de 48 sin borde).
  white: { bg: colors.surface, pressed: colors.m3.surfaceContainerLow, fg: colors.textPrimary },
  ink: { bg: colors.ink, pressed: colors.inkPressed, fg: colors.onInk },
  tonal: { bg: colors.primaryContainer, pressed: colors.m3.inversePrimary, fg: colors.onPrimaryContainer },
  neutral: { bg: colors.m3.surfaceContainer, pressed: colors.m3.surfaceContainerHigh, fg: colors.textPrimary },
  ghost: { bg: 'transparent', pressed: colors.m3.surfaceContainer, fg: colors.textPrimary },
});

export function IconButton({
  iconName,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  iconSize = 22,
  iconColor,
  disabled = false,
  badgeCount,
  style,
  accessibilityHint,
}: IconButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const v = variantsFor(colors)[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg },
        v.border ? { borderWidth: 1, borderColor: v.border } : null,
        pressed && !disabled && { backgroundColor: v.pressed, transform: [{ scale: 0.94 }] },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={iconName} size={iconSize} color={disabled ? colors.textMuted : iconColor ?? v.fg} />
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={styles.badge} pointerEvents="none">
          <CountBadge count={badgeCount} />
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    borderRadius: spacing.touchTargetMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
  },
}));
