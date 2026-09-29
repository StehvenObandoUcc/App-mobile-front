import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../theme';

/** PagerDots — indicador de pasos: el actual es una píldora cacao de 22×8; los demás, puntos de 8 (avena). */
export function PagerDots({ count, index }: { count: number; index: number }) {
  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={`Paso ${index + 1} de ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} active={i === index} />
      ))}
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  // Tres puntos de 8 dp: animar el ancho (hilo JS) es barato y conserva las puntas redondas.
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: active ? 1 : 0, duration: 260, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: false }).start();
  }, [active, v]);
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: v.interpolate({ inputRange: [0, 1], outputRange: [8, 22] }),
          backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: [colors.m3.outlineVariant, colors.ink] }),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
