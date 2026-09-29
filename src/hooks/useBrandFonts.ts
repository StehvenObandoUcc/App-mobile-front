/**
 * Carga de la fuente de marca Outfit (OFL, Google Fonts) — Despensa Tonal.
 * Los 5 TTF estáticos viven en assets/fonts/ (generados desde la fuente variable oficial).
 * Se usa en app/_layout.tsx: el splash espera a que carguen (máx. 3 s; si fallan, fuente del sistema).
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
  [typography.families.bold]: require('../../assets/fonts/Outfit-Bold.ttf'),
};

/** Devuelve true cuando Outfit terminó de cargar (o falló: en ese caso se usa la del sistema). */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts(BRAND_FONT_SOURCES);
  useEffect(() => {
    setBrandFontReady(Boolean(loaded && !error));
  }, [loaded, error]);
  return loaded || Boolean(error);
}
