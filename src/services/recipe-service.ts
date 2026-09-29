import { Recipe, DietaryPreference } from '../types';
import { LocalStorage } from '../storage/local-storage';
import {
  generateRecipesWithApi,
  getRecipeStepsWithApi,
  fetchSavedRecipesFromApi,
  saveRecipeWithApi,
  deleteRecipeWithApi,
  batchDeleteRecipesWithApi,
  executeDeleteWithPendingResolution,
  RecipeGenerationExtras,
} from './api-client';
import { AuthService } from './auth-service';
import { getFriendlyErrorMessage } from '../utils/error-messages';
import { planConsumption } from '../utils/consumption';
import { updateIngredientSynced } from './inventory-mutations';
import { flushOutbox } from './outbox-dispatcher';

/** Lo que devuelve «Preparar receta»: alimentos descontados y los que hay que ajustar a mano. */
export type PrepareRecipeResult = { consumed: string[]; skipped: string[] };

export interface RecipeService {
  getRecipes(): Promise<Recipe[]>;
  getRecipeById(id: string): Promise<Recipe | null>;
  getRecipeSteps(recipe: Recipe): Promise<string[]>;
  saveRecipe(id: string): Promise<void>;
  toggleSave(id: string): Promise<void>;
  deleteRecipe(id: string): Promise<void>;
  deleteRecipes(ids: string[]): Promise<void>;
  prepareRecipe(id: string): Promise<PrepareRecipeResult>;
  generateRecipesWithAi(
    ingredients: any[],
    maxPrepTime?: number,
    focus?: string,
    count?: number,
    difficulty?: string,
    dietaryPreference?: DietaryPreference,
    extras?: RecipeGenerationExtras
  ): Promise<Recipe[]>;
}

let isSyncingRecipes = false;

export const mockRecipeService: RecipeService = {
  async getRecipes(): Promise<Recipe[]> {
    const local = await LocalStorage.getRecipes();

    const syncCloud = async () => {
      const startUserId = LocalStorage.getCurrentUserId();
      if (!startUserId) return;

      if (isSyncingRecipes) return;
      isSyncingRecipes = true;

      try {
        // 1. Resolver eliminaciones pendientes (HTTP 200/404 limpian pending, 401/403/5xx/red conservan)
        const pendingRecipeDeletes = LocalStorage.getPendingDeletedRecipes();
        if (pendingRecipeDeletes.length > 0) {
          await Promise.allSettled(
            pendingRecipeDeletes.map((delId) =>
              executeDeleteWithPendingResolution(
                delId,
                deleteRecipeWithApi,
                LocalStorage.removePendingDeletedRecipe,
                'Receta'
              )
            )
          );
        }

        if (LocalStorage.getCurrentUserId() !== startUserId) return;

        // 2. Sincronizar recetas guardadas desde la nube (excluyendo cualquier pendiente activa)
        const remote = await fetchSavedRecipesFromApi();
        if (LocalStorage.getCurrentUserId() !== startUserId) return;

        if (Array.isArray(remote) && remote.length > 0) {
          const activePendingDeletes = new Set(LocalStorage.getPendingDeletedRecipes());
          for (const r of remote) {
            if (LocalStorage.getCurrentUserId() !== startUserId) return;
            if (!activePendingDeletes.has(r.id)) {
              await LocalStorage.saveRecipe(r);
            }
          }
        }
      } catch {
        // En offline o error de red se conservan los datos locales
      } finally {
        isSyncingRecipes = false;
      }
    };

    syncCloud().catch(() => {});

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
    executeDeleteWithPendingResolution(
      id,
      deleteRecipeWithApi,
      LocalStorage.removePendingDeletedRecipe,
      'Receta'
    ).catch(() => {});
  },

  async deleteRecipes(ids: string[]): Promise<void> {
    await LocalStorage.deleteRecipes(ids);
    await Promise.allSettled(
      ids.map((id) =>
        executeDeleteWithPendingResolution(
          id,
          deleteRecipeWithApi,
          LocalStorage.removePendingDeletedRecipe,
          'Receta'
        )
      )
    );
  },

  /**
   * Finaliza la preparación de una receta: descuenta de la despensa lo usado (con conversión g↔kg, ml↔L)
   * y envía cada cambio a la cola Outbox para que el servidor no lo revierta en la siguiente sincronización.
   */
  async prepareRecipe(id: string): Promise<PrepareRecipeResult> {
    const recipe = await this.getRecipeById(id);
    if (!recipe) return { consumed: [], skipped: [] };

    const inventory = await LocalStorage.getInventory();
    const plan = planConsumption(
      inventory,
      recipe.availableIngredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        inventoryIngredientId: ing.inventoryIngredientId ?? null,
      }))
    );

    const byId = new Map(inventory.map((i) => [i.id, i]));
    for (const u of plan.updates) {
      const current = byId.get(u.id);
      if (current) await updateIngredientSynced({ ...current, quantity: u.quantity, unit: u.unit }, { flush: false });
    }
    flushOutbox().catch(() => {});

    return { consumed: plan.consumed, skipped: plan.skipped };
  },

  async generateRecipesWithAi(
    ingredients: any[],
    maxPrepTime: number = 30,
    focus: string = 'waste_reduction',
    count: number = 2,
    difficulty: string = 'any',
    dietaryPreference: DietaryPreference = 'any',
    extras: RecipeGenerationExtras = {}
  ): Promise<Recipe[]> {
    try {
      const generated = await generateRecipesWithApi(ingredients, maxPrepTime, focus, count, difficulty, dietaryPreference, extras);
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

// Reanudar sincronización de recetas pendientes automáticamente cuando se renueva la sesión o se autentica
AuthService.subscribe((session) => {
  if (session?.accessToken && session?.user?.id) {
    mockRecipeService.getRecipes().catch(() => {});
  }
});
