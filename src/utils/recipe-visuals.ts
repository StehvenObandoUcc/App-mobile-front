import type { ThemeColors } from '../theme/colors';
import { t, tp } from '../i18n';
import { missingRequiredOf } from './consumption';

/**
 * Franja pastel para recetas sin foto (RecipeCard, RecipeMiniCard, TodayRecipeCard).
 * Se elige de forma estable según el id: la misma receta siempre tiene el mismo color.
 */
const bannersFor = (colors: ThemeColors) => [
  { bg: colors.primaryContainer, fg: colors.primary },
  { bg: colors.categories.dairy.background, fg: colors.categories.dairy.text },
  { bg: colors.categories.vegetable.background, fg: colors.categories.vegetable.text },
  { bg: colors.categories.grain.background, fg: colors.categories.grain.text },
  { bg: colors.categories.legume.background, fg: colors.categories.legume.text },
] as const;

export function recipeBanner(colors: ThemeColors, id: string): { bg: string; fg: string } {
  const BANNERS = bannersFor(colors);
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return BANNERS[h % BANNERS.length];
}

export const DIFFICULTY_LABELS = {
  get easy() { return t('misc.difficulty.easy'); },
  get medium() { return t('misc.difficulty.medium'); },
  get hard() { return t('misc.difficulty.hard'); },
} as const;

/** «Tienes todo» · «Te falta 1» · «Te faltan 3» */
export function missingLabel(missing: number, optionalMissing = 0): string {
  // Solo faltan opcionales (aceite, sal…): se puede cocinar, pero no se tiene «todo».
  if (missing === 0 && optionalMissing > 0) return t('misc.recipeCard.essentialsOnly');
  if (missing === 0) return t('misc.recipeCard.noneMissing');
  return tp('misc.recipeCard.missing', missing);
}

/**
 * Estado de una receta frente a la despensa de hoy, en palabras: «Tienes todo» · «Te falta 1».
 * Reemplaza al «87 % con tu despensa»: el número no decía si se podía cocinar. Cuenta solo los
 * obligatorios, igual que `isCookable` (los opcionales no impiden cocinar).
 */
export function recipeStatus(recipe: Parameters<typeof missingRequiredOf>[0]): {
  label: string;
  icon: 'checkmark-circle' | 'cart-outline';
} {
  const missing = missingRequiredOf(recipe);
  const optionalMissing = recipe.missingIngredients.length - missing;
  return { label: missingLabel(missing, optionalMissing), icon: missing === 0 ? 'checkmark-circle' : 'cart-outline' };
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
