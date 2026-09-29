import React from 'react';
import { StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, elevations } from '../theme';

/**
 * ExtendedFab — botón flotante con etiqueta (Despensa.dc.html «Agregar», Recetas «Generar con IA»).
 * Squircle de 56 dp, radio 20. tone 'ink' (cacao) | 'ai' (frambuesa). Eleva nivel 2 (flota).
 * La posición la decide la pantalla con `style` (bottom/right).
 */
export type ExtendedFabProps = {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: 'ink' | 'ai';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ExtendedFab({ label, iconName, onPress, tone = 'ink', accessibilityLabel, style }: ExtendedFabProps) {
  const bg = tone === 'ai' ? colors.tertiary : colors.ink;
  const pressedBg = tone === 'ai' ? colors.m3.tertiaryPressed : colors.inkPressed;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.fab, { backgroundColor: pressed ? pressedBg : bg }, pressed && styles.pressed, style]}
    >
      <Ionicons name={iconName} size={22} color={colors.onInk} />
      <AppText variant="body" weight="semibold" color={colors.onInk}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 20,
    borderRadius: 20,
    ...elevations.lg,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
