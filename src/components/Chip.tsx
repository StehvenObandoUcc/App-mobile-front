import React from 'react';
import { Pressable, Text, StyleSheet, View, Insets } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../theme';
import { IngredientCategory, ExpirationStatus } from '../types';

export type ChipProps = {
  label?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'filter' | 'category' | 'status';
  category?: IngredientCategory;
  status?: ExpirationStatus;
  accessibilityLabel?: string;
  enableHitSlop?: boolean;
  hitSlop?: Insets | number;
};

const DEFAULT_STATUS_CONFIG: Record<
  ExpirationStatus,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
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
  // Resolución semántica 100% interna vía tokens
  let bg: string = colors.surface;
  let text: string = colors.textSecondary;
  let border: string = colors.border;
  let resolvedLabel: string = label || '';
  let resolvedIcon = icon;

  if (category && colors.categories[category]) {
    bg = colors.categories[category].background;
    text = colors.categories[category].text;
    border = 'transparent';
  } else if (status && colors.functional[status]) {
    bg = colors.functional[status].background;
    text = colors.functional[status].text;
    border = colors.functional[status].border;
    const statusCfg = DEFAULT_STATUS_CONFIG[status] || DEFAULT_STATUS_CONFIG.unknown;
    resolvedLabel = label || statusCfg.label;
    resolvedIcon = icon || statusCfg.icon;
  } else if (variant === 'filter') {
    if (selected) {
      bg = colors.primary;
      text = colors.textInverse;
      border = colors.primary;
    } else {
      bg = colors.surface;
      text = colors.textSecondary;
      border = colors.border;
    }
  }

  const hasAction = Boolean(onPress);

  return (
    <Pressable
      onPress={onPress}
      disabled={!hasAction || disabled}
      hitSlop={enableHitSlop ? (hitSlop ?? 6) : undefined}
      accessibilityRole={hasAction ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel || resolvedLabel}
      accessibilityState={{
        disabled: hasAction ? disabled : undefined,
        selected: hasAction && variant === 'filter' ? selected : undefined,
      }}
      style={({ pressed }) => [
        styles.touchTarget,
        pressed && hasAction && !disabled && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.visualChip,
          {
            backgroundColor: bg,
            borderColor: border,
            paddingHorizontal: resolvedIcon ? spacing.lg : spacing.md,
          },
          disabled && styles.visualDisabled,
        ]}
      >
        {resolvedIcon && <Ionicons name={resolvedIcon} size={14} color={disabled ? colors.textMuted : text} style={styles.icon} />}
        <Text style={[styles.label, { color: disabled ? colors.textMuted : text }]}>{resolvedLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    minHeight: spacing.touchTargetMin, // 48dp garantizado
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualChip: {
    height: 36, // Altura visual óptima de 36dp
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.chips,
    borderWidth: 1,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  visualDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
});
