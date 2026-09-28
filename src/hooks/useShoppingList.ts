import { useState, useEffect, useCallback } from 'react';
import { ShoppingItem, RecipeIngredient, IngredientUnit, IngredientCategory, OutboxMutation } from '../types';
import { LocalStorage } from '../storage/local-storage';
import { findSimilarItem, normalizeItemUnitAndQty } from '../utils/text-matching';
import {
  fetchShoppingListFromApi,
} from '../services/api-client';
import { AuthService } from '../services/auth-service';
import { generateOperationId } from '../utils/uuid';
import { flushOutbox } from '../services/outbox-dispatcher';

let memoryShoppingList: ShoppingItem[] | null = null;
let isSyncingShopping = false;

/**
 * Compacta un UPDATE en un CREATE previo no enviado (attemptCount === 0),
 * o encola una mutación durable de tipo 'update' en el Outbox.
 */
async function queueOrCompactShoppingUpdate(
  id: string,
  updates: Partial<ShoppingItem>,
  userId: string
): Promise<void> {
  const queue = LocalStorage.getOutboxQueue();
  const pendingCreate = queue.find(
    (m) =>
      m.entity === 'shopping' &&
      m.entityId === id &&
      m.action === 'create' &&
      m.attemptCount === 0 &&
      m.status === 'pending'
  );

  if (pendingCreate) {
    await LocalStorage.updateOutboxMutation(pendingCreate.operationId, {
      payload: { ...pendingCreate.payload, ...updates },
    });
  } else {
    const mutation: OutboxMutation<Partial<ShoppingItem>> = {
      operationId: generateOperationId(),
      userId,
      entity: 'shopping',
      action: 'update',
      entityId: id,
      payload: updates,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: 0,
    };
    await LocalStorage.enqueueOutboxMutation(mutation);
  }
}

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

      // Disparar procesamiento de la cola Outbox secuencial FIFO en segundo plano
      flushOutbox().catch(() => {});

      // 2. Sincronización en segundo plano con deduplicación y aislamiento de usuario
      if (isSyncingShopping) return;
      isSyncingShopping = true;
      try {
        const remote = await fetchShoppingListFromApi();
        if (LocalStorage.getCurrentUserId() !== startUserId) return;

        if (Array.isArray(remote)) {
          const currentLocal = await LocalStorage.getShoppingList();
          const activePendingDeleted = new Set(LocalStorage.getPendingDeletedShopping());
          const outboxQueue = LocalStorage.getOutboxQueue();
          const pendingUpdateIds = new Set(
            outboxQueue
              .filter(
                (m) =>
                  m.entity === 'shopping' &&
                  m.action === 'update' &&
                  (m.status === 'pending' || m.status === 'processing')
              )
              .map((m) => m.entityId)
          );

          // Excluir cualquier ítem remoto que esté en el conjunto de eliminados pendientes (anti-zombies)
          const cleanRemote = remote.filter((item) => !activePendingDeleted.has(item.id));
          const remoteIdSet = new Set(cleanRemote.map((r) => r.id));

          // Preservar elementos locales creados offline que aún no han sido sincronizados al servidor
          const unsyncedLocal = currentLocal.filter(
            (localItem) => !remoteIdSet.has(localItem.id) && !activePendingDeleted.has(localItem.id)
          );

          // Proteger ediciones locales pendientes (incluyendo toggleBought) frente a GET remoto
          const localMap = new Map(currentLocal.map((item) => [item.id, item]));
          const mergedRemote = cleanRemote.map((remoteItem) => {
            if (pendingUpdateIds.has(remoteItem.id)) {
              const localVersion = localMap.get(remoteItem.id);
              if (localVersion) return localVersion;
            }
            return remoteItem;
          });

          const merged = [...unsyncedLocal, ...mergedRemote];

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
   * Agrega un nuevo ítem a la lista de compras mediante mutación Outbox durable.
   */
  const addItem = async (
    name: string,
    quantity: number | null = null,
    unit: IngredientUnit = 'units',
    category: IngredientCategory = 'other',
    recipeSource: string | null = null
  ): Promise<ShoppingItem> => {
    const startUserId = LocalStorage.getCurrentUserId();
    if (!startUserId) throw new Error('No hay usuario autenticado');

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

    // Encolar mutación durable de creación en Outbox (reemplaza llamada HTTP directa)
    const mutation: OutboxMutation<ShoppingItem> = {
      operationId: generateOperationId(),
      userId: startUserId,
      entity: 'shopping',
      action: 'create',
      entityId: newItem.id,
      payload: newItem,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: 0,
    };
    await LocalStorage.enqueueOutboxMutation(mutation);

    flushOutbox().catch(() => {});

    return newItem;
  };

  /**
   * Actualiza un ítem de la lista de compras mediante Outbox durable.
   */
  const updateItem = async (item: ShoppingItem) => {
    const startUserId = LocalStorage.getCurrentUserId();
    if (!startUserId) throw new Error('No hay usuario autenticado');

    await LocalStorage.updateShoppingItem(item);
    await loadItems();

    await queueOrCompactShoppingUpdate(item.id, item, startUserId);
    flushOutbox().catch(() => {});
  };

  /**
   * Procesa la adición inteligente de ingredientes faltantes desde una receta y los encola en el Outbox.
   */
  const addFromRecipe = async (
    missingIngredients: RecipeIngredient[],
    recipeTitle: string
  ): Promise<{ addedCount: number; mergedCount: number }> => {
    const startUserId = LocalStorage.getCurrentUserId();
    if (!startUserId) throw new Error('No hay usuario autenticado');

    let currentList = await LocalStorage.getShoppingList();
    let addedCount = 0;
    let mergedCount = 0;

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

        await queueOrCompactShoppingUpdate(target.id, target, startUserId);
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

        const mutation: OutboxMutation<ShoppingItem> = {
          operationId: generateOperationId(),
          userId: startUserId,
          entity: 'shopping',
          action: 'create',
          entityId: newItem.id,
          payload: newItem,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'pending',
          attemptCount: 0,
          nextAttemptAt: 0,
        };
        await LocalStorage.enqueueOutboxMutation(mutation);
        addedCount++;
      }
    }

    await loadItems();
    flushOutbox().catch(() => {});
    return { addedCount, mergedCount };
  };

  const toggleBought = async (id: string) => {
    const startUserId = LocalStorage.getCurrentUserId();
    if (!startUserId) throw new Error('No hay usuario autenticado');

    const item = items.find((i) => i.id === id);
    if (!item) return;

    const nextBought = !item.isBought;
    await LocalStorage.toggleBoughtItem(id);
    await loadItems();

    await queueOrCompactShoppingUpdate(id, { isBought: nextBought }, startUserId);
    flushOutbox().catch(() => {});
  };

