import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { AppText } from './AppText';
import { colors, radii, elevations } from '../theme';

/**
 * SegmentedControl — «¿Cuántas recetas?» 1 · 2 · 3 (Chef-IA.dc.html).
 * Riel avena de 52 dp; la opción elegida es una píldora blanca que flota.
 */
export type SegmentedControlProps<V extends string | number> = {
  options: { value: V; label: string; accessibilityLabel?: string }[];
  value: V;
  onChange: (value: V) => void;
  accessibilityLabel: string;
  /** Color del riel: 'low' avena clara (Chef IA) · 'container' avena media (Login, Legal). */
  rail?: 'low' | 'container';
  /** 'tab' para pestañas (Login, Legal): rol tab en vez de radio. */
  role?: 'radio' | 'tab';
};

export function SegmentedControl<V extends string | number>({ options, value, onChange, accessibilityLabel, rail = 'low', role = 'radio' }: SegmentedControlProps<V>) {
  return (
    <View
      style={[styles.rail, rail === 'container' && styles.railContainer]}
      accessibilityRole={role === 'tab' ? 'tablist' : 'radiogroup'}
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.selected]}
            accessibilityRole={role}
            accessibilityState={role === 'tab' ? { selected } : { checked: selected }}
            accessibilityLabel={o.accessibilityLabel ?? o.label}
          >
            <AppText variant="body" weight={selected ? 'semibold' : 'medium'} style={role === 'tab' ? styles.tabText : undefined}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    height: 52,
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceVariant,
  },
  segment: {
    flex: 1,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railContainer: {
    backgroundColor: colors.m3.surfaceContainer,
  },
  tabText: {
    fontSize: 15,
  },
  selected: {
    backgroundColor: colors.surface,
    ...elevations.md,
  },
});
