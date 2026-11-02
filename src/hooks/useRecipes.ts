import { useState, useEffect, useCallback, useMemo } from 'react';
import { t } from '../i18n';
import { AsyncStatus, Recipe, DietaryPreference, Ingredient } from '../types';
import { RecipeService, mockRecipeService, PrepareRecipeResult } from '../services/recipe-service';
import { LocalStorage } from '../storage/local-storage';
import type { RecipeGenerationExtras } from '../services/api-client';
import { withLiveAvailability } from '../utils/consumption';

let memoryRecipes: Recipe[] | null = null;

// Al cerrar sesión o cambiar de cuenta se descarta la caché en memoria (si no, se veían datos de la cuenta anterior).
let cachedUserId: string | null = null;
LocalStorage.subscribe(() => {
  const uid = LocalStorage.getCurrentUserId();
  if (uid !== cachedUserId) {
    cachedUserId = uid;
    memoryRecipes = null;
  }
});

export function useRecipes(service: RecipeService = mockRecipeService) {
  const [storedRecipes, setRecipes] = useState<Recipe[]>(memoryRecipes || []);
  // Despensa local: «tienes / te falta» y el % se recalculan con lo que hay HOY, no con lo que había al generar.
  // null = aún no se leyó (unos ms): no se recalcula para no mostrar un «0 %» momentáneo.
  const [pantry, setPantry] = useState<Ingredient[] | null>(null);
  const recipes = useMemo(
    () => (pantry ? storedRecipes.map((r) => withLiveAvailability(r, pantry)) : storedRecipes),
    [storedRecipes, pantry]
  );
  const [status, setStatus] = useState<AsyncStatus>(memoryRecipes && memoryRecipes.length > 0 ? 'success' : 'loading');
  const [error, setError] = useState<string | null>(null);

  const loadRecipes = useCallback(async () => {
    setError(null);
    try {
      const data = await service.getRecipes();
      memoryRecipes = data;
      setRecipes(data);
      setStatus('success');
    } catch (err: any) {
      setError(err?.message || t('data.recipes.loadError'));
      setStatus('error');
    }
  }, [service]);

  useEffect(() => {
    loadRecipes();
    const loadPantry = () => LocalStorage.getInventory().then(setPantry).catch(() => {});
    loadPantry();

    const unsubscribe = LocalStorage.subscribe(() => {
      loadPantry();
      // Solo lectura local: getRecipes() también sincroniza con la nube y eso
      // volvía a emitir cambios en bucle (reordenaba la lista y causaba lag).
      LocalStorage.getRecipes().then((data) => {
        memoryRecipes = data;
        setRecipes(data);
      }).catch(() => {});
    });

    return unsubscribe;
  }, [loadRecipes, service]);

  const getRecipeById = useCallback(
    async (id: string): Promise<Recipe | null> => {
      const [recipe, current] = await Promise.all([service.getRecipeById(id), LocalStorage.getInventory().catch(() => [])]);
      return recipe ? withLiveAvailability(recipe, current) : null;
    },
    [service]
  );

  const toggleSave = async (id: string) => {
    try {
      await service.toggleSave(id);
    } catch (err: any) {
      setError(err?.message || t('data.recipes.favoriteError'));
    }
  };

  const prepareRecipe = async (id: string): Promise<PrepareRecipeResult> => {
    try {
      return await service.prepareRecipe(id);
    } catch (err: any) {
      setError(err?.message || t('data.recipes.prepareError'));
      throw err;
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      await service.deleteRecipe(id);
    } catch (err: any) {
      setError(err?.message || t('data.recipes.discardError'));
    }
  };

  const getRecipeSteps = useCallback(
    async (recipe: Recipe): Promise<string[]> => {
      return service.getRecipeSteps(recipe);
    },
    [service]
  );

  const deleteRecipes = async (ids: string[]) => {
    try {
      await service.deleteRecipes(ids);
    } catch (err: any) {
      setError(err?.message || t('data.recipes.deleteSelectedError'));
    }
  };

  const generateWithAi = async (
    ingredients: any[],
    maxPrepTime: number = 30,
    focus: string = 'waste_reduction',
    count: number = 2,
    difficulty: string = 'any',
    dietaryPreference: DietaryPreference = 'any',
    extras: RecipeGenerationExtras = {}
  ): Promise<Recipe[]> => {
    const hadNoRecipes = recipes.length === 0;
    if (hadNoRecipes) {
      setStatus('loading');
    }
    try {
      const generated = await service.generateRecipesWithAi(
        ingredients,
        maxPrepTime,
        focus,
        count,
        difficulty,
        dietaryPreference,
        extras
      );
      setStatus('success');
      return generated;
    } catch (err: any) {
      setError(err?.message || t('data.recipes.generateAiError'));
      if (hadNoRecipes) {
        setStatus('error');
      }
      throw err;
    }
  };

  return {
    recipes,
    status,
    error,
    reload: loadRecipes,
    getRecipeById,
    getRecipeSteps,
    toggleSave,
    prepareRecipe,
    deleteRecipe,
    deleteRecipes,
    generateWithAi,
  };
}
