import React from 'react';
import { Pressable, StyleSheet, View, Insets } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, spacing, radii } from '../theme';
import { IngredientCategory, ExpirationStatus } from '../types';

/**
 * Chip — Componentes.dc.html
 * - filter: seleccionado = cacao + check (no depende solo del color); sin seleccionar = blanco + borde outline.
 * - category: pastel de la familia de despensa.
 * - status: pastel del estado de caducidad.
 * Visual 36 dp dentro de un objetivo táctil de 48 dp.
 */
export type ChipProps = {
  label?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** 'choice': opción única de un grupo (radio), seleccionado en cacao sin ✓ (unidades, atajos de fecha). */
  variant?: 'filter' | 'choice' | 'category' | 'status';
  category?: IngredientCategory;
  status?: ExpirationStatus;
  accessibilityLabel?: string;
  enableHitSlop?: boolean;
  hitSlop?: Insets | number;
};

const DEFAULT_STATUS_CONFIG: Record<ExpirationStatus, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  fresh: { label: 'Fresco', icon: 'checkmark-circle-outline' },
  expiringSoon: { label: 'Próximo a vencer', icon: 'time-outline' },
  expired: { label: 'Vencido', icon: 'alert-circle-outline' },
  unknown: { label: 'Sin fecha', icon: 'help-circle-outline' },
};

export function Chip({
  label,
  selected = false,
  disabled = false,
  onPress,
  icon,
  variant = 'filter',
  category,
  status,
  accessibilityLabel,
  enableHitSlop,
  hitSlop,
}: ChipProps) {
  let bg: string = colors.surface;
  let fg: string = colors.textPrimary;
  let border: string | undefined = colors.borderStrong;
  let weight: 'medium' | 'semibold' = 'medium';
  let resolvedLabel = label || '';
  let resolvedIcon = icon;

  // Selector de categoría (con onPress): sin elegir = avena; elegida = pastel de la familia + anillo cacao.
  const categorySelector = variant === 'category' && Boolean(onPress);
  if (categorySelector && !selected) {
    bg = colors.surfaceVariant;
    fg = colors.textPrimary;
    border = undefined;
  } else if (category && colors.categories[category]) {
    bg = colors.categories[category].background;
    fg = colors.categories[category].text;
    border = undefined;
    weight = 'semibold';
  } else if (status && colors.functional[status]) {
    const cfg = DEFAULT_STATUS_CONFIG[status] || DEFAULT_STATUS_CONFIG.unknown;
    bg = colors.functional[status].background;
    fg = colors.functional[status].text;
    border = undefined;
    weight = 'semibold';
    resolvedLabel = label || cfg.label;
    resolvedIcon = icon || cfg.icon;
  } else if ((variant === 'filter' || variant === 'choice') && selected) {
    bg = colors.ink;
    fg = colors.onInk;
    border = undefined;
    weight = 'semibold';
    if (variant === 'filter') resolvedIcon = 'checkmark';
  }

  if (disabled) {
    bg = colors.m3.surfaceContainer;
    fg = colors.textMuted;
    border = undefined;
  }

  const hasAction = Boolean(onPress);

  return (
    <Pressable
      onPress={onPress}
      disabled={!hasAction || disabled}
      hitSlop={enableHitSlop ? (hitSlop ?? 6) : undefined}
      accessibilityRole={!hasAction ? 'text' : variant === 'choice' || variant === 'category' ? 'radio' : 'button'}
      accessibilityLabel={accessibilityLabel || resolvedLabel}
      accessibilityState={{
        disabled: hasAction ? disabled : undefined,
        selected: hasAction && variant === 'filter' ? selected : undefined,
        checked: hasAction && (variant === 'choice' || categorySelector) ? selected : undefined,
      }}
      style={({ pressed }) => [styles.touchTarget, pressed && hasAction && !disabled && styles.pressed]}
    >
      <View
        style={[
          styles.visualChip,
          {
            backgroundColor: bg,
            paddingLeft: resolvedIcon ? 10 : 14,
          },
          border ? { borderWidth: 1, borderColor: border } : null,
          categorySelector && selected ? styles.ring : null,
        ]}
      >
        {resolvedIcon && <Ionicons name={resolvedIcon} size={16} color={fg} />}
        <AppText variant="bodySmall" weight={weight} color={fg} numberOfLines={1}>
          {resolvedLabel}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    minHeight: spacing.touchTargetMin,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualChip: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingRight: 14,
    borderRadius: radii.pill,
  },
  ring: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
