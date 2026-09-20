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
  return [15, 20, 30, 45];
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
