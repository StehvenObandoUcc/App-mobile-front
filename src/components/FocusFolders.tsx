import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { colors, radii, typography } from '../theme';

/**
 * FocusFolders — enfoque del Chef IA como pestañas apiladas tipo carpeta (Chef-IA.dc.html, ref. C).
 * Las opciones no elegidas se ven como lengüetas que se solapan 14 dp;
 * la elegida queda abajo, desplegada con su descripción, anillo cacao y check.
 *
 * Animación (solo transform/opacity → corre en el hilo nativo, no se traba):
 * todas las cartas miden lo mismo y cada una tapa el resto de la de arriba; al elegir, la carta
 * se desliza a su nuevo lugar con translateY, el título crece, y descripción, check y anillo aparecen.
 * Con «Reducir movimiento» el cambio es instantáneo.
 */
export type FocusFolderOption<K extends string> = {
  key: K;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  tone: { background: string; text: string };
};

export type FocusFoldersProps<K extends string> = {
  options: readonly FocusFolderOption<K>[];
  value: K;
  onChange: (key: K) => void;
};

const TAB_HEIGHT = 64;
const OVERLAP = 14;
const STEP = TAB_HEIGHT - OVERLAP;
const FALLBACK_HEIGHT = 124;
const DURATION = 420;
const EASING = Easing.bezier(0.2, 0, 0, 1); // «emphasized» de M3
const CLOSED_TITLE_SCALE = 15 / typography.sizes.cardTitle;

type CardAnim = { y: Animated.Value; open: Animated.Value };

export function FocusFolders<K extends string>({ options, value, onChange }: FocusFoldersProps<K>) {
  const reduceMotion = useReduceMotion();
  const selectedKey = options.some((o) => o.key === value) ? value : options[0].key;
  const [cardHeight, setCardHeight] = useState(FALLBACK_HEIGHT);
  const measured = useRef<Partial<Record<K, number>>>({}).current;
  const anims = useRef(new Map<K, CardAnim>()).current;
  const firstRun = useRef(true);

  /** Orden visual: las no elegidas arriba (en su orden) y la elegida al final. */
  const slotOf = (key: K, selected: K) => {
    if (key === selected) return options.length - 1;
    return options.filter((o) => o.key !== selected).findIndex((o) => o.key === key);
  };

  options.forEach((o) => {
    if (!anims.has(o.key)) {
      anims.set(o.key, {
        y: new Animated.Value(slotOf(o.key, selectedKey) * STEP),
        open: new Animated.Value(o.key === selectedKey ? 1 : 0),
      });
    }
  });

  useEffect(() => {
    const animated = !firstRun.current && !reduceMotion;
    firstRun.current = false;
    const list: Animated.CompositeAnimation[] = [];
    options.forEach((o) => {
      const a = anims.get(o.key)!;
      const y = slotOf(o.key, selectedKey) * STEP;
      const open = o.key === selectedKey ? 1 : 0;
      if (!animated) {
        a.y.setValue(y);
        a.open.setValue(open);
        return;
      }
      list.push(
        Animated.timing(a.y, { toValue: y, duration: DURATION, easing: EASING, useNativeDriver: true }),
        Animated.timing(a.open, { toValue: open, duration: DURATION, easing: EASING, useNativeDriver: true })
      );
    });
    if (list.length) Animated.parallel(list).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, reduceMotion]);

  // Todas las cartas usan la altura de la más alta (descripción incluida). El contenido no cambia
  // de tamaño al abrir/cerrar, así que se mide una sola vez y no interrumpe la animación.
  const onMeasure = (key: K) => (e: LayoutChangeEvent) => {
    measured[key] = Math.ceil(e.nativeEvent.layout.height);
    if (options.every((o) => measured[o.key] !== undefined)) {
      const max = Math.max(...options.map((o) => measured[o.key]!));
      if (max !== cardHeight) setCardHeight(max);
    }
  };

  return (
    <View
      style={{ height: (options.length - 1) * STEP + cardHeight }}
      accessibilityRole="radiogroup"
      accessibilityLabel="Enfoque culinario"
    >
      {options.map((o) => {
        const a = anims.get(o.key)!;
        const isOpen = o.key === selectedKey;
        return (
          <Animated.View
            key={o.key}
            style={[
              styles.card,
              {
                height: cardHeight,
                zIndex: slotOf(o.key, selectedKey),
                backgroundColor: o.tone.background,
                transform: [{ translateY: a.y }],
              },
            ]}
          >
            <Pressable
              onPress={() => onChange(o.key)}
              style={({ pressed }) => [styles.fill, pressed && !isOpen && styles.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ checked: isOpen }}
              accessibilityLabel={isOpen ? `${o.title}, elegido. ${o.description}` : `${o.title}. ${o.description}`}
            >
              <View style={styles.content} onLayout={onMeasure(o.key)}>
                <View style={styles.head}>
                  <Ionicons name={o.iconName} size={22} color={o.tone.text} />
                  <Animated.View
                    style={[
                      styles.titleWrap,
                      {
                        transform: [
                          { scale: a.open.interpolate({ inputRange: [0, 1], outputRange: [CLOSED_TITLE_SCALE, 1] }) },
                        ],
                      },
                    ]}
                  >
                    <AppText variant="cardTitle" color={o.tone.text} numberOfLines={1}>
                      {o.title}
                    </AppText>
                  </Animated.View>
                  <Animated.View
                    style={[
                      styles.check,
                      {
                        opacity: a.open,
                        transform: [{ scale: a.open.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
                      },
                    ]}
                  >
                    <Ionicons name="checkmark" size={16} color={colors.onInk} />
                  </Animated.View>
                </View>
                <Animated.View style={{ opacity: a.open }}>
                  <AppText variant="bodySmall" color={o.tone.text}>
                    {o.description}
                  </AppText>
                </Animated.View>
              </View>
            </Pressable>
            <Animated.View pointerEvents="none" style={[styles.ring, { opacity: a.open }]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    overflow: 'hidden',
    borderRadius: radii.cards,
  },
  fill: {
    flex: 1,
  },
  pressed: {
    opacity: 0.9,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 18,
    gap: 8,
  },
  head: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleWrap: {
    flex: 1,
    transformOrigin: 'left center',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.cards,
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
