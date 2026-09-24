import { Recipe, IngredientValidationResult, RecipeDifficulty } from '../types';

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
      friendlyMessage: 'No cuentas con todos los ingredientes necesarios para esta receta.',
      inventoryDeductionNotice:
        'No se descontará nada de tu inventario. ¿Deseas añadir los ingredientes faltantes a tu lista de compras?',
      willDeductFromInventory: false,
    };
  }

  if (missingCount > 0) {
    return {
      status: 'missing_optional',
      canPrepare: true,
      availableCount,
      missingCount,
      missingItems,
      friendlyMessage: 'Te faltan algunos ingredientes opcionales, pero puedes prepararla sin problemas.',
      inventoryDeductionNotice: 'Se descontarán únicamente los ingredientes utilizados de tu inventario.',
      willDeductFromInventory: true,
    };
  }

  return {
    status: 'complete',
    canPrepare: true,
    availableCount,
    missingCount: 0,
    missingItems: [],
    friendlyMessage: '¡Tienes todos los ingredientes listos!',
    inventoryDeductionNotice: 'Los ingredientes consumidos se descontarán automáticamente de tu inventario.',
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
 * Reglas de coherencia entre tiempo de preparación y dificultad para el Chef IA
 */
export function getValidTimesForDifficulty(difficulty: RecipeDifficulty): number[] {
  switch (difficulty) {
    case 'easy':
      return [15, 20, 30];
    case 'medium':
      return [20, 30, 45];
    case 'hard':
      return [30, 45, 60];
    default:
      return [15, 20, 30, 45, 60];
  }
}

/**
 * Verifica si una combinación de tiempo y dificultad es válida.
 */
export function isTimeValidForDifficulty(
  timeMinutes: number,
  difficulty: RecipeDifficulty
): { isValid: boolean; reason?: string } {
  const allowedTimes = getValidTimesForDifficulty(difficulty);

  if (!allowedTimes.includes(timeMinutes)) {
    if (difficulty === 'easy' && timeMinutes > 30) {
      return {
        isValid: false,
        reason: 'Las recetas fáciles no deberían tomar más de 30 minutos. Elige 15, 20 o 30 min.',
      };
    }
    if (difficulty === 'hard' && timeMinutes < 30) {
      return {
        isValid: false,
        reason: 'Las recetas complejas requieren al menos 30 a 45 minutos de preparación.',
      };
    }
    return {
      isValid: false,
      reason: `Para dificultad ${difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Media' : 'Difícil'}, selecciona un tiempo adecuado.`,
    };
  }

  return { isValid: true };
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
      message: 'Selecciona al menos un ingrediente para crear recetas.',
      badgeText: 'Sin ingredientes',
      badgeType: 'warning',
    };
  }

  if (ingredients.length === 1) {
    const single = ingredients[0];
    const nameClean = single.name.toLowerCase().trim();
    const isCondiment = CONDIMENT_KEYWORDS.some((kw) => nameClean.includes(kw));

    if (isCondiment) {
      return {
        isValid: true, // Se permite pero con aviso orientativo
        isSingleIngredient: true,
        ingredientName: single.name,
        isCondimentOnly: true,
        message: `Has seleccionado únicamente "${single.name}" (sazonador/condimento). El Chef IA sugerirá complementos básicos, pero es recomendable añadir un alimento base (proteína, vegetal o grano).`,
        badgeText: 'Condimento único (Se sugiere sumar base)',
        badgeType: 'warning',
      };
    }

    return {
      isValid: true,
      isSingleIngredient: true,
      ingredientName: single.name,
      isCondimentOnly: false,
      message: `"${single.name}" será el ingrediente estrella. El Chef IA creará recetas coherentes y complementará con básicos de cocina.`,
      badgeText: '1 ingrediente coherente',
      badgeType: 'info',
    };
  }

  return {
    isValid: true,
    isSingleIngredient: false,
    isCondimentOnly: false,
    message: `${ingredients.length} ingredientes listos para combinar armónicamente.`,
    badgeText: `${ingredients.length} ingredientes`,
    badgeType: 'success',
  };
}

