import { useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder } from 'react-native';
import {
  SWIPE_MAX_TRANSLATE,
  dragTranslate,
  resolveSwipe,
  directionOf,
  shouldCaptureHorizontal,
  type SwipeDirection,
} from '../utils/swipe';

/**
 * Deslizamiento horizontal entre dos estados (p. ej. «Iniciar sesión» ↔ «Crear cuenta»).
 * Solo PanResponder + Animated (transform/opacity con driver nativo), sin dependencias nuevas.
 *
 * - Reclama el gesto únicamente si |dx| > 12 y |dx| > |dy| × 1.5 (no roba el scroll vertical ni el foco).
 * - El contenido sigue al dedo con resistencia (dx × 0.35, tope ±60 dp) y baja a 0.7 de opacidad.
 * - Al soltar: supera 25 % del ancho o |vx| > 0.5 → cambia (salida + entrada M3, ≈200 ms); si no, vuelve a 0.
 * - `run(dir, apply)` hace la misma transición para otros disparadores (p. ej. tocar el SegmentedControl).
 * - Con «Reducir movimiento» el cambio es instantáneo.
 */
export type UseHorizontalSwipeOptions = {
  enabled?: boolean;
  /** Ancho de referencia para el umbral del 25 %. */
  width: number;
  reduceMotion: boolean;
  /** ¿Existe un estado en esa dirección? (+1 siguiente, -1 anterior). */
  canSwipe: (dir: SwipeDirection) => boolean;
  /** Cambia el estado (se llama en el punto medio de la transición). */
  onSwipe: (dir: SwipeDirection) => void;
};

const EASE = Easing.bezier(0.2, 0, 0, 1);
const HALF_MS = 100;

export function useHorizontalSwipe(options: UseHorizontalSwipeOptions) {
  const optsRef = useRef(options);
  optsRef.current = options;

  const tx = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const busy = useRef(false);
  // Un toque durante la animación no se pierde: se guarda el último y se aplica al terminar.
  const queued = useRef<{ dir: SwipeDirection; apply: () => void } | null>(null);

  const run: (dir: SwipeDirection, apply: () => void) => void = useRef((dir: SwipeDirection, apply: () => void) => {
    if (optsRef.current.reduceMotion) {
      tx.setValue(0);
      fade.setValue(1);
      apply();
      return;
    }
    if (busy.current) {
      queued.current = { dir, apply };
      return;
    }
    busy.current = true;
    Animated.parallel([
      Animated.timing(tx, { toValue: -dir * SWIPE_MAX_TRANSLATE, duration: HALF_MS, easing: EASE, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: HALF_MS, easing: EASE, useNativeDriver: true }),
    ]).start(() => {
      apply();
      tx.setValue(dir * SWIPE_MAX_TRANSLATE);
      Animated.parallel([
        Animated.timing(tx, { toValue: 0, duration: HALF_MS, easing: EASE, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: HALF_MS, easing: EASE, useNativeDriver: true }),
      ]).start(() => {
        busy.current = false;
        const next = queued.current;
        queued.current = null;
        if (next) run(next.dir, next.apply);
      });
    });
  }).current;

  const panResponder = useMemo(() => {
    const settle = () =>
      Animated.timing(tx, { toValue: 0, duration: 160, easing: EASE, useNativeDriver: true }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => {
        const o = optsRef.current;
        if (o.enabled === false || busy.current || !shouldCaptureHorizontal(g.dx, g.dy)) return false;
        const dir = directionOf(g.dx);
        return dir !== 0 && o.canSwipe(dir);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => {
        tx.setValue(optsRef.current.reduceMotion ? 0 : dragTranslate(g.dx));
      },
      onPanResponderRelease: (_e, g) => {
        const o = optsRef.current;
        const dir = resolveSwipe(g.dx, g.vx, o.width);
        if (dir !== 0 && o.canSwipe(dir)) run(dir, () => o.onSwipe(dir));
        else settle();
      },
      onPanResponderTerminate: settle,
    });
  }, [tx, run]);

  const animatedStyle = useMemo(
    () => ({
      opacity: Animated.multiply(
        fade,
        tx.interpolate({
          inputRange: [-SWIPE_MAX_TRANSLATE, 0, SWIPE_MAX_TRANSLATE],
          outputRange: [0.7, 1, 0.7],
          extrapolate: 'clamp',
        })
      ),
      transform: [{ translateX: tx }],
    }),
    [tx, fade]
  );

  return { panHandlers: panResponder.panHandlers, animatedStyle, run };
}
