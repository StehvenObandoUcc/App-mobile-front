import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient, Recipe, ShoppingItem, IngredientCategory, OutboxMutation } from '../types';
import { findSimilarItem, normalizeItemUnitAndQty } from '../utils/text-matching';
import { addDaysISO, earliestISODate } from '../utils/dates';
import { convertQuantity } from '../utils/consumption';
import { generateOperationId } from '../utils/uuid';

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
const BASE_KEY_PENDING_DELETED_SHOPPING = '@food_ai_pending_deleted_shopping_v1';
const BASE_KEY_PENDING_DELETED_RECIPES = '@food_ai_pending_deleted_recipes_v1';
const BASE_KEY_PENDING_DELETED_INVENTORY = '@food_ai_pending_deleted_inventory_v1';
const BASE_KEY_OUTBOX = '@food_ai_outbox_v1';
const BASE_KEY_TX_MOVE_BOUGHT = '@food_ai_tx_move_bought_v1';

export interface MoveBoughtSnapshot {
  version: 1;
  timestamp: number;
  status: 'committing';
  boughtItemIds: string[];
  newIngredients: Ingredient[];
  updatedIngredients: {
    id: string;
    quantity: number | null;
    /** Unidad final (al reponer un agotado cambia). Opcional para snapshots viejos. */
    unit?: Ingredient['unit'];
    expirationDate: string | null;
    expirationSource: 'estimated';
  }[];
}

/**
 * Mutaciones del Outbox que refleja un traspaso Compras → Despensa (crear/actualizar alimentos y borrar
 * los comprados). Se guardan en la MISMA escritura que la despensa, así un cierre a mitad no pierde nada.
 * Si un ítem de compras nunca llegó al servidor (create sin intentar), se purga su cola en vez de enviar DELETE.
 */
function buildMoveOutbox(
  outbox: OutboxMutation[],
  userId: string,
  newIngredients: Ingredient[],
  updated: Ingredient[],
  boughtItemIds: string[]
): { outbox: OutboxMutation[]; purgedShoppingIds: string[] } {
  const now = Date.now();
  const mk = (entity: 'inventory' | 'shopping', action: 'create' | 'update' | 'delete', entityId: string, payload: any): OutboxMutation => ({
    operationId: generateOperationId(),
    userId,
    entity,
    action,
    entityId,
    payload,
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    attemptCount: 0,
    nextAttemptAt: 0,
  });
  const unsentCreate = (entity: string, id: string) =>
    next.find((m) => m.entity === entity && m.entityId === id && m.action === 'create' && m.attemptCount === 0 && m.status === 'pending');

  let next = [...outbox];
  const purgedShoppingIds: string[] = [];
  for (const ing of newIngredients) next.push(mk('inventory', 'create', ing.id, ing));
  for (const ing of updated) {
    const pc = unsentCreate('inventory', ing.id);
    if (pc) next = next.map((m) => (m === pc ? { ...m, payload: ing, updatedAt: now } : m));
    else next.push(mk('inventory', 'update', ing.id, ing));
  }
  for (const id of boughtItemIds) {
    if (unsentCreate('shopping', id)) {
      next = next.filter((m) => !(m.entity === 'shopping' && m.entityId === id));
      purgedShoppingIds.push(id);
    } else {
      next.push(mk('shopping', 'delete', id, { id }));
    }
  }
  return { outbox: next, purgedShoppingIds };
}

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

/**
 * Reconcilia y finaliza cualquier transacción interrumpida de moveBoughtToInventory tras un cierre forzoso.
 */
