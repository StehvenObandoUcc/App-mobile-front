import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { AppText } from './AppText';
import { colors, radii, spacing } from '../theme';

/**
 * OptionPills — fila de opciones de igual ancho, 48 dp (tiempo máximo del Chef IA).
 * Elegida en cacao; deshabilitada en avena atenuada (sigue legible).
 */
export type OptionPillsProps<V extends string | number> = {
  options: { value: V; label: string; accessibilityLabel?: string; disabled?: boolean }[];
  value: V;
  onChange: (value: V) => void;
  accessibilityLabel: string;
};

export function OptionPills<V extends string | number>({ options, value, onChange, accessibilityLabel }: OptionPillsProps<V>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            disabled={o.disabled}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => [
              styles.pill,
              selected ? styles.selected : o.disabled ? styles.disabled : styles.idle,
              pressed && styles.pressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: o.disabled }}
            accessibilityLabel={o.accessibilityLabel ?? o.label}
          >
            <AppText
              variant="bodySmall"
              weight={selected ? 'semibold' : 'regular'}
              color={selected ? colors.onInk : o.disabled ? colors.textMuted : colors.textPrimary}
            >
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.ink,
  },
  idle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  disabled: {
    backgroundColor: colors.m3.surfaceContainer,
  },
  pressed: {
    opacity: 0.85,
  },
});
