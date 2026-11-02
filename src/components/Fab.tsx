import React from 'react';
import { StyleSheet, Pressable, StyleProp, ViewStyle, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { elevations } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';

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
  /** Texto visible junto al icono (FAB extendido): un icono solo no dice qué hace. */
  label?: string;
};

export function Fab({ iconName, onPress, accessibilityLabel, tone = 'ink', style, iconRotation, accessibilityState, label }: FabProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const bg = tone === 'ai' ? colors.tertiary : colors.ink;
  const pressedBg = tone === 'ai' ? colors.m3.tertiaryPressed : colors.inkPressed;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={({ pressed }) => [styles.fab, label ? styles.extended : null, { backgroundColor: pressed ? pressedBg : bg }, pressed && styles.pressed, style]}
    >
      <Animated.View style={iconRotation ? { transform: [{ rotate: iconRotation }] } : undefined}>
        <Ionicons name={iconName} size={label ? 22 : 26} color={colors.onInk} />
      </Animated.View>
      {label ? (
        <AppText weight="semibold" color={colors.onInk} numberOfLines={1}>
          {label}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevations.lg,
  },
  extended: {
    width: undefined,
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 20,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
}));