async function recoverPendingMoveBoughtTx(userId: string): Promise<void> {
  const txKey = getStorageKey(BASE_KEY_TX_MOVE_BOUGHT, userId);
  try {
    const rawTx = await AsyncStorage.getItem(txKey);
    if (!rawTx) return;

    const tx: MoveBoughtSnapshot = JSON.parse(rawTx);
    if (tx && tx.status === 'committing') {
      const [savedInv, savedShop, savedPending] = await Promise.all([
        AsyncStorage.getItem(getStorageKey(BASE_KEY_INVENTORY, userId)),
        AsyncStorage.getItem(getStorageKey(BASE_KEY_SHOPPING_LIST, userId)),
        AsyncStorage.getItem(getStorageKey(BASE_KEY_PENDING_DELETED_SHOPPING, userId)),
      ]);

      let inv: Ingredient[] = savedInv ? JSON.parse(savedInv) : [];
      let shop: ShoppingItem[] = savedShop ? JSON.parse(savedShop) : [];
      let pendingEntries: [string, number][] = savedPending ? JSON.parse(savedPending) : [];
      const pendingMap = new Map(pendingEntries);

      // 1. Asegurar que los boughtItemIds estén en pendingDeletedShopping
      tx.boughtItemIds.forEach((id) => {
        if (!pendingMap.has(id)) {
          pendingMap.set(id, tx.timestamp);
        }
      });

      // 2. Asegurar que los boughtItemIds estén fuera de shopping_list
      const boughtSet = new Set(tx.boughtItemIds);
      shop = shop.filter((item) => !boughtSet.has(item.id));

      // 3. Reconciliar nuevos ingredientes sin duplicar por ID
      const existingInvIds = new Set(inv.map((i) => i.id));
      for (const newIng of tx.newIngredients) {
        if (!existingInvIds.has(newIng.id)) {
          inv.unshift(newIng);
          existingInvIds.add(newIng.id);
        }
      }

      // 4. Reconciliar actualizaciones de ingredientes
      for (const up of tx.updatedIngredients) {
        const item = inv.find((i) => i.id === up.id);
        if (item) {
          item.quantity = up.quantity;
          if (up.unit) item.unit = up.unit;
          item.expirationDate = up.expirationDate;
          item.expirationSource = up.expirationSource;
        }
      }

      // 5. Encolar en el Outbox lo que el cierre dejó sin enviar (si la escritura atómica no alcanzó a hacerse)
      const outboxKey = getStorageKey(BASE_KEY_OUTBOX, userId);
      const savedOutbox = await AsyncStorage.getItem(outboxKey);
      const outbox: OutboxMutation[] = savedOutbox ? JSON.parse(savedOutbox) : [];
      // Si la escritura atómica sí alcanzó a guardarse, sus mutaciones ya están (creadas en el mismo instante del traspaso).
      const alreadyQueued = (id: string) => outbox.some((m) => m.entityId === id && Math.abs(m.createdAt - tx.timestamp) < 60000);
      const updatedFull = tx.updatedIngredients
        .map((up) => inv.find((i) => i.id === up.id))
        .filter((i): i is Ingredient => Boolean(i) && !alreadyQueued((i as Ingredient).id));
      const built = buildMoveOutbox(
        outbox,
        userId,
        tx.newIngredients.filter((n) => !alreadyQueued(n.id)),
        updatedFull,
        tx.boughtItemIds.filter((id) => !alreadyQueued(id))
      );
      built.purgedShoppingIds.forEach((id) => pendingMap.delete(id));
      await AsyncStorage.setItem(outboxKey, JSON.stringify(built.outbox));

      // Persistir atómicamente la reconciliación y eliminar el snapshot
      await AsyncStorage.multiSet([
        [getStorageKey(BASE_KEY_INVENTORY, userId), JSON.stringify(inv)],
        [getStorageKey(BASE_KEY_SHOPPING_LIST, userId), JSON.stringify(shop)],
        [
          getStorageKey(BASE_KEY_PENDING_DELETED_SHOPPING, userId),
          JSON.stringify(Array.from(pendingMap.entries())),
        ],
      ]);
      await AsyncStorage.removeItem(txKey);
      console.warn(
        `[LocalStorage] Transacción de moveBoughtToInventory recuperada exitosamente para usuario ${userId}.`
      );
    }
  } catch (recErr) {
    console.warn('[LocalStorage] Error en recuperación de transacción:', recErr);
  }
}

// Estado en memoria por usuario activo
let currentUserId: string | null = null;
let memoryInventory: Ingredient[] = [];
let memoryRecipes: Recipe[] = [];
let memoryShoppingList: ShoppingItem[] = [];
let deletedRecipeIds: Set<string> = new Set();
let pendingDeletedShopping: Map<string, number> = new Map();
let pendingDeletedRecipes: Map<string, number> = new Map();
let pendingDeletedInventory: Map<string, number> = new Map();
let memoryOutbox: OutboxMutation[] = [];

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

type StoreKey =
  | 'inventory'
  | 'recipes'
  | 'deleted_recipes'
  | 'shopping_list'
  | 'pending_deleted_shopping'
  | 'pending_deleted_recipes'
  | 'pending_deleted_inventory'
  | 'outbox';
