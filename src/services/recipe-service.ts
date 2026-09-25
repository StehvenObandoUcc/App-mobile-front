import { Recipe, DietaryPreference } from '../types';
import { LocalStorage } from '../storage/local-storage';
import {
  generateRecipesWithApi,
  getRecipeStepsWithApi,
  fetchSavedRecipesFromApi,
  saveRecipeWithApi,
  deleteRecipeWithApi,
  batchDeleteRecipesWithApi,
} from './api-client';
import { getFriendlyErrorMessage } from '../utils/error-messages';

export interface RecipeService {
  getRecipes(): Promise<Recipe[]>;
  getRecipeById(id: string): Promise<Recipe | null>;
  getRecipeSteps(recipe: Recipe): Promise<string[]>;
  saveRecipe(id: string): Promise<void>;
  toggleSave(id: string): Promise<void>;
  deleteRecipe(id: string): Promise<void>;
  deleteRecipes(ids: string[]): Promise<void>;
  prepareRecipe(id: string): Promise<string[]>;
  generateRecipesWithAi(
    ingredients: any[],
    maxPrepTime?: number,
    focus?: string,
    count?: number,
    difficulty?: string,
    dietaryPreference?: DietaryPreference
  ): Promise<Recipe[]>;
}

export const mockRecipeService: RecipeService = {
  async getRecipes(): Promise<Recipe[]> {
    const local = await LocalStorage.getRecipes();

    // Sincronización en segundo plano con la base de datos (Supabase)
    fetchSavedRecipesFromApi()
      .then(async (remote) => {
        if (Array.isArray(remote) && remote.length > 0) {
          for (const r of remote) {
            await LocalStorage.saveRecipe(r);
          }
        }
      })
      .catch(() => {});

    return local;
  },

  async getRecipeById(id: string): Promise<Recipe | null> {
    const recipes = await this.getRecipes();
    return recipes.find((r) => r.id === id) || null;
  },

  /**
   * Fase 2 (Opción A Stateless): Obtiene los pasos detallados de preparación bajo demanda
   * y los guarda en LocalStorage y base de datos para evitar re-consultar a la IA.
   */
  async getRecipeSteps(recipe: Recipe): Promise<string[]> {
    if (recipe.steps && recipe.steps.length > 0) {
      return recipe.steps;
    }
    try {
      const steps = await getRecipeStepsWithApi({
        title: recipe.title,
        description: recipe.description,
        availableIngredients: recipe.availableIngredients,
        missingIngredients: recipe.missingIngredients,
        difficulty: recipe.difficulty,
      });
      const updatedRecipe: Recipe = { ...recipe, steps };
      await LocalStorage.saveRecipe(updatedRecipe);
      saveRecipeWithApi(updatedRecipe).catch(() => {});
      return steps;
    } catch (err: any) {
      console.warn('[RecipeService] Error obteniendo pasos con IA:', err);
      throw new Error(getFriendlyErrorMessage(err, 'recipes'));
    }
  },

  async saveRecipe(id: string): Promise<void> {
    await LocalStorage.toggleSaveRecipe(id);
    const updated = await this.getRecipeById(id);
    if (updated) {
      saveRecipeWithApi(updated).catch((err) =>
        console.warn('[RecipeService] Error persistiendo receta en la nube:', err?.message)
      );
    }
  },

  async toggleSave(id: string): Promise<void> {
    await this.saveRecipe(id);
  },

  async deleteRecipe(id: string): Promise<void> {
    await LocalStorage.deleteRecipe(id);
    deleteRecipeWithApi(id).catch((err) =>
      console.warn('[RecipeService] Error eliminando receta de la nube:', err?.message)
    );
  },

  async deleteRecipes(ids: string[]): Promise<void> {
    await LocalStorage.deleteRecipes(ids);
    batchDeleteRecipesWithApi(ids).catch((err) =>
      console.warn('[RecipeService] Error eliminando lote de recetas de la nube:', err?.message)
    );
  },

  /**
   * Finaliza la preparación de una receta y descuenta los ingredientes utilizados del inventario.
   */
  async prepareRecipe(id: string): Promise<string[]> {
    const recipe = await this.getRecipeById(id);
    if (!recipe) return [];

    const toConsume = recipe.availableIngredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity ?? 1,
    }));

    return LocalStorage.consumeIngredients(toConsume);
  },

  async generateRecipesWithAi(
    ingredients: any[],
    maxPrepTime: number = 30,
    focus: string = 'waste_reduction',
    count: number = 2,
    difficulty: string = 'any',
    dietaryPreference: DietaryPreference = 'any'
  ): Promise<Recipe[]> {
    try {
      const generated = await generateRecipesWithApi(ingredients, maxPrepTime, focus, count, difficulty, dietaryPreference);
      if (!Array.isArray(generated) || generated.length === 0) {
        throw new Error('No pudimos generar tus recetas en este momento. Intenta con menos recetas o vuelve a intentarlo.');
      }
      const enriched = generated.map((rec) => ({
        ...rec,
        createdAt: rec.createdAt || new Date().toISOString(),
      }));

      for (const rec of enriched) {
        await LocalStorage.saveRecipe(rec);
        // Persistencia garantizada en base de datos en segundo plano
        saveRecipeWithApi(rec).catch((err) =>
          console.warn('[RecipeService] Error persistiendo receta generada en base de datos:', err?.message)
        );
      }
      return enriched;
    } catch (err: any) {
      console.warn('[RecipeService] Error generando recetas con IA:', err);
      throw new Error(getFriendlyErrorMessage(err, 'recipes'));
    }
  },
};
