import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { radii } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

/**
 * IngredientToggleChip — ingrediente a usar en el Chef IA (Chef-IA.dc.html).
 * 40 dp. Marcado: cacao + icono de familia + insignia «2 d» si vence pronto. Sin marcar: borde outline.
 */
export type IngredientToggleChipProps = {
  label: string;
  selected: boolean;
  onToggle: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Días que faltan (se muestra si está entre 0 y 3, o «venc.» si ya venció). */
  daysLeft?: number | null;
};

export function IngredientToggleChip({ label, selected, onToggle, iconName, daysLeft }: IngredientToggleChipProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const urgent = daysLeft !== null && daysLeft !== undefined && daysLeft <= 3;
  const expiredBadge = urgent && daysLeft! < 0;
  const badge = !urgent
    ? null
    : expiredBadge
      ? t('molecules.ingredientToggleChip.expiredShort')
      : daysLeft === 0
        ? t('molecules.ingredientToggleChip.todayShort')
        : t('molecules.ingredientToggleChip.daysShort', { count: daysLeft! });
  const badgeTone = daysLeft !== null && daysLeft !== undefined && daysLeft < 0 ? colors.functional.expired : colors.functional.expiringSoon;
  const dueA11y = !badge
    ? ''
    : expiredBadge
      ? t('molecules.ingredientToggleChip.expiredA11y')
      : daysLeft === 0
        ? t('molecules.ingredientToggleChip.dueTodayA11y')
        : t('molecules.ingredientToggleChip.dueA11y', { when: badge });

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.idle,
        { paddingLeft: selected && iconName ? 10 : 14 },
        pressed && styles.pressed,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}${dueA11y}`}
    >
      {selected && iconName && <Ionicons name={iconName} size={16} color={colors.onInk} />}
      <AppText variant="bodySmall" weight={selected ? 'semibold' : 'medium'} color={selected ? colors.onInk : colors.textPrimary} numberOfLines={1}>
        {label}
      </AppText>
      {badge && (
        <View style={[styles.badge, { backgroundColor: badgeTone.background }]}>
          <AppText variant="micro" color={badgeTone.text}>
            {badge}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  chip: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 14,
    borderRadius: radii.pill,
    maxWidth: '100%',
  },
  selected: {
    backgroundColor: colors.ink,
  },
  idle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  pressed: {
    opacity: 0.85,
  },
  badge: {
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
}));
