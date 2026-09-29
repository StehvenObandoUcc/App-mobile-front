import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from './Text';
import { colors, radii, spacing, typography } from '../theme';

/**
 * QuantityStepper — Despensa-Formulario.dc.html
 * Píldora avena de 56 dp: «−» blanco · número 20/600 · «+» cacao. Botones de 48 dp.
 */
export type QuantityStepperProps = {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  step?: number;
  maxLength?: number;
};

export function QuantityStepper({ value, onChange, min = 1, step = 1, maxLength = 8 }: QuantityStepperProps) {
  const current = parseFloat(value);
  const dec = () => {
    const base = Number.isNaN(current) ? min : current;
    onChange(String(Math.max(min, Math.round((base - step) * 10) / 10)));
  };
  const inc = () => {
    const base = Number.isNaN(current) ? 0 : current;
    onChange(String(Math.round((base + step) * 10) / 10));
  };

  return (
    <View style={styles.group} accessibilityRole="adjustable" accessibilityLabel={`Cantidad ${value || 'vacía'}`}>
      <Pressable
        onPress={dec}
        style={({ pressed }) => [styles.btn, styles.btnMinus, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Reducir cantidad"
      >
        <Ionicons name="remove" size={22} color={colors.textPrimary} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(v.replace(',', '.').replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        maxLength={maxLength}
        placeholder="1"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        accessibilityLabel="Cantidad"
        selectTextOnFocus
      />
      <Pressable
        onPress={inc}
        style={({ pressed }) => [styles.btn, styles.btnPlus, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Aumentar cantidad"
      >
        <Ionicons name="add" size={22} color={colors.onInk} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceVariant,
  },
  btn: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    borderRadius: spacing.touchTargetMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMinus: {
    backgroundColor: colors.surface,
  },
  btnPlus: {
    backgroundColor: colors.ink,
  },
  pressed: {
    transform: [{ scale: 0.92 }],
  },
  input: {
    minWidth: 56,
    paddingHorizontal: 4,
    paddingVertical: 0,
    textAlign: 'center',
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
});
