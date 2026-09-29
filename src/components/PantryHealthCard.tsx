import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radii } from '../theme';

import { AppText } from './AppText';
export type PantryHealthCounts = {
  fresh: number;
  expiringSoon: number;
  expired: number;
  unknown: number;
};

export type PantryHealthCardProps = {
  counts: PantryHealthCounts;
  onPress?: () => void;
};

/**
 * «Salud de tu despensa» — resumen visual de getExpirationStatus() sobre todo el inventario.
 * Barra segmentada proporcional a cada estado + conteos. Toca la tarjeta para ver "Por vencer".
 * Fuente: Despensa.dc.html (Etapa 2, aprobado).
 */
export function PantryHealthCard({ counts, onPress }: PantryHealthCardProps) {
  const total = counts.fresh + counts.expiringSoon + counts.expired + counts.unknown;
  if (total === 0) return null;

  const segments: { key: keyof PantryHealthCounts; color: string; value: number }[] = [
    { key: 'fresh', color: colors.difficulty.easy.segment, value: counts.fresh },
    { key: 'expiringSoon', color: colors.difficulty.medium.segment, value: counts.expiringSoon },
    { key: 'expired', color: colors.difficulty.hard.segment, value: counts.expired },
    { key: 'unknown', color: colors.borderStrong, value: counts.unknown },
  ];

  const a11yLabel = `Estado de la despensa: ${counts.fresh} frescos, ${counts.expiringSoon} por vencer, ${counts.expired} vencidos, ${counts.unknown} sin fecha. Ver por vencer`;

  const counts4: { key: keyof PantryHealthCounts; label: string; fg: string }[] = [
    { key: 'fresh', label: 'frescos', fg: colors.functional.fresh.text },
    { key: 'expiringSoon', label: 'por vencer', fg: colors.functional.expiringSoon.text },
    { key: 'expired', label: counts.expired === 1 ? 'vencido' : 'vencidos', fg: colors.functional.expired.text },
    { key: 'unknown', label: 'sin fecha', fg: colors.functional.unknown.text },
  ];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.headerRow}>
        <AppText variant="body" weight="semibold" style={styles.title}>
          Salud de tu despensa
        </AppText>
        <AppText variant="metadata" weight="semibold" color={colors.primary}>
          Ver por vencer
        </AppText>
      </View>

      <View style={styles.barRow}>
        {segments.map((seg) =>
          seg.value > 0 ? (
            <View key={seg.key} style={[styles.barSegment, { flexGrow: seg.value, backgroundColor: seg.color }]} />
          ) : null
        )}
      </View>

      <View style={styles.countsRow}>
        {counts4.map((c) => (
          <AppText key={c.key} variant="metadata" color={colors.textSecondary}>
            <AppText weight="bold" color={c.fg}>
              {counts[c.key]}
            </AppText>
            {` ${c.label}`}
          </AppText>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    padding: spacing.lg,
    gap: spacing.sm + 2,
  },
  title: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.9,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  barRow: {
    flexDirection: 'row',
    gap: 3,
  },
  barSegment: {
    height: 10,
    borderRadius: 5,
    minWidth: 4,
  },
  countsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