const pendingStores = new Set<StoreKey>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

async function flushPendingSaves(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (!currentUserId || pendingStores.size === 0) return;

  const uid = currentUserId;
  const storesToPersist = Array.from(pendingStores);
  pendingStores.clear();

  const tasks: Promise<any>[] = [];
  for (const store of storesToPersist) {
    if (store === 'inventory') {
      tasks.push(
        AsyncStorage.setItem(getStorageKey(BASE_KEY_INVENTORY, uid), JSON.stringify(memoryInventory))
      );
    } else if (store === 'recipes') {
      tasks.push(
        AsyncStorage.setItem(getStorageKey(BASE_KEY_RECIPES, uid), JSON.stringify(memoryRecipes))
      );
    } else if (store === 'deleted_recipes') {
      tasks.push(
        AsyncStorage.setItem(
          getStorageKey(BASE_KEY_DELETED_RECIPES, uid),
          JSON.stringify(Array.from(deletedRecipeIds))
        )
      );
    } else if (store === 'shopping_list') {
      tasks.push(
        AsyncStorage.setItem(
          getStorageKey(BASE_KEY_SHOPPING_LIST, uid),
          JSON.stringify(memoryShoppingList)
        )
      );
    } else if (store === 'pending_deleted_shopping') {
      tasks.push(
        AsyncStorage.setItem(
          getStorageKey(BASE_KEY_PENDING_DELETED_SHOPPING, uid),
          JSON.stringify(Array.from(pendingDeletedShopping.entries()))
        )
      );
    } else if (store === 'pending_deleted_recipes') {
      tasks.push(
        AsyncStorage.setItem(
          getStorageKey(BASE_KEY_PENDING_DELETED_RECIPES, uid),
          JSON.stringify(Array.from(pendingDeletedRecipes.entries()))
        )
      );
    } else if (store === 'pending_deleted_inventory') {
      tasks.push(
        AsyncStorage.setItem(
          getStorageKey(BASE_KEY_PENDING_DELETED_INVENTORY, uid),
          JSON.stringify(Array.from(pendingDeletedInventory.entries()))
        )
      );
    } else if (store === 'outbox') {
      tasks.push(
        AsyncStorage.setItem(
          getStorageKey(BASE_KEY_OUTBOX, uid),
          JSON.stringify(memoryOutbox)
        )
      );
    }
  }

  try {
    await Promise.all(tasks);
  } catch (err) {
    console.warn('[LocalStorage] Error persistiendo tiendas a AsyncStorage:', err);
  }
}

function schedulePersist(store: StoreKey): void {
  ensureActiveUser();
  pendingStores.add(store);
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    flushPendingSaves().catch(() => {});
  }, 50);
}

