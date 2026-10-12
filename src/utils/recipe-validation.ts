import { Recipe, IngredientValidationResult, RecipeDifficulty } from '../types';
import { t } from '../i18n';

/**
 * Valida los ingredientes de una receta frente al inventario actual
 * y genera mensajes amigables y estado claro.
 */
export function validateRecipeIngredients(recipe: Recipe): IngredientValidationResult {
  const missingRequired = (recipe.missingIngredients || []).filter((ing) => !ing.isOptional);
  const availableCount = (recipe.availableIngredients || []).length;
  const missingCount = (recipe.missingIngredients || []).length;
  const missingItems = recipe.missingIngredients || [];

  if (missingRequired.length > 0) {
    return {
      status: 'missing_required',
      canPrepare: false,
      availableCount,
      missingCount,
      missingItems,
      friendlyMessage: t('misc.recipeValidation.missingRequired'),
      // Aunque falten ingredientes, se descuentan los que sí tienes (decisión de Stehven, 28-09-2026).
      inventoryDeductionNotice:
        availableCount > 0
          ? t('misc.recipeValidation.deductOnlyHave')
          : t('misc.recipeValidation.deductNone'),
      willDeductFromInventory: availableCount > 0,
    };
  }

  if (missingCount > 0) {
    return {
      status: 'missing_optional',
      canPrepare: true,
      availableCount,
      missingCount,
      missingItems,
      friendlyMessage: t('misc.recipeValidation.missingOptional'),
      inventoryDeductionNotice: t('misc.recipeValidation.deductUsedOnly'),
      willDeductFromInventory: true,
    };
  }

  return {
    status: 'complete',
    canPrepare: true,
    availableCount,
    missingCount: 0,
    missingItems: [],
    friendlyMessage: t('misc.recipeValidation.complete'),
    inventoryDeductionNotice: t('misc.recipeValidation.deductAll'),
    willDeductFromInventory: true,
  };
}

/**
 * Regla de compatibilidad de tiempo vs dificultad para Chef IA
 */
export function getValidTimeOptionsForFocus(focus: string, difficulty?: string): number[] {
  if (focus === 'quick') {
    // Para enfoque express: máximo 20 minutos
    return [15, 20];
  }
  if (difficulty === 'hard') {
    // Para recetas complejas: 30 a 60 minutos
    return [30, 45, 60];
  }
  if (difficulty === 'easy') {
    return [15, 20, 30];
  }
  if (difficulty === 'medium') {
    return [20, 30, 45];
  }
  return [15, 20, 30, 45, 60];
}

/**
 * Clasificación y validación de coherencia gastronómica cuando se seleccionan ingredientes para el Chef IA.
 * Permite y valida casos de 1 solo ingrediente asegurando que sea coherente ("pero no está mal aún").
 */
const CONDIMENT_KEYWORDS = [
  'sal',
  'pimienta',
  'aceite',
  'vinagre',
  'comino',
  'oregano',
  'orégano',
  'azucar',
  'azúcar',
  'canela',
  'laurel',
  'tomillo',
  'romero',
  'agua',
  'color',
  'achiote',
  'bicarbonato',
  'polvo de hornear',
  'esencia',
];

// Equivalentes en inglés (la app también funciona en English).
const CONDIMENT_KEYWORDS_EN = [
  'salt', 'pepper', 'oil', 'vinegar', 'cumin', 'oregano', 'sugar', 'cinnamon',
  'bay leaf', 'thyme', 'rosemary', 'water', 'food coloring', 'baking soda', 'baking powder', 'extract',
];

const normalizeWords = (text: string) =>
  ` ${text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;

/**
 * Coincide por PALABRA completa, no por trozo: antes «sal» marcaba salmón, salsa o salchicha
 * y «agua» marcaba aguacate como condimento.
 */
export function isCondimentName(name: string): boolean {
  const words = normalizeWords(name);
  return [...CONDIMENT_KEYWORDS, ...CONDIMENT_KEYWORDS_EN].some((kw) => {
    const k = normalizeWords(kw);
    // También acepta el plural simple («sales», «aceites», «salts»).
    return words.includes(k) || words.includes(k.trimEnd() + 's ') || words.includes(k.trimEnd() + 'es ');
  });
}

export interface IngredientSelectionCoherence {
  isValid: boolean;
  isSingleIngredient: boolean;
  ingredientName?: string;
  isCondimentOnly: boolean;
  message: string;
  badgeText: string;
  badgeType: 'info' | 'warning' | 'success';
}

export function checkIngredientSelectionCoherence(
  ingredients: Array<{ id: string; name: string; category?: string }>
): IngredientSelectionCoherence {
  if (ingredients.length === 0) {
    return {
      isValid: false,
      isSingleIngredient: false,
      isCondimentOnly: false,
      message: t('misc.recipeValidation.selectAtLeastOne'),
      badgeText: t('misc.recipeValidation.noIngredients'),
      badgeType: 'warning',
    };
  }

  if (ingredients.length === 1) {
    const single = ingredients[0];
    const isCondiment = isCondimentName(single.name);

    if (isCondiment) {
      return {
        isValid: true, // Se permite pero con aviso orientativo
        isSingleIngredient: true,
        ingredientName: single.name,
        isCondimentOnly: true,
        message: t('misc.recipeValidation.condimentMessage', { name: single.name }),
        badgeText: t('misc.recipeValidation.condimentBadge'),
        badgeType: 'warning',
      };
    }

    return {
      isValid: true,
      isSingleIngredient: true,
      ingredientName: single.name,
      isCondimentOnly: false,
      message: t('misc.recipeValidation.starMessage', { name: single.name }),
      badgeText: t('misc.recipeValidation.starBadge'),
      badgeType: 'info',
    };
  }

  return {
    isValid: true,
    isSingleIngredient: false,
    isCondimentOnly: false,
    message: t('misc.recipeValidation.manyMessage', { count: ingredients.length }),
    badgeText: t('misc.recipeValidation.manyBadge', { count: ingredients.length }),
    badgeType: 'success',
  };
}