/**
 * Encola una mutación DELETE en el Outbox para un ID o compacta si era un CREATE no intentado.
 */
async function queueOrCompactShoppingDelete(id: string, userId: string): Promise<void> {
  const queue = LocalStorage.getOutboxQueue();
  const pendingCreate = queue.find(
    (m) =>
      m.entity === 'shopping' &&
      m.entityId === id &&
      m.action === 'create' &&
      m.attemptCount === 0 &&
      m.status === 'pending'
  );

  if (pendingCreate) {
    for (const m of queue) {
      if (m.entity === 'shopping' && m.entityId === id) {
        await LocalStorage.removeOutboxMutation(m.operationId);
      }
    }
    await LocalStorage.removePendingDeletedShopping(id).catch(() => {});
  } else {
    // Si ya existe un DELETE pendiente en cola para este ID, no duplicarlo
    const alreadyQueued = queue.some(
      (m) =>
        m.entity === 'shopping' &&
        m.entityId === id &&
        m.action === 'delete' &&
        (m.status === 'pending' || m.status === 'processing')
    );
    if (!alreadyQueued) {
      const mutation: OutboxMutation<{ id: string }> = {
        operationId: generateOperationId(),
        userId,
        entity: 'shopping',
        action: 'delete',
        entityId: id,
        payload: { id },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'pending',
        attemptCount: 0,
        nextAttemptAt: 0,
      };
      await LocalStorage.enqueueOutboxMutation(mutation);
    }
  }
}

  const deleteItem = async (id: string) => {
    const startUserId = LocalStorage.getCurrentUserId();
    if (!startUserId) throw new Error('No hay usuario autenticado');

    try {
      // Optimista: elimina en local y marca en pendingDeletedShopping (tombstone)
      await LocalStorage.deleteShoppingItem(id);
      await loadItems();

      await queueOrCompactShoppingDelete(id, startUserId);
      flushOutbox().catch(() => {});
    } catch (err: any) {
      console.warn('[useShoppingList] Error eliminando artículo de compras:', err?.message);
      throw err;
    }
  };

  const clearBought = async () => {
    const startUserId = LocalStorage.getCurrentUserId();
    if (!startUserId) throw new Error('No hay usuario autenticado');

    try {
      const currentList = await LocalStorage.getShoppingList();
      const boughtIds = currentList.filter((i) => i.isBought).map((i) => i.id);
      if (boughtIds.length === 0) return;

      // 1. Actualización local optimista y tombstones
      await LocalStorage.deleteBoughtItems();
      await loadItems();

      // 2. Encolar mutación DELETE individual por cada ID en el Outbox
      for (const bid of boughtIds) {
        await queueOrCompactShoppingDelete(bid, startUserId);
      }

      // 3. Despacho único en segundo plano
      flushOutbox().catch(() => {});
    } catch (err: any) {
      console.warn('[useShoppingList] Error en clearBought:', err?.message);
      throw err;
    }
  };

  const moveBoughtToInventory = async (): Promise<number> => {
    const startUserId = LocalStorage.getCurrentUserId();
    if (!startUserId) throw new Error('No hay usuario autenticado');

    try {
      const currentList = await LocalStorage.getShoppingList();
      const boughtIds = currentList.filter((i) => i.isBought).map((i) => i.id);
      if (boughtIds.length === 0) return 0;

      // 1. Transferencia atómica local compras -> inventario (preserva snapshot e idempotencia)
      const moved = await LocalStorage.moveBoughtToInventory();
      await loadItems();

      // 2. Encolar mutación DELETE individual por cada artículo de compras transferido
      for (const bid of boughtIds) {
        await queueOrCompactShoppingDelete(bid, startUserId);
      }

      // 3. Despacho único en segundo plano
      flushOutbox().catch(() => {});

      return moved;
    } catch (err: any) {
      console.warn('[useShoppingList] Error en moveBoughtToInventory:', err?.message);
      throw err;
    }
  };

  return {
    items,
    pendingItems,
    boughtItems,
    isLoading,
    addItem,
    updateItem,
    addFromRecipe,
    toggleBought,
    deleteItem,
    clearBought,
    moveBoughtToInventory,
    reload: loadItems,
  };
}
