import { typography } from '../theme';

/**
 * Estado en tiempo de ejecución de la fuente de marca (Outfit).
 * Vive en utils, no en theme: los tokens del tema son valores puros sin estado ni hooks.
 */
type WeightKey = keyof typeof typography.weights;

let brandFontReady = false;

/** Lo llama useBrandFonts() cuando termina de cargar Outfit. */
export function setBrandFontReady(ready: boolean) {
  brandFontReady = ready;
}

/**
 * Familia Outfit para un peso dado. En Android una familia personalizada NO interpola
 * fontWeight, por eso cada peso es un archivo distinto. Sin fuente cargada devuelve
 * undefined y React Native usa la fuente del sistema.
 */
export function fontFamilyFor(weight: WeightKey = 'regular'): string | undefined {
  if (!brandFontReady) return undefined;
  switch (weight) {
    case 'light':
      return typography.families.light;
    case 'medium':
      return typography.families.medium;
    case 'semibold':
      return typography.families.semibold;
    case 'bold':
    case 'heavy':
      return typography.families.bold;
    default:
      return typography.families.regular;
  }
}
