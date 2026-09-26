import { useState, useEffect, useCallback } from 'react';
import { ShoppingItem, RecipeIngredient, IngredientUnit, IngredientCategory } from '../types';
import { LocalStorage } from '../storage/local-storage';
import { findSimilarItem, normalizeItemUnitAndQty } from '../utils/text-matching';
import {
  fetchShoppingListFromApi,
  createShoppingItemWithApi,
  updateShoppingItemWithApi,
  deleteShoppingItemWithApi,
  deleteBoughtShoppingItemsWithApi,
  batchCreateShoppingItemsWithApi,
  executeDeleteWithPendingResolution,
} from '../services/api-client';
import { AuthService } from '../services/auth-service';

let memoryShoppingList: ShoppingItem[] | null = null;
let isSyncingShopping = false;

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>(memoryShoppingList || []);
  const [isLoading, setIsLoading] = useState(!memoryShoppingList);

  const loadItems = useCallback(async () => {
    const startUserId = LocalStorage.getCurrentUserId();
    if (!startUserId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Carga inmediata desde almacenamiento local namespaced
      const data = await LocalStorage.getShoppingList();
      if (LocalStorage.getCurrentUserId() !== startUserId) return;
      memoryShoppingList = data;
      setItems(data);

      // 2. Sincronización en segundo plano con deduplicación y aislamiento de usuario
      if (isSyncingShopping) return;
      isSyncingShopping = true;
      try {
        const pendingDeletedIds = LocalStorage.getPendingDeletedShopping();
        if (pendingDeletedIds.length > 0) {
          await Promise.allSettled(
            pendingDeletedIds.map((delId) =>
              executeDeleteWithPendingResolution(
                delId,
                deleteShoppingItemWithApi,
                LocalStorage.removePendingDeletedShopping,
                'Artículo de compra'
              )
            )
          );
        }

        if (LocalStorage.getCurrentUserId() !== startUserId) return;

        const remote = await fetchShoppingListFromApi();
        if (LocalStorage.getCurrentUserId() !== startUserId) return;

        if (Array.isArray(remote)) {
          const currentLocal = await LocalStorage.getShoppingList();
          const activePendingDeleted = new Set(LocalStorage.getPendingDeletedShopping());

          // Excluir cualquier ítem remoto que esté en el conjunto de eliminados pendientes
          const cleanRemote = remote.filter((item) => !activePendingDeleted.has(item.id));
          const remoteIdSet = new Set(cleanRemote.map((r) => r.id));

          const unsyncedLocal = currentLocal.filter(
            (localItem) => !remoteIdSet.has(localItem.id) && !activePendingDeleted.has(localItem.id)
          );
          const merged = [...unsyncedLocal, ...cleanRemote];

          if (LocalStorage.getCurrentUserId() !== startUserId) return;

          memoryShoppingList = merged;
          await LocalStorage.saveShoppingList(merged);
          setItems(merged);
        }
      } catch (remoteErr: any) {
        // En modo offline o si no hay red, conservamos datos locales sin romper la UI
      } finally {
        isSyncingShopping = false;
      }
    } catch {
      if (!memoryShoppingList) setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
    const unsubscribeStorage = LocalStorage.subscribe(() => {
      LocalStorage.getShoppingList().then((data) => {
        memoryShoppingList = data;
        setItems(data);
      }).catch(() => {});
    });

    const unsubscribeAuth = AuthService.subscribe((session) => {
      if (session?.accessToken && session?.user?.id) {
        loadItems();
      }
    });

    return () => {
      unsubscribeStorage();
      unsubscribeAuth();
    };
  }, [loadItems]);

  const pendingItems = items.filter((item) => !item.isBought);
  const boughtItems = items.filter((item) => item.isBought);

  /**
   * Agrega un nuevo ítem a la lista de compras y lo sincroniza con la nube.
   */
  const addItem = async (
    name: string,
    quantity: number | null = null,
    unit: IngredientUnit = 'units',
    category: IngredientCategory = 'other',
    recipeSource: string | null = null
  ): Promise<ShoppingItem> => {
    const { unit: cleanUnit, quantity: cleanQty } = normalizeItemUnitAndQty(unit, quantity);
    const newItem: ShoppingItem = {
      id: `shop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      quantity: cleanQty,
      unit: cleanUnit,
      category,
      isBought: false,
      recipeSource,
      createdAt: new Date().toISOString(),
    };
    await LocalStorage.addShoppingItem(newItem);
    await loadItems();

    // Sincronización en segundo plano
    createShoppingItemWithApi(newItem).catch((err) =>
      console.warn('[useShoppingList] Error sincronizando artículo con la nube:', err?.message)
    );

    return newItem;
  };

  /**
   * Procesa la adición inteligente de ingredientes faltantes desde una receta y los persiste en la nube.
   */
  const addFromRecipe = async (
    missingIngredients: RecipeIngredient[],
    recipeTitle: string
  ): Promise<{ addedCount: number; mergedCount: number }> => {
    let currentList = await LocalStorage.getShoppingList();
    let addedCount = 0;
    let mergedCount = 0;
    const newItemsToSync: ShoppingItem[] = [];

    for (const missing of missingIngredients) {
      const { unit: cleanUnit, quantity: cleanQty } = normalizeItemUnitAndQty(missing.unit, missing.quantity);
      const pending = currentList.filter((item) => !item.isBought);
      const match = findSimilarItem(missing.name, pending);

      if (match && match.isExact) {
        // Coincidencia exacta: fusionar sumando cantidades
        const target = match.item;
        if (target.quantity !== null && cleanQty !== null) {
          target.quantity = Math.round((target.quantity + cleanQty) * 10) / 10;
        } else if (cleanQty !== null) {
          target.quantity = cleanQty;
        }
        target.unit = cleanUnit;
        await LocalStorage.updateShoppingItem(target);
        updateShoppingItemWithApi(target.id, target).catch(() => {});
        mergedCount++;
      } else {
        // Coincidencia inexistente: crear ítem separado
        const newItem: ShoppingItem = {
          id: `shop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: missing.name,
          quantity: cleanQty,
          unit: cleanUnit,
          category: 'other',
          isBought: false,
          recipeSource: recipeTitle,
          createdAt: new Date().toISOString(),
        };
        currentList = [newItem, ...currentList];
        await LocalStorage.addShoppingItem(newItem);
        newItemsToSync.push(newItem);
        addedCount++;
      }
    }

    if (newItemsToSync.length > 0) {
      batchCreateShoppingItemsWithApi(newItemsToSync).catch((err) =>
        console.warn('[useShoppingList] Error sincronizando lote de faltantes con la nube:', err?.message)
      );
    }

    await loadItems();
    return { addedCount, mergedCount };
  };

  const toggleBought = async (id: string) => {
    const item = items.find((i) => i.id === id);
    await LocalStorage.toggleBoughtItem(id);
    await loadItems();

    if (item) {
      updateShoppingItemWithApi(id, { isBought: !item.isBought }).catch((err) =>
        console.warn('[useShoppingList] Error sincronizando estado comprado en la nube:', err?.message)
      );
    }
  };

  const deleteItem = async (id: string) => {
    await LocalStorage.deleteShoppingItem(id);
    await loadItems();
    executeDeleteWithPendingResolution(
      id,
      deleteShoppingItemWithApi,
      LocalStorage.removePendingDeletedShopping,
      'Artículo de compra'
    ).catch(() => {});
  };

  const clearBought = async () => {
    const boughtIds = items.filter((i) => i.isBought).map((i) => i.id);
    await LocalStorage.deleteBoughtItems();
    await loadItems();
    deleteBoughtShoppingItemsWithApi()
      .then(async () => {
        await Promise.allSettled(
          boughtIds.map((bid) => LocalStorage.removePendingDeletedShopping(bid))
        );
      })
      .catch(async (err) => {
        if (err?.status === 404) {
          await Promise.allSettled(
            boughtIds.map((bid) => LocalStorage.removePendingDeletedShopping(bid))
          );
        } else {
          console.warn('[useShoppingList] Error eliminando comprados en la nube:', err?.message);
        }
      });
  };

  const moveBoughtToInventory = async (): Promise<number> => {
    const boughtIds = items.filter((i) => i.isBought).map((i) => i.id);
    const moved = await LocalStorage.moveBoughtToInventory();
    await loadItems();
    deleteBoughtShoppingItemsWithApi()
      .then(async () => {
        await Promise.allSettled(
          boughtIds.map((bid) => LocalStorage.removePendingDeletedShopping(bid))
        );
      })
      .catch(async (err) => {
        if (err?.status === 404) {
          await Promise.allSettled(
            boughtIds.map((bid) => LocalStorage.removePendingDeletedShopping(bid))
          );
        }
      });
    return moved;
  };

  return {
    items,
    pendingItems,
    boughtItems,
    isLoading,
    addItem,
    addFromRecipe,
    toggleBought,
    deleteItem,
    clearBought,
    moveBoughtToInventory,
    reload: loadItems,
  };
}
