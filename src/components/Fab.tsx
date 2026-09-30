import React from 'react';
import { StyleSheet, Pressable, StyleProp, ViewStyle, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, elevations } from '../theme';

/**
 * Fab — botón flotante solo con icono (squircle 56, radio 20).
 * tone 'ink' (cacao) | 'ai' (frambuesa). `iconRotation` permite girar el icono (+ → ×) con Animated.
 */
export type FabProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: 'ink' | 'ai';
  style?: StyleProp<ViewStyle>;
  iconRotation?: Animated.AnimatedInterpolation<string>;
  accessibilityState?: { expanded?: boolean };
};

export function Fab({ iconName, onPress, accessibilityLabel, tone = 'ink', style, iconRotation, accessibilityState }: FabProps) {
  const bg = tone === 'ai' ? colors.tertiary : colors.ink;
  const pressedBg = tone === 'ai' ? colors.m3.tertiaryPressed : colors.inkPressed;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={({ pressed }) => [styles.fab, { backgroundColor: pressed ? pressedBg : bg }, pressed && styles.pressed, style]}
    >
      <Animated.View style={iconRotation ? { transform: [{ rotate: iconRotation }] } : undefined}>
        <Ionicons name={iconName} size={26} color={colors.onInk} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevations.lg,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
});
