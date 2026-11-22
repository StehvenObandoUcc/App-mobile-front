import type { Recipe, RecipeImageCredit } from '../types';

export type PhotoSource = 'unsplash' | 'pexels' | 'wikimedia';

/** Host de una URL https (minúsculas) o null. Sin userinfo ni puerto; la comparación es de host exacto, no de prefijo. */
function httpsHost(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = /^https:\/\/([^/?#]+)/i.exec(v);
  if (!m) return null;
  const host = m[1].toLowerCase();
  return /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(host) ? host : null;
}

/** Hosts permitidos por fuente: fotos (imageUri) y enlaces (perfil/página). Los comodines `*.` cubren subdominios reales. */
const SOURCE_HOSTS: Record<PhotoSource, { image: string[]; page: string[]; pageSuffix: string[]; fallbackPage: string }> = {
  unsplash: { image: ['images.unsplash.com'], page: ['unsplash.com'], pageSuffix: [], fallbackPage: 'https://unsplash.com/' },
  pexels: { image: ['images.pexels.com'], page: ['www.pexels.com', 'pexels.com'], pageSuffix: [], fallbackPage: 'https://www.pexels.com/' },
  wikimedia: {
    image: ['upload.wikimedia.org'],
    page: ['commons.wikimedia.org'],
    pageSuffix: ['.wikipedia.org', '.wikimedia.org'],
    fallbackPage: 'https://commons.wikimedia.org/',
  },
};

export const isPhotoSource = (v: unknown): v is PhotoSource => v === 'unsplash' || v === 'pexels' || v === 'wikimedia';

export const isAllowedImageUrl = (source: PhotoSource, v: unknown): v is string => {
  const host = httpsHost(v);
  return !!host && SOURCE_HOSTS[source].image.includes(host);
};

export const isAllowedPageUrl = (source: PhotoSource, v: unknown): v is string => {
  const host = httpsHost(v);
  if (!host) return false;
  const h = SOURCE_HOSTS[source];
  return h.page.includes(host) || h.pageSuffix.some((s) => host.length > s.length && host.endsWith(s));
};

/** Compatibilidad con Unsplash (fotos en images.unsplash.com, enlaces en unsplash.com). */
export const isUnsplashImageUrl = (v: unknown): v is string => isAllowedImageUrl('unsplash', v);
export const isUnsplashPageUrl = (v: unknown): v is string => isAllowedPageUrl('unsplash', v);

/**
 * Valida el crédito de la foto: `name`, `profileUrl` en un host de su fuente (Unsplash, Pexels o Wikimedia) y,
 * en Wikimedia, `license` obligatoria. Sin `source` se asume unsplash (recetas guardadas). Si no, null.
 */
export function parseRecipeImageCredit(raw: unknown): RecipeImageCredit | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const source = c.source == null ? 'unsplash' : c.source;
  if (!isPhotoSource(source)) return null;
  if (typeof c.name !== 'string' || !c.name.trim() || !isAllowedPageUrl(source, c.profileUrl)) return null;
  const license = typeof c.license === 'string' ? c.license.trim() : '';
  if (source === 'wikimedia' && !license) return null;
  const credit: RecipeImageCredit = {
    source,
    name: c.name.trim(),
    profileUrl: c.profileUrl,
    sourceUrl: isAllowedPageUrl(source, c.sourceUrl) ? c.sourceUrl : SOURCE_HOSTS[source].fallbackPage,
  };
  if (source === 'wikimedia') credit.license = license;
  return credit;
}

/**
 * Lee la foto de una receta venida de la API (camelCase o snake_case). Solo devuelve las claves
 * que existen, para no alterar recetas sin foto.
 */
export function readRecipeImage(raw: any): Pick<Recipe, 'imageUri' | 'imageCredit'> {
  const out: Pick<Recipe, 'imageUri' | 'imageCredit'> = {};
  const uri = raw?.imageUri || raw?.image_uri;
  let credit = raw?.imageCredit ?? raw?.image_credit;
  if (typeof credit === 'string') {
    try {
      credit = JSON.parse(credit);
    } catch {
      credit = null;
    }
  }
  // Sin atribución válida no hay foto (ilustración de respaldo); el host de la foto debe corresponder a la fuente del crédito
  const parsed = parseRecipeImageCredit(credit);
  if (parsed && isAllowedImageUrl(parsed.source, uri)) {
    out.imageUri = uri;
    out.imageCredit = parsed;
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
  // Foto sin crédito válido: se descarta (regla de atribución de las fuentes)
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
