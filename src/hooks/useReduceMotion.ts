import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAppPreferences } from '../preferences/AppPreferences';

/** Valor del sistema (opción de accesibilidad del teléfono). */
export function useSystemReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduce(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * true = las animaciones pasan a ser instantáneas.
 * Respeta Configuración › Reducir animaciones: «Como el teléfono» (sistema), «Siempre» o «Nunca».
 * Toda animación (Animated.timing / spring / loop, LayoutAnimation) debe consultarlo.
 */
export function useReduceMotion(): boolean {
  const system = useSystemReduceMotion();
  const { reduceMotion } = useAppPreferences();
  if (reduceMotion === 'on') return true;
  if (reduceMotion === 'off') return false;
  return system;
}
