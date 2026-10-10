import { Ionicons } from '@expo/vector-icons';
import { IngredientCategory } from '../types';
import { t } from '../i18n';

export type CategoryMeta = {
  key: IngredientCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/**
 * Fuente Única de Verdad para Iconografía y Etiquetas de Categorías de Alimentos.
 * Garantiza total consistencia visual entre Despensa, Lista de Compras, Escáner y Recetas.
 */
export const CATEGORY_CONFIG: Record<IngredientCategory, CategoryMeta> = {
  vegetable: {
    key: 'vegetable',
    get label() { return t('misc.categories.vegetable'); },
    icon: 'leaf-outline',
  },
  fruit: {
    key: 'fruit',
    get label() { return t('misc.categories.fruit'); },
    icon: 'nutrition-outline',
  },
  protein: {
    key: 'protein',
    get label() { return t('misc.categories.protein'); },
    icon: 'restaurant-outline',
  },
  dairy: {
    key: 'dairy',
    get label() { return t('misc.categories.dairy'); },
    icon: 'water-outline',
  },
  grain: {
    key: 'grain',
    get label() { return t('misc.categories.grain'); },
    icon: 'grid-outline',
  },
  legume: {
    key: 'legume',
    get label() { return t('misc.categories.legume'); },
    icon: 'ellipse-outline',
  },
  sauce: {
    key: 'sauce',
    get label() { return t('misc.categories.sauce'); },
    icon: 'color-fill-outline',
  },
  snack: {
    key: 'snack',
    get label() { return t('misc.categories.snack'); },
    icon: 'fast-food-outline',
  },
  other: {
    key: 'other',
    get label() { return t('misc.categories.other'); },
    icon: 'cube-outline',
  },
};

export const CATEGORY_LIST: CategoryMeta[] = [
  CATEGORY_CONFIG.vegetable,
  CATEGORY_CONFIG.fruit,
  CATEGORY_CONFIG.protein,
  CATEGORY_CONFIG.dairy,
  CATEGORY_CONFIG.grain,
  CATEGORY_CONFIG.legume,
  CATEGORY_CONFIG.sauce,
  CATEGORY_CONFIG.snack,
  CATEGORY_CONFIG.other,
];

export function getCategoryConfig(category?: string | null): CategoryMeta {
  if (!category) return CATEGORY_CONFIG.other;
  const normalized = category.toLowerCase().trim() as IngredientCategory;
  return CATEGORY_CONFIG[normalized] || CATEGORY_CONFIG.other;
}
