import { Recipe, RecipeSortOption, RecipeFilterOptions, RecipeDifficulty } from '../types';

const DIFFICULTY_WEIGHT: Record<RecipeDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

/**
 * Ordena recetas según la opción seleccionada.
 * Por defecto usa 'createdAt_desc' (Pila / Stack con las más recientes primero).
 */
export function sortRecipes(recipes: Recipe[], sortOption: RecipeSortOption = 'createdAt_desc'): Recipe[] {
  const copy = [...recipes];

  return copy.sort((a, b) => {
    switch (sortOption) {
      case 'createdAt_desc': {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
        return (b.matchScore || 0) - (a.matchScore || 0);
      }

      case 'createdAt_asc': {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (a.matchScore || 0) - (b.matchScore || 0);
      }

      case 'matchScore_desc':
        return (b.matchScore || 0) - (a.matchScore || 0);

      case 'prepTime_asc': {
        const timeA = a.prepTimeMinutes ?? 999;
        const timeB = b.prepTimeMinutes ?? 999;
        return timeA - timeB;
      }

      case 'difficulty_asc': {
        const diffA = DIFFICULTY_WEIGHT[a.difficulty] || 2;
        const diffB = DIFFICULTY_WEIGHT[b.difficulty] || 2;
        return diffA - diffB;
      }

      default:
        return 0;
    }
  });
}
