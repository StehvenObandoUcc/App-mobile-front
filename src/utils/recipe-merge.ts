import type { Recipe, RecipeImageCredit } from '../types';

const isHttps = (v: unknown): v is string => typeof v === 'string' && v.startsWith('https://');

/** Valida el crédito de la foto: objeto con `name` y `profileUrl` https (si no, null). */
export function parseRecipeImageCredit(raw: unknown): RecipeImageCredit | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.name !== 'string' || !c.name.trim() || !isHttps(c.profileUrl)) return null;
  return {
    source: 'unsplash',
    name: c.name.trim(),
    profileUrl: c.profileUrl,
    sourceUrl: isHttps(c.sourceUrl) ? c.sourceUrl : 'https://unsplash.com',
  };
}

/**
 * Lee la foto de una receta venida de la API (camelCase o snake_case). Solo devuelve las claves
 * que existen, para no alterar recetas sin foto.
 */
export function readRecipeImage(raw: any): Pick<Recipe, 'imageUri' | 'imageCredit'> {
  const out: Pick<Recipe, 'imageUri' | 'imageCredit'> = {};
  const uri = raw?.imageUri || raw?.image_uri;
  if (isHttps(uri)) {
    out.imageUri = uri;
    let credit = raw?.imageCredit ?? raw?.image_credit;
    if (typeof credit === 'string') {
      try {
        credit = JSON.parse(credit);
      } catch {
        credit = null;
      }
    }
    out.imageCredit = parseRecipeImageCredit(credit);
  }
  return out;
}

/**
 * Mezcla una receta de la nube sobre la local: conserva la fecha local (la del servidor tiene otro
 * formato y reordenaba la lista) y, si la nube no trae foto, la foto y el crédito locales.
 */
export function mergeCloudRecipe(remote: Recipe, existing?: Recipe | null): Recipe {
  const merged: Recipe = { ...remote, createdAt: existing?.createdAt || remote.createdAt };
  if (!merged.imageUri && existing?.imageUri) {
    merged.imageUri = existing.imageUri;
    merged.imageCredit = existing.imageCredit ?? null;
  } else if (merged.imageUri && !merged.imageCredit && existing?.imageUri === merged.imageUri && existing.imageCredit) {
    merged.imageCredit = existing.imageCredit;
  }
  return merged;
}

/** Receta cruda de /recipes/generate: quita los campos de foto crudos y deja solo los validados. */
export function normalizeGeneratedRecipe<T extends Record<string, any>>(raw: T): Omit<T, 'imageUri' | 'image_uri' | 'imageCredit' | 'image_credit'> & Pick<Recipe, 'imageUri' | 'imageCredit'> {
  const { imageUri: _a, image_uri: _b, imageCredit: _c, image_credit: _d, ...rest } = raw;
  return { ...rest, ...readRecipeImage(raw) };
}
