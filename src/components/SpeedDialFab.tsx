import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Modal, Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Fab } from './Fab';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { colors, radii, elevations } from '../theme';

/**
 * SpeedDialFab — botón «+» que despliega opciones (Despensa: escribir a mano / escanear).
 * Cerrado: solo el Fab. Abierto: velo, el + gira a ×, y las opciones suben escalonadas.
 * Todo con transform/opacity en el hilo nativo; con «Reducir movimiento» es instantáneo.
 */
export type SpeedDialAction = {
  key: string;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Color del círculo del icono. */
  tone?: 'ink' | 'brand' | 'ai';
};

export type SpeedDialFabProps = {
  actions: SpeedDialAction[];
  accessibilityLabel: string;
  /** Posición absoluta del Fab (bottom/right), igual dentro y fuera del menú. */
  style?: StyleProp<ViewStyle>;
};

const TONE_BG = { ink: colors.ink, brand: colors.primary, ai: colors.tertiary };
const DURATION = 240;

export function SpeedDialFab({ actions, accessibilityLabel, style }: SpeedDialFabProps) {
  const reduceMotion = useReduceMotion();
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!open) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 0 : DURATION,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: true,
    }).start();
  }, [open, progress, reduceMotion]);

  const close = (after?: () => void) => {
    Animated.timing(progress, {
      toValue: 0,
      duration: reduceMotion ? 0 : 170,
      easing: Easing.bezier(0.3, 0, 1, 1),
      useNativeDriver: true,
    }).start(() => {
      setOpen(false);
      after?.();
    });
  };

  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] });

  return (
    <>
      {!open && (
        <Fab
          iconName="add"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ expanded: false }}
          onPress={() => setOpen(true)}
          style={style}
        />
      )}

      <Modal visible={open} transparent animationType="none" onRequestClose={() => close()} statusBarTranslucent navigationBarTranslucent>
        <Animated.View style={[styles.scrim, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Cerrar opciones" />
        </Animated.View>

        <View style={[styles.anchor, style]} pointerEvents="box-none">
          <View style={styles.menu} pointerEvents="box-none">
            {actions.map((a, i) => {
              // La opción más cercana al botón aparece primero.
              const fromBottom = actions.length - 1 - i;
              const start = Math.min(fromBottom * 0.18, 0.5);
              const local = progress.interpolate({ inputRange: [start, Math.min(start + 0.6, 1)], outputRange: [0, 1], extrapolate: 'clamp' });
              return (
                <Animated.View
                  key={a.key}
                  style={{
                    opacity: local,
                    transform: [
                      { translateY: local.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
                      { scale: local.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                    ],
                  }}
                >
                  <Pressable
                    onPress={() => close(a.onPress)}
                    style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={a.label}
                  >
                    <AppText variant="body" weight="semibold" style={styles.itemText}>
                      {a.label}
                    </AppText>
                    <View style={[styles.itemIcon, { backgroundColor: TONE_BG[a.tone ?? 'ink'] }]}>
                      <Ionicons name={a.iconName} size={20} color={colors.onInk} />
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
          <Fab
            iconName="add"
            accessibilityLabel="Cerrar opciones"
            accessibilityState={{ expanded: true }}
            iconRotation={rotate}
            onPress={() => close()}
            style={styles.fabInMenu}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.scrim,
  },
  anchor: {
    position: 'absolute',
    alignItems: 'flex-end',
    width: 56,
    height: 56,
    overflow: 'visible',
  },
  menu: {
    position: 'absolute',
    right: 0,
    bottom: 56 + 14,
    alignItems: 'flex-end',
    gap: 12,
    width: 320,
  },
  item: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 18,
    paddingRight: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    ...elevations.lg,
  },
  itemPressed: {
    backgroundColor: colors.m3.surfaceContainerLow,
  },
  itemText: {
    fontSize: 15,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabInMenu: {
    position: 'relative',
  },
});
