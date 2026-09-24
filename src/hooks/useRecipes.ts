import { useState, useEffect, useCallback } from 'react';
import { AsyncStatus, Recipe, DietaryPreference } from '../types';
import { RecipeService, mockRecipeService } from '../services/recipe-service';
import { LocalStorage } from '../storage/local-storage';

let memoryRecipes: Recipe[] | null = null;

export function useRecipes(service: RecipeService = mockRecipeService) {
  const [recipes, setRecipes] = useState<Recipe[]>(memoryRecipes || []);
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
      setError(err?.message || 'Error al cargar las recetas');
      setStatus('error');
    }
  }, [service]);

  useEffect(() => {
    loadRecipes();

    const unsubscribe = LocalStorage.subscribe(() => {
      service.getRecipes().then((data) => {
        memoryRecipes = data;
        setRecipes(data);
      }).catch(() => {});
    });

    return unsubscribe;
  }, [loadRecipes, service]);

  const getRecipeById = useCallback(
    async (id: string): Promise<Recipe | null> => {
      return service.getRecipeById(id);
    },
    [service]
  );

  const toggleSave = async (id: string) => {
    try {
      await service.toggleSave(id);
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar favorita');
    }
  };

  const prepareRecipe = async (id: string): Promise<string[]> => {
    try {
      const consumedNames = await service.prepareRecipe(id);
      return consumedNames;
    } catch (err: any) {
      setError(err?.message || 'Error al procesar la preparación');
      throw err;
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      await service.deleteRecipe(id);
    } catch (err: any) {
      setError(err?.message || 'Error al descartar la receta');
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
      setError(err?.message || 'Error al eliminar recetas seleccionadas');
    }
  };

  const generateWithAi = async (
    ingredients: any[],
    maxPrepTime: number = 30,
    focus: string = 'waste_reduction',
    count: number = 2,
    difficulty: string = 'any',
    dietaryPreference: DietaryPreference = 'any'
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
        dietaryPreference
      );
      setStatus('success');
      return generated;
    } catch (err: any) {
      setError(err?.message || 'Error generando recetas con IA');
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
