import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';
import { useReduceMotion } from '../hooks/useReduceMotion';

/** PagerDots — indicador de pasos: el actual es una píldora cacao de 22×8; los demás, puntos de 8 (avena). */
export function PagerDots({ count, index }: { count: number; index: number }) {
  const styles = useStyles();
  const { t } = useI18n();
  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={t('atoms.pagerDots.stepA11y', { current: index + 1, total: count })}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} active={i === index} />
      ))}
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const reduceMotion = useReduceMotion();
  // Tres puntos de 8 dp: animar el ancho (hilo JS) es barato y conserva las puntas redondas.
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) {
      v.setValue(active ? 1 : 0);
      return;
    }
    Animated.timing(v, { toValue: active ? 1 : 0, duration: 260, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: false }).start();
  }, [active, v, reduceMotion]);
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

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
}));
