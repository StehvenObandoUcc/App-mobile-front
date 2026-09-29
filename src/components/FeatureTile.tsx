import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radii } from '../theme';

/**
 * FeatureTile (NUEVO) — Componentes.dc.html / Inicio.dc.html
 * Ficha pastel con etiqueta arriba, icono a la derecha y cifra grande abajo.
 * Toda la ficha es el objetivo táctil. `size="lg"` ocupa dos filas (cifra 52) y admite `footer`.
 */
export type FeatureTileTone = 'fresh' | 'expiring' | 'brand' | 'ai';

const TONES: Record<FeatureTileTone, { bg: string; fg: string }> = {
  fresh: { bg: colors.functional.fresh.background, fg: colors.functional.fresh.text },
  expiring: { bg: colors.functional.expiringSoon.background, fg: colors.functional.expiringSoon.text },
  brand: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
  ai: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer },
};

export type FeatureTileProps = {
  label: string;
  value: number | string;
  tone: FeatureTileTone;
  /** Por defecto la flecha diagonal ↗ del mockup (señal de «abrir», no un segundo botón). */
  iconName?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  size?: 'sm' | 'lg';
  /** Solo en `lg`: contenido bajo la cifra (barra de frescura, texto). */
  footer?: React.ReactNode;
};

export function FeatureTile({
  label,
  value,
  tone,
  iconName,
  onPress,
  accessibilityLabel,
  size = 'sm',
  footer,
}: FeatureTileProps) {
  const t = TONES[tone];
  const lg = size === 'lg';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.tile,
        lg ? styles.tileLg : styles.tileSm,
        { backgroundColor: t.bg },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <AppText variant="body" weight="medium" color={t.fg} style={styles.label}>
          {label}
        </AppText>
        {lg ? (
          <View style={styles.iconCircle}>
            <Ionicons name={iconName ?? 'arrow-forward'} size={18} color={t.fg} style={!iconName && styles.diagonal} />
          </View>
        ) : (
          <Ionicons name={iconName ?? 'arrow-forward'} size={18} color={t.fg} style={!iconName && styles.diagonal} />
        )}
      </View>
      <View style={styles.bottom}>
        <AppText weight="medium" color={t.fg} style={lg ? styles.valueLg : styles.valueSm}>
          {value}
        </AppText>
        {lg && footer}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radii.tiles,
    justifyContent: 'space-between',
  },
  tileLg: {
    flex: 1,
    minHeight: 244,
    padding: 18,
  },
  tileSm: {
    minHeight: 116,
    padding: 16,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  label: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  // Ionicons no trae ↗: se gira la flecha →  45° hacia arriba.
  diagonal: {
    transform: [{ rotate: '-45deg' }],
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.circular,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    gap: 10,
  },
  valueLg: {
    fontSize: 52,
    lineHeight: 56,
  },
  valueSm: {
    fontSize: 40,
    lineHeight: 44,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
