import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { spacing, radii } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

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
  const { colors } = useTheme();
  const styles = useStyles();
  const { t, tp } = useI18n();
  const total = counts.fresh + counts.expiringSoon + counts.expired + counts.unknown;
  if (total === 0) return null;

  const segments: { key: keyof PantryHealthCounts; color: string; value: number }[] = [
    { key: 'fresh', color: colors.secondary, value: counts.fresh },
    { key: 'expiringSoon', color: colors.warning, value: counts.expiringSoon },
    { key: 'expired', color: colors.m3.error, value: counts.expired },
    { key: 'unknown', color: colors.borderStrong, value: counts.unknown },
  ];

  const a11yLabel = t('molecules.pantryHealthCard.a11y', {
    fresh: counts.fresh,
    expiringSoon: counts.expiringSoon,
    expiredText: tp('molecules.pantryHealthCard.expiredA11y', counts.expired),
    unknown: counts.unknown,
  });

  const counts4: { key: keyof PantryHealthCounts; label: string; fg: string }[] = [
    { key: 'fresh', label: t('molecules.pantryHealthCard.fresh'), fg: colors.functional.fresh.text },
    { key: 'expiringSoon', label: t('molecules.pantryHealthCard.expiringSoon'), fg: colors.functional.expiringSoon.text },
    { key: 'expired', label: tp('molecules.pantryHealthCard.expired', counts.expired), fg: colors.functional.expired.text },
    { key: 'unknown', label: t('molecules.pantryHealthCard.unknown'), fg: colors.functional.unknown.text },
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
          {t('molecules.pantryHealthCard.title')}
        </AppText>
        <AppText variant="metadata" weight="semibold" color={colors.primary}>
          {t('molecules.pantryHealthCard.seeExpiring')}
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

const useStyles = makeStyles((colors) => ({
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
}));
