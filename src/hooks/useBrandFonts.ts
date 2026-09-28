/**
 * Carga de la fuente de marca Outfit (OFL) — Despensa Tonal.
 *
 * PASO PENDIENTE: copiar estos 4 archivos TTF estáticos en mobile/assets/fonts/
 *   Outfit-Light.ttf · Outfit-Regular.ttf · Outfit-Medium.ttf · Outfit-SemiBold.ttf
 * (descarga: https://fonts.google.com/specimen/Outfit → "Get font" → carpeta static/).
 *
 * Luego, en app/_layout.tsx, importar `useBrandFonts` desde src/hooks y usarlo (ver comentario allí).
 * Este módulo no se importa en ningún lado hasta entonces: Metro solo empaqueta
 * lo que se importa, así que su ausencia no rompe el bundle.
 *
 * `expo-font` ya viene con Expo SDK 57 (node_modules/expo-font 57.0.4). Para declararlo
 * explícitamente: `npx expo install expo-font` (no agrega peso: ya está en el árbol).
 */
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { typography } from '../theme';
import { setBrandFontReady } from '../utils/brand-font';

export const BRAND_FONT_SOURCES = {
  [typography.families.light]: require('../../assets/fonts/Outfit-Light.ttf'),
  [typography.families.regular]: require('../../assets/fonts/Outfit-Regular.ttf'),
  [typography.families.medium]: require('../../assets/fonts/Outfit-Medium.ttf'),
  [typography.families.semibold]: require('../../assets/fonts/Outfit-SemiBold.ttf'),
};

/** Devuelve true cuando Outfit terminó de cargar (o falló: en ese caso se usa la del sistema). */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts(BRAND_FONT_SOURCES);
  useEffect(() => {
    setBrandFontReady(Boolean(loaded && !error));
  }, [loaded, error]);
  return loaded || Boolean(error);
}
