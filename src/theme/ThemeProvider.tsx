import { useMemo } from 'react';
import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { lightColors, darkColors, type ThemeColors } from './colors';
import { useAppPreferences } from '../preferences/AppPreferences';

export type ColorSchemeName = 'light' | 'dark';

/**
 * Tema activo. Úsalo en vez de importar `colors`:
 *   const { colors, isDark } = useTheme();
 * Cambia en vivo cuando el usuario elige Claro / Oscuro / Sistema o cuando cambia el teléfono.
 */
export function useTheme(): { colors: ThemeColors; scheme: ColorSchemeName; isDark: boolean } {
  const { themeMode } = useAppPreferences();
  const system = useColorScheme();
  const scheme: ColorSchemeName = themeMode === 'system' ? (system === 'dark' ? 'dark' : 'light') : themeMode;
  return useMemo(() => ({ colors: scheme === 'dark' ? darkColors : lightColors, scheme, isDark: scheme === 'dark' }), [scheme]);
}

/**
 * Estilos que dependen del tema, creados una sola vez por tema (sin costo en cada render):
 *
 *   const useStyles = makeStyles((c) => ({
 *     card: { backgroundColor: c.surface, borderColor: c.border },
 *   }));
 *   function Card() { const styles = useStyles(); ... }
 */
/** Mapa de estilos con nombre. RN 0.88 ya no exporta `StyleSheet.NamedStyles`; esta es la misma forma de antes. */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function makeStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  factory: (c: ThemeColors, scheme: ColorSchemeName) => T
): () => T {
  const cache: Partial<Record<ColorSchemeName, T>> = {};
  return function useStyles(): T {
    const { colors, scheme } = useTheme();
    let styles = cache[scheme];
    if (!styles) {
      styles = StyleSheet.create(factory(colors, scheme)) as T;
      cache[scheme] = styles;
    }
    return styles;
  };
}
