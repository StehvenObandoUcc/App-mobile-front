import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient, Recipe, ShoppingItem, IngredientCategory } from '../types';
import { mockIngredients } from '../mocks/ingredients.mock';
import { mockRecipes } from '../mocks/recipes.mock';
import { findSimilarItem, normalizeItemUnitAndQty } from '../utils/text-matching';

export const DEFAULT_SHELF_LIFE_DAYS: Record<IngredientCategory, number> = {
  fruit: 7,
  vegetable: 7,
  dairy: 7,
  protein: 5,
  grain: 30,
  legume: 30,
  sauce: 30,
  snack: 30,
  other: 14,
};

const BASE_KEY_INVENTORY = '@food_ai_inventory_v1';
const BASE_KEY_RECIPES = '@food_ai_recipes_v1';
const BASE_KEY_DELETED_RECIPES = '@food_ai_deleted_recipes_v1';
const BASE_KEY_SHOPPING_LIST = '@food_ai_shopping_list_v1';

/**
 * Genera la clave namespaced para el almacenamiento.
 * Lanza error si no hay un usuario activo para evitar colisiones o escrituras en claves globales.
 */
export function getStorageKey(baseKey: string, userId: string): string {
  if (!userId || !userId.trim()) {
    throw new Error('Acceso de almacenamiento denegado: no hay usuario activo autenticado');
  }
  return `${baseKey}_${userId.trim()}`;
}

// Estado en memoria por usuario activo
let currentUserId: string | null = null;
let memoryInventory: Ingredient[] = [];
let memoryRecipes: Recipe[] = [];
let memoryShoppingList: ShoppingItem[] = [];
let deletedRecipeIds: Set<string> = new Set();

type StorageListener = () => void;
const listeners: Set<StorageListener> = new Set();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function ensureActiveUser(): string {
  if (!currentUserId) {
    throw new Error('Operación de almacenamiento rechazada: no hay sesión de usuario activa');
  }
  return currentUserId;
}

async function persistToDisk() {
  const uid = ensureActiveUser();
  try {
    await Promise.all([
      AsyncStorage.setItem(getStorageKey(BASE_KEY_INVENTORY, uid), JSON.stringify(memoryInventory)),
      AsyncStorage.setItem(getStorageKey(BASE_KEY_RECIPES, uid), JSON.stringify(memoryRecipes)),
      AsyncStorage.setItem(
        getStorageKey(BASE_KEY_DELETED_RECIPES, uid),
        JSON.stringify(Array.from(deletedRecipeIds))
      ),
      AsyncStorage.setItem(
        getStorageKey(BASE_KEY_SHOPPING_LIST, uid),
        JSON.stringify(memoryShoppingList)
      ),
    ]);
  } catch (err) {
    console.warn('[LocalStorage] Error persistiendo datos de usuario a AsyncStorage:', err);
  }
}

