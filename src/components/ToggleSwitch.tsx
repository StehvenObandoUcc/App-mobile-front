import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { colors, radii } from '../theme';

/**
 * ToggleSwitch — interruptor M3 (Configuracion.dc.html). 52×32.
 * Encendido: riel cacao, perilla blanca de 24 a la derecha. Apagado: riel avena con filete, perilla de 16 gris.
 * Solo transform/opacity (hilo nativo).
 */
export type ToggleSwitchProps = {
  value: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
};

export function ToggleSwitch({ value, onChange, disabled = false, accessibilityLabel, accessibilityHint }: ToggleSwitchProps) {
  const v = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: value ? 1 : 0, duration: 200, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }).start();
  }, [value, v]);

  return (
    <Pressable
      onPress={() => !disabled && onChange?.(!value)}
      disabled={disabled || !onChange}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={8}
      style={disabled ? styles.disabled : undefined}
    >
      <View style={styles.track}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.trackOn, { opacity: v }]} />
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: value ? colors.surface : colors.m3.outline,
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) },
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [16 / 24, 1] }) },
              ],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.m3.surfaceContainerHighest,
    borderWidth: 2,
    borderColor: colors.m3.outline,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackOn: {
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    margin: -2,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 2,
  },
  disabled: {
    opacity: 0.45,
  },
});
