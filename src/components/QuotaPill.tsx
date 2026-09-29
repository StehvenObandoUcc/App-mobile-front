import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, radii } from '../theme';

/**
 * QuotaPill — píldora de cuota de fotos de prueba (Escaneo / Escaneo-Estados).
 * tone: 'camera' (cacao sobre la cámara) · 'light' (avena, pantallas blancas) · 'warning' (límite, ámbar).
 * Sin `used`/`max` es solo una etiqueta (p. ej. «Este intento no cuenta como foto de prueba»).
 */
export type QuotaPillProps = {
  label: string;
  used?: number;
  max?: number;
  tone?: 'camera' | 'light' | 'warning';
  accessibilityLabel?: string;
};

const TONES = {
  camera: { bg: colors.ink, fg: colors.onInk, on: colors.accent, off: colors.quotaDotIdle, height: 40, weight: 'medium' as const, size: 14 },
  light: { bg: colors.m3.surfaceContainerLow, fg: colors.textPrimary, on: colors.accent, off: colors.m3.outlineVariant, height: 36, weight: 'semibold' as const, size: 13 },
  warning: {
    bg: colors.functional.expiringSoon.background,
    fg: colors.functional.expiringSoon.text,
    on: colors.difficulty.medium.segment,
    off: colors.difficulty.medium.segment,
    height: 36,
    weight: 'semibold' as const,
    size: 13,
  },
};

export function QuotaPill({ label, used, max, tone = 'camera', accessibilityLabel }: QuotaPillProps) {
  const t = TONES[tone];
  const showDots = used !== undefined && max !== undefined;
  return (
    <View
      style={[styles.pill, { backgroundColor: t.bg, height: t.height, paddingLeft: showDots ? 10 : 14 }]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {showDots && (
        <View style={styles.dots}>
          {Array.from({ length: max }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i < used ? t.on : t.off }]} />
          ))}
        </View>
      )}
      <AppText weight={t.weight} color={t.fg} style={{ fontSize: t.size, lineHeight: t.size + 4 }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 14,
    borderRadius: radii.pill,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
