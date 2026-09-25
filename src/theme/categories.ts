import { Ionicons } from '@expo/vector-icons';
import { IngredientCategory } from '../types';

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
    label: 'Verduras',
    icon: 'leaf-outline',
  },
  fruit: {
    key: 'fruit',
    label: 'Frutas',
    icon: 'nutrition-outline',
  },
  protein: {
    key: 'protein',
    label: 'Proteínas',
    icon: 'restaurant-outline',
  },
  dairy: {
    key: 'dairy',
    label: 'Lácteos',
    icon: 'water-outline',
  },
  grain: {
    key: 'grain',
    label: 'Granos',
    icon: 'grid-outline',
  },
  legume: {
    key: 'legume',
    label: 'Legumbres',
    icon: 'ellipse-outline',
  },
  sauce: {
    key: 'sauce',
    label: 'Salsas',
    icon: 'color-fill-outline',
  },
  snack: {
    key: 'snack',
    label: 'Snacks',
    icon: 'fast-food-outline',
  },
  other: {
    key: 'other',
    label: 'Otros',
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
