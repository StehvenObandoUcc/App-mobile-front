import { colors } from '../theme';

/**
 * Franja pastel para recetas sin foto (RecipeCard, RecipeMiniCard, TodayRecipeCard).
 * Se elige de forma estable según el id: la misma receta siempre tiene el mismo color.
 */
const BANNERS = [
  { bg: colors.primaryContainer, fg: colors.primary },
  { bg: colors.categories.dairy.background, fg: colors.categories.dairy.text },
  { bg: colors.categories.vegetable.background, fg: colors.categories.vegetable.text },
  { bg: colors.categories.grain.background, fg: colors.categories.grain.text },
  { bg: colors.categories.legume.background, fg: colors.categories.legume.text },
] as const;

export function recipeBanner(id: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return BANNERS[h % BANNERS.length];
}

export const DIFFICULTY_LABELS = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' } as const;

/** «Falta 1» · «Faltan 3» · «Tienes todo» */
export function missingLabel(missing: number): string {
  if (missing === 0) return 'Tienes todo';
  return missing === 1 ? 'Falta 1' : `Faltan ${missing}`;
}

/**
 * Divide el título de una receta para el contraste de peso del mockup:
 * «Arroz con pollo **y verduras**». Corta en el último « y », « con », « al » o « de »
 * de la segunda mitad; si no hay, resalta la última palabra.
 */
export function splitRecipeTitle(title: string): { lead: string; emphasis: string } {
  const t = title.trim();
  const half = Math.floor(t.length / 2);
  let cut = -1;
  for (const sep of [' y ', ' con ', ' al ', ' de ']) {
    const i = t.lastIndexOf(sep);
    if (i >= half && i > cut) cut = i;
  }
  if (cut > 0) return { lead: t.slice(0, cut), emphasis: t.slice(cut + 1) };
  const sp = t.lastIndexOf(' ');
  return sp > 0 ? { lead: t.slice(0, sp), emphasis: t.slice(sp + 1) } : { lead: '', emphasis: t };
}

/** Quita el prefijo «Paso 3:» que a veces escribe la IA (el número ya lo muestra la tarjeta). */
export function cleanStepText(step: string): string {
  return step.replace(/^\s*paso\s*\d+\s*[:.\-–)]\s*/i, '').trim();
}