export const LocalStorage = {
  getCurrentUserId(): string | null {
    return currentUserId;
  },

  /**
   * Cambia el contexto al usuario autenticado e hidrata sus datos namespaced.
   * Nuevos usuarios inician con despensa limpia (sin mocks automáticos).
   */
  async switchUser(userId: string): Promise<void> {
    if (!userId) return;
    currentUserId = userId.trim();

    try {
      const [savedInv, savedRec, savedDel, savedShop] = await Promise.all([
        AsyncStorage.getItem(getStorageKey(BASE_KEY_INVENTORY, currentUserId)),
        AsyncStorage.getItem(getStorageKey(BASE_KEY_RECIPES, currentUserId)),
        AsyncStorage.getItem(getStorageKey(BASE_KEY_DELETED_RECIPES, currentUserId)),
        AsyncStorage.getItem(getStorageKey(BASE_KEY_SHOPPING_LIST, currentUserId)),
      ]);

      if (savedDel) {
        try {
          const parsed = JSON.parse(savedDel);
          deletedRecipeIds = new Set(Array.isArray(parsed) ? parsed : []);
        } catch {
          deletedRecipeIds = new Set();
        }
      } else {
        deletedRecipeIds = new Set();
      }

      const rawInv = savedInv ? JSON.parse(savedInv) : [];
      memoryInventory = Array.isArray(rawInv)
        ? rawInv.map((item: any) => {
            const { unit, quantity } = normalizeItemUnitAndQty(item?.unit, item?.quantity);
            return { ...item, unit, quantity };
          })
        : [];
      memoryRecipes = savedRec
        ? (JSON.parse(savedRec) as Recipe[]).filter((r) => !deletedRecipeIds.has(r.id))
        : [];
      const rawShop = savedShop ? JSON.parse(savedShop) : [];
      memoryShoppingList = Array.isArray(rawShop)
        ? rawShop.map((item: any) => {
            const { unit, quantity } = normalizeItemUnitAndQty(item?.unit, item?.quantity);
            return { ...item, unit, quantity };
          })
        : [];

      emitChange();
    } catch (err) {
      console.warn('[LocalStorage] Error hidratando datos de usuario:', err);
      memoryInventory = [];
      memoryRecipes = [];
      memoryShoppingList = [];
      emitChange();
    }
  },

  /**
   * Limpia solo la memoria activa al cerrar sesión.
   * Los datos namespaced en AsyncStorage se preservan intactos para el próximo inicio.
   */
  clearActiveUser(): void {
    currentUserId = null;
    memoryInventory = [];
    memoryRecipes = [];
    memoryShoppingList = [];
    deletedRecipeIds = new Set();
    emitChange();
  },

  /**
   * Carga explícita de datos de muestra para el usuario demo.
   */
  async loadDemoData(): Promise<void> {
    ensureActiveUser();
    deletedRecipeIds.clear();
    memoryInventory = [...mockIngredients];
    memoryRecipes = [...mockRecipes];
    emitChange();
    await persistToDisk();
  },

  /**
   * Limpia todos los datos de muestra o inventario del usuario actual.
   */
  async clearAllUserData(): Promise<void> {
    ensureActiveUser();
    memoryInventory = [];
    memoryRecipes = [];
    memoryShoppingList = [];
    deletedRecipeIds.clear();
    emitChange();
    await persistToDisk();
  },

  // ─── Inventario ─────────────────────────────────────────────────────────────
  async getInventory(): Promise<Ingredient[]> {
    return [...memoryInventory];
  },

  async saveInventory(items: Ingredient[]): Promise<void> {
    ensureActiveUser();
    memoryInventory = [...items];
    emitChange();
    await persistToDisk();
  },

  async addIngredient(item: Ingredient): Promise<Ingredient> {
    ensureActiveUser();
    memoryInventory = [item, ...memoryInventory];
    emitChange();
    await persistToDisk();
    return item;
  },

  async updateIngredient(updatedItem: Ingredient): Promise<Ingredient> {
    ensureActiveUser();
    memoryInventory = memoryInventory.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    emitChange();
    await persistToDisk();
    return updatedItem;
  },

  async deleteIngredient(id: string): Promise<void> {
    ensureActiveUser();
    memoryInventory = memoryInventory.filter((item) => item.id !== id);
    emitChange();
    await persistToDisk();
  },

  async deleteIngredients(ids: string[]): Promise<void> {
    ensureActiveUser();
    const idSet = new Set(ids);
    memoryInventory = memoryInventory.filter((item) => !idSet.has(item.id));
    emitChange();
    await persistToDisk();
  },

  // ─── Recetas ────────────────────────────────────────────────────────────────
  async getRecipes(): Promise<Recipe[]> {
    return memoryRecipes.filter((r) => !deletedRecipeIds.has(r.id));
  },

  async getSavedRecipes(): Promise<Recipe[]> {
    return memoryRecipes.filter((r) => r.isSaved && !deletedRecipeIds.has(r.id));
  },

  async saveRecipe(recipe: Recipe): Promise<void> {
    ensureActiveUser();
    if (deletedRecipeIds.has(recipe.id)) return;
    const recipeWithTime: Recipe = {
      ...recipe,
      createdAt: recipe.createdAt || new Date().toISOString(),
    };
    const exists = memoryRecipes.some((r) => r.id === recipe.id);
    if (exists) {
      memoryRecipes = memoryRecipes.map((r) =>
        r.id === recipe.id ? { ...r, ...recipeWithTime } : r
      );
    } else {
      memoryRecipes.unshift(recipeWithTime);
    }
    emitChange();
    await persistToDisk();
  },

  async toggleSaveRecipe(id: string): Promise<void> {
    ensureActiveUser();
    memoryRecipes = memoryRecipes.map((r) =>
      r.id === id ? { ...r, isSaved: !r.isSaved } : r
    );
    emitChange();
    await persistToDisk();
  },

  async deleteRecipe(id: string): Promise<void> {
    ensureActiveUser();
    deletedRecipeIds.add(id);
    memoryRecipes = memoryRecipes.filter((r) => r.id !== id);
    emitChange();
    await persistToDisk();
  },

  async deleteRecipes(ids: string[]): Promise<void> {
    ensureActiveUser();
    ids.forEach((id) => deletedRecipeIds.add(id));
    const idSet = new Set(ids);
    memoryRecipes = memoryRecipes.filter((r) => !idSet.has(r.id));
    emitChange();
    await persistToDisk();
  },

  async consumeIngredients(consumed: { name: string; quantity: number }[]): Promise<string[]> {
    ensureActiveUser();
    const consumedNames: string[] = [];

    consumed.forEach((req) => {
      const target = req.name.toLowerCase().trim();
      const match = memoryInventory.find((item) => {
        const current = item.name.toLowerCase().trim();
        return current.includes(target) || target.includes(current);
      });

      if (match) {
        consumedNames.push(match.name);
        const currentQty = match.quantity ?? 1;
        const toDeduct = req.quantity;

        if (currentQty > toDeduct) {
          match.quantity = Math.round((currentQty - toDeduct) * 10) / 10;
        } else {
          memoryInventory = memoryInventory.filter((item) => item.id !== match.id);
        }
      }
    });

    emitChange();
    await persistToDisk();
    return consumedNames;
  },

  // ─── Lista de Compras ────────────────────────────────────────────────────────
  async getShoppingList(): Promise<ShoppingItem[]> {
    return [...memoryShoppingList];
  },

  async saveShoppingList(items: ShoppingItem[]): Promise<void> {
    ensureActiveUser();
    memoryShoppingList = [...items];
    emitChange();
    await persistToDisk();
  },

  async addShoppingItem(item: ShoppingItem): Promise<ShoppingItem> {
    ensureActiveUser();
    memoryShoppingList = [item, ...memoryShoppingList];
    emitChange();
    await persistToDisk();
    return item;
  },

  async addShoppingItems(items: ShoppingItem[]): Promise<ShoppingItem[]> {
    ensureActiveUser();
    memoryShoppingList = [...items, ...memoryShoppingList];
    emitChange();
    await persistToDisk();
    return items;
  },

  async updateShoppingItem(updated: ShoppingItem): Promise<ShoppingItem> {
    ensureActiveUser();
    memoryShoppingList = memoryShoppingList.map((item) =>
      item.id === updated.id ? updated : item
    );
    emitChange();
    await persistToDisk();
    return updated;
  },

  async toggleBoughtItem(id: string): Promise<void> {
    ensureActiveUser();
    memoryShoppingList = memoryShoppingList.map((item) =>
      item.id === id ? { ...item, isBought: !item.isBought } : item
    );
    emitChange();
    await persistToDisk();
  },

  async deleteShoppingItem(id: string): Promise<void> {
    ensureActiveUser();
    memoryShoppingList = memoryShoppingList.filter((item) => item.id !== id);
    emitChange();
    await persistToDisk();
  },

  async deleteBoughtItems(): Promise<void> {
    ensureActiveUser();
    memoryShoppingList = memoryShoppingList.filter((item) => !item.isBought);
    emitChange();
    await persistToDisk();
  },

  /**
   * Transfiere los artículos marcados como comprados al inventario de alimentos.
   * Aplica deduplicación y fusión léxica:
   * - Si ya existe un producto similar, suma cantidades (si ambas existen) y conserva la fecha más próxima.
   * - Asigna expirationSource: "estimated" con vida útil calculada según DEFAULT_SHELF_LIFE_DAYS.
   * - Conserva quantity: null si es desconocida, sin inventar cantidades.
   */
  async moveBoughtToInventory(): Promise<number> {
    ensureActiveUser();
    const boughtItems = memoryShoppingList.filter((item) => item.isBought);
    if (boughtItems.length === 0) return 0;

    let movedCount = 0;

    for (const bought of boughtItems) {
      const match = findSimilarItem(bought.name, memoryInventory);

      const days = DEFAULT_SHELF_LIFE_DAYS[bought.category] || 14;
      const estimatedExp = new Date(Date.now() + days * 86400000)
        .toISOString()
        .split('T')[0];

      const { unit: cleanUnit, quantity: cleanQty } = normalizeItemUnitAndQty(bought.unit, bought.quantity);

      if (match && match.isExact) {
        // Fusión segura de producto existente
        const existing = match.item;
        if (existing.quantity !== null && cleanQty !== null) {
          existing.quantity = Math.round((existing.quantity + cleanQty) * 10) / 10;
        } else if (cleanQty !== null) {
          existing.quantity = cleanQty;
        }
        existing.unit = cleanUnit;

        // Conservar la fecha más próxima si ambas existen
        if (existing.expirationDate && estimatedExp) {
          existing.expirationDate =
            existing.expirationDate < estimatedExp ? existing.expirationDate : estimatedExp;
        } else {
          existing.expirationDate = estimatedExp;
        }
        existing.expirationSource = 'estimated';
      } else {
        // Producto nuevo en inventario
        const newIngredient: Ingredient = {
          id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: bought.name,
          category: bought.category,
          quantity: cleanQty, // Conserva null si es desconocida
          unit: cleanUnit,
          expirationDate: estimatedExp,
          confidence: 1.0,
          source: 'manual',
          confirmed: true,
          expirationSource: 'estimated',
        };
        memoryInventory.unshift(newIngredient);
      }
      movedCount++;
    }

    // Remover los artículos comprados de la lista de compras
    memoryShoppingList = memoryShoppingList.filter((item) => !item.isBought);

    emitChange();
    await persistToDisk();
    return movedCount;
  },

  subscribe(listener: StorageListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
