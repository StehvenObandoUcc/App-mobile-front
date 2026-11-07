import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { radii } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/colors';

/**
 * FeatureTile (NUEVO) — Componentes.dc.html / Inicio.dc.html
 * Ficha pastel con etiqueta arriba, icono a la derecha y cifra grande abajo.
 * Toda la ficha es el objetivo táctil. `size="lg"` ocupa dos filas (cifra 52) y admite `footer`.
 */
export type FeatureTileTone = 'fresh' | 'expiring' | 'brand' | 'ai';

const tonesFor = (colors: ThemeColors): Record<FeatureTileTone, { bg: string; fg: string }> => ({
  fresh: { bg: colors.functional.fresh.background, fg: colors.functional.fresh.text },
  expiring: { bg: colors.functional.expiringSoon.background, fg: colors.functional.expiringSoon.text },
  brand: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
  ai: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer },
});

export type FeatureTileProps = {
  label: string;
  value: number | string;
  tone: FeatureTileTone;
  /** Por defecto un chevron (señal de «abrir», no un segundo botón). Antes era una flecha girada 45°. */
  iconName?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  /** `inline`: cifra y etiqueta en una sola fila (ficha baja, para que quepa sobre la barra inferior). */
  size?: 'sm' | 'lg' | 'inline';
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
  const { colors } = useTheme();
  const styles = useStyles();
  const t = tonesFor(colors)[tone];
  const lg = size === 'lg';
  const inline = size === 'inline';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.tile,
        lg ? styles.tileLg : inline ? styles.tileInline : styles.tileSm,
        { backgroundColor: t.bg },
        pressed && styles.pressed,
      ]}
    >
      {inline && (
        <AppText weight="medium" color={t.fg} style={styles.valueInline}>
          {value}
        </AppText>
      )}
      <View style={inline ? styles.topInline : styles.top}>
        <AppText variant="body" weight="medium" color={t.fg} style={styles.label}>
          {label}
        </AppText>
        {lg ? (
          <View style={styles.iconCircle}>
            <Ionicons name={iconName ?? 'chevron-forward'} size={18} color={t.fg} />
          </View>
        ) : (
          <Ionicons name={iconName ?? 'chevron-forward'} size={18} color={t.fg} />
        )}
      </View>
      {!inline && (
        <View style={styles.bottom}>
          <AppText weight="medium" color={t.fg} style={lg ? styles.valueLg : styles.valueSm}>
            {value}
          </AppText>
          {lg && footer}
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
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
  tileInline: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  topInline: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  valueInline: {
    fontSize: 34,
    lineHeight: 38,
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
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
}));
