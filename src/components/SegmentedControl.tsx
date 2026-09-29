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
};

export function SegmentedControl<V extends string | number>({ options, value, onChange, accessibilityLabel }: SegmentedControlProps<V>) {
  return (
    <View style={styles.rail} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.selected]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.accessibilityLabel ?? o.label}
          >
            <AppText variant="body" weight={selected ? 'semibold' : 'medium'}>
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
  selected: {
    backgroundColor: colors.surface,
    ...elevations.md,
  },
});