async function persistToDisk(): Promise<void> {
  pendingStores.add('inventory');
  pendingStores.add('recipes');
  pendingStores.add('deleted_recipes');
  pendingStores.add('shopping_list');
  pendingStores.add('pending_deleted_shopping');
  pendingStores.add('pending_deleted_recipes');
  pendingStores.add('pending_deleted_inventory');
  pendingStores.add('outbox');
  await flushPendingSaves();
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
    await flushPendingSaves();
    currentUserId = userId.trim();
    await recoverPendingMoveBoughtTx(currentUserId);

    try {
      const [savedInv, savedRec, savedDel, savedShop, savedPendingShop, savedPendingRec, savedPendingInv, savedOutbox] = await Promise.all([
        AsyncStorage.getItem(getStorageKey(BASE_KEY_INVENTORY, currentUserId)),
        AsyncStorage.getItem(getStorageKey(BASE_KEY_RECIPES, currentUserId)),
        AsyncStorage.getItem(getStorageKey(BASE_KEY_DELETED_RECIPES, currentUserId)),
        AsyncStorage.getItem(getStorageKey(BASE_KEY_SHOPPING_LIST, currentUserId)),
        AsyncStorage.getItem(getStorageKey(BASE_KEY_PENDING_DELETED_SHOPPING, currentUserId)),
        AsyncStorage.getItem(getStorageKey(BASE_KEY_PENDING_DELETED_RECIPES, currentUserId)),
        AsyncStorage.getItem(getStorageKey(BASE_KEY_PENDING_DELETED_INVENTORY, currentUserId)),
        AsyncStorage.getItem(getStorageKey(BASE_KEY_OUTBOX, currentUserId)),
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

      if (savedPendingShop) {
        try {
          const parsed = JSON.parse(savedPendingShop);
          pendingDeletedShopping = new Map(Array.isArray(parsed) ? parsed : []);
        } catch {
          pendingDeletedShopping = new Map();
        }
      } else {
        pendingDeletedShopping = new Map();
      }

      if (savedPendingRec) {
        try {
          const parsed = JSON.parse(savedPendingRec);
          pendingDeletedRecipes = new Map(Array.isArray(parsed) ? parsed : []);
        } catch {
          pendingDeletedRecipes = new Map();
        }
      } else {
        pendingDeletedRecipes = new Map();
      }

      if (savedPendingInv) {
        try {
          const parsed = JSON.parse(savedPendingInv);
          pendingDeletedInventory = new Map(Array.isArray(parsed) ? parsed : []);
        } catch {
          pendingDeletedInventory = new Map();
        }
      } else {
        pendingDeletedInventory = new Map();
      }

      if (savedOutbox) {
        try {
          const parsed = JSON.parse(savedOutbox);
          memoryOutbox = Array.isArray(parsed)
            ? parsed.map((m: OutboxMutation) =>
                m.status === 'processing'
                  ? { ...m, status: 'pending' as const, updatedAt: Date.now() }
                  : m
              )
            : [];
        } catch {
          memoryOutbox = [];
        }
      } else {
        memoryOutbox = [];
      }

      const rawInv = savedInv ? JSON.parse(savedInv) : [];
      memoryInventory = Array.isArray(rawInv)
        ? rawInv
            .filter((item: any) => !pendingDeletedInventory.has(item?.id))
            .map((item: any) => {
              const { unit, quantity } = normalizeItemUnitAndQty(item?.unit, item?.quantity);
              return { ...item, unit, quantity };
            })
        : [];
      memoryRecipes = savedRec
        ? (JSON.parse(savedRec) as Recipe[]).filter(
            (r) => !deletedRecipeIds.has(r.id) && !pendingDeletedRecipes.has(r.id)
          )
        : [];
      const rawShop = savedShop ? JSON.parse(savedShop) : [];
      memoryShoppingList = Array.isArray(rawShop)
        ? rawShop
            .filter((item: any) => !pendingDeletedShopping.has(item?.id))
            .map((item: any) => {
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
      pendingDeletedShopping = new Map();
      pendingDeletedRecipes = new Map();
      pendingDeletedInventory = new Map();
      memoryOutbox = [];
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
    pendingDeletedShopping = new Map();
    pendingDeletedRecipes = new Map();
    pendingDeletedInventory = new Map();
    memoryOutbox = [];
    emitChange();
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
    pendingDeletedShopping.clear();
    pendingDeletedRecipes.clear();
    pendingDeletedInventory.clear();
    memoryOutbox = [];
    emitChange();
    await persistToDisk();
  },

  // ─── Inventario ─────────────────────────────────────────────────────────────
  async getInventory(): Promise<Ingredient[]> {
    return memoryInventory.filter((item) => !pendingDeletedInventory.has(item.id));
  },

  async saveInventory(items: Ingredient[]): Promise<void> {
    ensureActiveUser();
    memoryInventory = items.filter((item) => !pendingDeletedInventory.has(item.id));
    emitChange();
    schedulePersist('inventory');
  },

  async addIngredient(item: Ingredient): Promise<Ingredient> {
    ensureActiveUser();
    memoryInventory = [item, ...memoryInventory];
    emitChange();
    schedulePersist('inventory');
    return item;
  },

  async updateIngredient(updatedItem: Ingredient): Promise<Ingredient> {
    ensureActiveUser();
    memoryInventory = memoryInventory.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    emitChange();
    schedulePersist('inventory');
    return updatedItem;
  },

  async deleteIngredient(id: string): Promise<void> {
    ensureActiveUser();
    pendingDeletedInventory.set(id, Date.now());
    memoryInventory = memoryInventory.filter((item) => item.id !== id);
    emitChange();
    schedulePersist('inventory');
    schedulePersist('pending_deleted_inventory');
  },

  async deleteIngredients(ids: string[]): Promise<void> {
    ensureActiveUser();
    ids.forEach((id) => pendingDeletedInventory.set(id, Date.now()));
    const idSet = new Set(ids);
    memoryInventory = memoryInventory.filter((item) => !idSet.has(item.id));
    emitChange();
    schedulePersist('inventory');
    schedulePersist('pending_deleted_inventory');
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
    schedulePersist('recipes');
  },

  async toggleSaveRecipe(id: string): Promise<void> {
    ensureActiveUser();
    memoryRecipes = memoryRecipes.map((r) =>
      r.id === id ? { ...r, isSaved: !r.isSaved } : r
    );
    emitChange();
    schedulePersist('recipes');
  },

  async deleteRecipe(id: string): Promise<void> {
    ensureActiveUser();
    deletedRecipeIds.add(id);
    pendingDeletedRecipes.set(id, Date.now());
    memoryRecipes = memoryRecipes.filter((r) => r.id !== id);
    emitChange();
    schedulePersist('recipes');
    schedulePersist('deleted_recipes');
    schedulePersist('pending_deleted_recipes');
  },

  async deleteRecipes(ids: string[]): Promise<void> {
    ensureActiveUser();
    ids.forEach((id) => {
      deletedRecipeIds.add(id);
      pendingDeletedRecipes.set(id, Date.now());
    });
    const idSet = new Set(ids);
    memoryRecipes = memoryRecipes.filter((r) => !idSet.has(r.id));
    emitChange();
    schedulePersist('recipes');
    schedulePersist('deleted_recipes');
    schedulePersist('pending_deleted_recipes');
  },

  // ─── Lista de Compras ────────────────────────────────────────────────────────
  async getShoppingList(): Promise<ShoppingItem[]> {
    return [...memoryShoppingList];
  },

  async saveShoppingList(items: ShoppingItem[]): Promise<void> {
    ensureActiveUser();
    memoryShoppingList = [...items];
    emitChange();
    schedulePersist('shopping_list');
  },

  async addShoppingItem(item: ShoppingItem): Promise<ShoppingItem> {
    ensureActiveUser();
    memoryShoppingList = [item, ...memoryShoppingList];
    emitChange();
    schedulePersist('shopping_list');
    return item;
  },

  async addShoppingItems(items: ShoppingItem[]): Promise<ShoppingItem[]> {
    ensureActiveUser();
    memoryShoppingList = [...items, ...memoryShoppingList];
    emitChange();
    schedulePersist('shopping_list');
    return items;
  },

  async updateShoppingItem(updated: ShoppingItem): Promise<ShoppingItem> {
    ensureActiveUser();
    memoryShoppingList = memoryShoppingList.map((item) =>
      item.id === updated.id ? updated : item
    );
    emitChange();
    schedulePersist('shopping_list');
    return updated;
  },

  async toggleBoughtItem(id: string): Promise<void> {
    ensureActiveUser();
    memoryShoppingList = memoryShoppingList.map((item) =>
      item.id === id ? { ...item, isBought: !item.isBought } : item
    );
    emitChange();
    schedulePersist('shopping_list');
  },

  async deleteShoppingItem(id: string): Promise<void> {
    ensureActiveUser();
    pendingDeletedShopping.set(id, Date.now());
    memoryShoppingList = memoryShoppingList.filter((item) => item.id !== id);
    emitChange();
    schedulePersist('shopping_list');
    schedulePersist('pending_deleted_shopping');
  },

  async deleteBoughtItems(): Promise<void> {
    ensureActiveUser();
    const bought = memoryShoppingList.filter((item) => item.isBought);
    bought.forEach((item) => pendingDeletedShopping.set(item.id, Date.now()));
    memoryShoppingList = memoryShoppingList.filter((item) => !item.isBought);
    emitChange();
    schedulePersist('shopping_list');
    schedulePersist('pending_deleted_shopping');
  },

  /**
   * Transfiere los artículos marcados como comprados al inventario de alimentos.
   * Aplica deduplicación y fusión léxica:
   * - Si ya existe un producto similar, suma cantidades (si ambas existen) y conserva la fecha más próxima.
   * - Asigna expirationSource: "estimated" con vida útil calculada según DEFAULT_SHELF_LIFE_DAYS.
   * - Conserva quantity: null si es desconocida, sin inventar cantidades.
   */
  /** `shelfDays`: días de vencimiento de Configuración; null/undefined = automático según el tipo. */
  async moveBoughtToInventory(shelfDays?: number | null): Promise<number> {
    ensureActiveUser();
    const uid = currentUserId!;
    const boughtItems = memoryShoppingList.filter((item) => item.isBought);
    if (boughtItems.length === 0) return 0;

    let movedCount = 0;
    const newIngredients: Ingredient[] = [];
    const updatedIngredients: MoveBoughtSnapshot['updatedIngredients'] = [];

    // Clonar lista actual para mutación inmutable
    const nextInventory: Ingredient[] = memoryInventory.map((item) => ({ ...item }));

    for (const bought of boughtItems) {
      const match = findSimilarItem(bought.name, nextInventory);

      const days = shelfDays ?? (DEFAULT_SHELF_LIFE_DAYS[bought.category] || 14);
      // Día local (no UTC): con toISOString() después de las 7 p. m. en Colombia salía un día adelantado.
      const estimatedExp = addDaysISO(days);

      const { unit: cleanUnit, quantity: cleanQty } = normalizeItemUnitAndQty(bought.unit, bought.quantity);

      // Se suma solo si las unidades son compatibles (g↔kg, ml↔L); si no, entra como alimento aparte.
      const existingForMerge = match && match.isExact ? match.item : null;
      const restocking = existingForMerge !== null && (existingForMerge.quantity === null || existingForMerge.quantity === 0);
      const extra =
        existingForMerge && cleanQty !== null && !restocking
          ? convertQuantity(cleanQty, cleanUnit, existingForMerge.unit)
          : null;
      const canMerge = existingForMerge !== null && (restocking || cleanQty === null || extra !== null);

      if (existingForMerge && canMerge) {
        const existing = existingForMerge;
        if (restocking) {
          // Estaba agotado («Sin stock»): se repone con la cantidad, unidad y fecha nuevas.
          existing.quantity = cleanQty;
          existing.unit = cleanUnit;
          existing.expirationDate = estimatedExp;
        } else {
          if (extra !== null && existing.quantity !== null) {
            existing.quantity = Math.round((existing.quantity + extra) * 1000) / 1000;
          }
          // Conservar la fecha más próxima si ambas existen (texto ISO: sin pasar por UTC)
          existing.expirationDate = earliestISODate(existing.expirationDate, estimatedExp);
        }
        existing.expirationSource = 'estimated';

        updatedIngredients.push({
          id: existing.id,
          quantity: existing.quantity,
          unit: existing.unit,
          expirationDate: existing.expirationDate,
          expirationSource: 'estimated',
        });
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
        nextInventory.unshift(newIngredient);
        newIngredients.push(newIngredient);
      }
      movedCount++;
    }

    const boughtItemIds = boughtItems.map((b) => b.id);
    const nextShoppingList = memoryShoppingList.filter((item) => !item.isBought);
    const updatedFull = updatedIngredients
      .map((u) => nextInventory.find((i) => i.id === u.id))
      .filter((i): i is Ingredient => Boolean(i));
    const { outbox: nextOutbox, purgedShoppingIds } = buildMoveOutbox(memoryOutbox, uid, newIngredients, updatedFull, boughtItemIds);
    const nextPendingDeletedShopping = new Map(pendingDeletedShopping);
    boughtItemIds
      .filter((id) => !purgedShoppingIds.includes(id))
      .forEach((id) => nextPendingDeletedShopping.set(id, Date.now()));

    const txKey = getStorageKey(BASE_KEY_TX_MOVE_BOUGHT, uid);
    const tx: MoveBoughtSnapshot = {
      version: 1,
      timestamp: Date.now(),
      status: 'committing',
      boughtItemIds,
      newIngredients,
      updatedIngredients,
    };

    // 1. Snapshot previo de transacción para recuperación tras fallo/cierre
    await AsyncStorage.setItem(txKey, JSON.stringify(tx));

    // 2. Persistencia coordinada multiSet (transaccional a nivel de almacenamiento)
    await AsyncStorage.multiSet([
      [getStorageKey(BASE_KEY_INVENTORY, uid), JSON.stringify(nextInventory)],
      [getStorageKey(BASE_KEY_SHOPPING_LIST, uid), JSON.stringify(nextShoppingList)],
      [
        getStorageKey(BASE_KEY_PENDING_DELETED_SHOPPING, uid),
        JSON.stringify(Array.from(nextPendingDeletedShopping.entries())),
      ],
      // El Outbox va en la misma escritura: despensa, compras y envíos al servidor quedan juntos.
      [getStorageKey(BASE_KEY_OUTBOX, uid), JSON.stringify(nextOutbox)],
    ]);

    // 3. Limpiar snapshot una vez confirmadas las escrituras
    await AsyncStorage.removeItem(txKey);

    // 4. Actualizar memoria y emitir cambios
    memoryInventory = nextInventory;
    memoryShoppingList = nextShoppingList;
    pendingDeletedShopping = nextPendingDeletedShopping;
    memoryOutbox = nextOutbox;

    emitChange();
    return movedCount;
  },

  // ─── Control de Eliminaciones Pendientes (Anti-Zombie) ──────────────────────
  async addPendingDeletedShopping(id: string): Promise<void> {
    ensureActiveUser();
    pendingDeletedShopping.set(id, Date.now());
    schedulePersist('pending_deleted_shopping');
  },

  getPendingDeletedShopping(): string[] {
    return Array.from(pendingDeletedShopping.keys());
  },

  getPendingDeletedShoppingEntries(): [string, number][] {
    return Array.from(pendingDeletedShopping.entries());
  },

  async removePendingDeletedShopping(id: string): Promise<void> {
    ensureActiveUser();
    if (pendingDeletedShopping.has(id)) {
      pendingDeletedShopping.delete(id);
      schedulePersist('pending_deleted_shopping');
    }
  },

  async addPendingDeletedRecipe(id: string): Promise<void> {
    ensureActiveUser();
    pendingDeletedRecipes.set(id, Date.now());
    schedulePersist('pending_deleted_recipes');
  },

  getPendingDeletedRecipes(): string[] {
    return Array.from(pendingDeletedRecipes.keys());
  },

  getPendingDeletedRecipesEntries(): [string, number][] {
    return Array.from(pendingDeletedRecipes.entries());
  },

  async removePendingDeletedRecipe(id: string): Promise<void> {
    ensureActiveUser();
    if (pendingDeletedRecipes.has(id)) {
      pendingDeletedRecipes.delete(id);
      schedulePersist('pending_deleted_recipes');
    }
  },

  async addPendingDeletedInventory(id: string): Promise<void> {
    ensureActiveUser();
    pendingDeletedInventory.set(id, Date.now());
    schedulePersist('pending_deleted_inventory');
  },

  getPendingDeletedInventory(): string[] {
    return Array.from(pendingDeletedInventory.keys());
  },

  getPendingDeletedInventoryEntries(): [string, number][] {
    return Array.from(pendingDeletedInventory.entries());
  },

  async removePendingDeletedInventory(id: string): Promise<void> {
    ensureActiveUser();
    if (pendingDeletedInventory.has(id)) {
      pendingDeletedInventory.delete(id);
      schedulePersist('pending_deleted_inventory');
    }
  },

  // ─── Cola de Mutaciones Offline (Outbox Pattern) ───────────────────────────
  getOutboxQueue(): OutboxMutation[] {
    return [...memoryOutbox];
  },

  async enqueueOutboxMutation(mutation: OutboxMutation): Promise<void> {
    ensureActiveUser();
    if (mutation.userId !== currentUserId) {
      throw new Error('Aislamiento de outbox violado: userId no coincide con la sesión activa');
    }
    memoryOutbox = [...memoryOutbox, mutation];
    emitChange();
    schedulePersist('outbox');
  },

  async updateOutboxMutation(
    operationId: string,
    updates: Partial<OutboxMutation>
  ): Promise<void> {
    ensureActiveUser();
    memoryOutbox = memoryOutbox.map((m) =>
      m.operationId === operationId
        ? { ...m, ...updates, updatedAt: Date.now() }
        : m
    );
    emitChange();
    schedulePersist('outbox');
  },

  async removeOutboxMutation(operationId: string): Promise<void> {
    ensureActiveUser();
    memoryOutbox = memoryOutbox.filter((m) => m.operationId !== operationId);
    emitChange();
    schedulePersist('outbox');
  },

  async clearOutboxQueue(): Promise<void> {
    ensureActiveUser();
    memoryOutbox = [];
    emitChange();
    schedulePersist('outbox');
  },

  async recoverProcessingOutbox(): Promise<void> {
    ensureActiveUser();
    let hasChanges = false;
    memoryOutbox = memoryOutbox.map((m) => {
      if (m.status === 'processing') {
        hasChanges = true;
        return { ...m, status: 'pending' as const, updatedAt: Date.now() };
      }
      return m;
    });
    if (hasChanges) {
      emitChange();
      schedulePersist('outbox');
    }
  },

  subscribe(listener: StorageListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
