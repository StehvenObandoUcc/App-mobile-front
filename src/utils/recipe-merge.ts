import type { Recipe, RecipeImageCredit } from '../types';

/** Únicos hosts permitidos (condición de la guía de Unsplash): fotos en images.unsplash.com, enlaces en unsplash.com. */
export const UNSPLASH_IMAGE_PREFIX = 'https://images.unsplash.com/';
export const UNSPLASH_PAGE_PREFIX = 'https://unsplash.com/';

export const isUnsplashImageUrl = (v: unknown): v is string => typeof v === 'string' && v.startsWith(UNSPLASH_IMAGE_PREFIX);
export const isUnsplashPageUrl = (v: unknown): v is string => typeof v === 'string' && v.startsWith(UNSPLASH_PAGE_PREFIX);

/** Valida el crédito de la foto: objeto con `name` y `profileUrl` de unsplash.com (si no, null). */
export function parseRecipeImageCredit(raw: unknown): RecipeImageCredit | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.name !== 'string' || !c.name.trim() || !isUnsplashPageUrl(c.profileUrl)) return null;
  return {
    source: 'unsplash',
    name: c.name.trim(),
    profileUrl: c.profileUrl,
    sourceUrl: isUnsplashPageUrl(c.sourceUrl) ? c.sourceUrl : 'https://unsplash.com/',
  };
}

/**
 * Lee la foto de una receta venida de la API (camelCase o snake_case). Solo devuelve las claves
 * que existen, para no alterar recetas sin foto.
 */
export function readRecipeImage(raw: any): Pick<Recipe, 'imageUri' | 'imageCredit'> {
  const out: Pick<Recipe, 'imageUri' | 'imageCredit'> = {};
  const uri = raw?.imageUri || raw?.image_uri;
  if (isUnsplashImageUrl(uri)) {
    let credit = raw?.imageCredit ?? raw?.image_credit;
    if (typeof credit === 'string') {
      try {
        credit = JSON.parse(credit);
      } catch {
        credit = null;
      }
    }
    // Unsplash prohíbe mostrar la foto sin atribución: sin crédito válido no hay foto (ilustración de respaldo)
    const parsed = parseRecipeImageCredit(credit);
    if (parsed) {
      out.imageUri = uri;
      out.imageCredit = parsed;
    }
  }
  return out;
}

/**
 * Mezcla una receta de la nube sobre la local: conserva la fecha local (la del servidor tiene otro
 * formato y reordenaba la lista) y, si la nube no trae foto, la foto y el crédito locales.
 */
export function mergeCloudRecipe(remote: Recipe, existing?: Recipe | null): Recipe {
  const merged: Recipe = { ...remote, createdAt: existing?.createdAt || remote.createdAt };
  if (!merged.imageUri && existing?.imageUri && existing.imageCredit) {
    merged.imageUri = existing.imageUri;
    merged.imageCredit = existing.imageCredit;
  } else if (merged.imageUri && !merged.imageCredit && existing?.imageUri === merged.imageUri && existing.imageCredit) {
    merged.imageCredit = existing.imageCredit;
  }
  // Foto sin crédito válido: se descarta (regla de atribución de Unsplash)
  if (merged.imageUri && !merged.imageCredit) {
    delete merged.imageUri;
    delete merged.imageCredit;
  }
  return merged;
}

/** Receta cruda de /recipes/generate: quita los campos de foto crudos y deja solo los validados. */
export function normalizeGeneratedRecipe<T extends Record<string, any>>(raw: T): Omit<T, 'imageUri' | 'image_uri' | 'imageCredit' | 'image_credit'> & Pick<Recipe, 'imageUri' | 'imageCredit'> {
  const { imageUri: _a, image_uri: _b, imageCredit: _c, image_credit: _d, ...rest } = raw;
  return { ...rest, ...readRecipeImage(raw) };
}
