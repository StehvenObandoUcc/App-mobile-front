import { useState, useEffect, useCallback } from 'react';
import { AsyncStatus, Ingredient, OutboxMutation } from '../types';
import { LocalStorage } from '../storage/local-storage';
import {
  fetchInventoryFromApi,
  deleteInventoryItemWithApi,
  executeDeleteWithPendingResolution,
} from '../services/api-client';
import { AuthService } from '../services/auth-service';
import { generateOperationId } from '../utils/uuid';
import { flushOutbox } from '../services/outbox-dispatcher';

let memoryInventory: Ingredient[] | null = null;
let isSyncingInventory = false;

export function useInventory() {
  const [items, setItems] = useState<Ingredient[]>(memoryInventory || []);
  const [status, setStatus] = useState<AsyncStatus>(
    memoryInventory && memoryInventory.length > 0 ? 'success' : 'loading'
  );
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const startUserId = LocalStorage.getCurrentUserId();
    if (!startUserId) {
      setItems([]);
      setStatus('success');
      return;
    }

    setError(null);
    try {
      // 1. Carga inmediata desde almacenamiento local namespaced para respuesta instantánea (0ms)
      const localData = await LocalStorage.getInventory();
      if (LocalStorage.getCurrentUserId() !== startUserId) return;

      if (localData && localData.length > 0) {
        memoryInventory = localData;
        setItems(localData);
        setStatus('success');
      } else if (!memoryInventory) {
        setStatus('loading');
      }

      // Disparar procesamiento de la cola Outbox secuencial FIFO en segundo plano
      flushOutbox().catch(() => {});

      // 2. Sincronización en red con deduplicación y aislamiento estricto de usuario
      if (isSyncingInventory) return;
      isSyncingInventory = true;
      try {
        // Resolver cualquier eliminación pendiente de inventario previa
        const pendingDeletedIds = LocalStorage.getPendingDeletedInventory();
        if (pendingDeletedIds.length > 0) {
          await Promise.allSettled(
            pendingDeletedIds.map((delId) =>
              executeDeleteWithPendingResolution(
                delId,
                deleteInventoryItemWithApi,
                LocalStorage.removePendingDeletedInventory,
                'Alimento de inventario'
              )
            )
          );
        }

        if (LocalStorage.getCurrentUserId() !== startUserId) return;

        const remoteData = await fetchInventoryFromApi();
        if (LocalStorage.getCurrentUserId() !== startUserId) return;

        if (Array.isArray(remoteData)) {
          const currentLocal = await LocalStorage.getInventory();
          const activePendingDeleted = new Set(LocalStorage.getPendingDeletedInventory());
          const outboxQueue = LocalStorage.getOutboxQueue();
          const pendingUpdateIds = new Set(
            outboxQueue
              .filter(
                (m) =>
                  m.entity === 'inventory' &&
                  m.action === 'update' &&
                  (m.status === 'pending' || m.status === 'processing')
              )
              .map((m) => m.entityId)
          );

          // Excluir cualquier ítem remoto que esté en el conjunto de eliminados pendientes (anti-zombies)
          const cleanRemote = remoteData.filter((item) => !activePendingDeleted.has(item.id));
          const remoteIdSet = new Set(cleanRemote.map((r) => r.id));

          // Preservar elementos locales creados offline (o transferidos con moveBoughtToInventory)
          // que aún no han sido sincronizados al servidor y no están eliminados
          const unsyncedLocal = currentLocal.filter(
            (localItem) => !remoteIdSet.has(localItem.id) && !activePendingDeleted.has(localItem.id)
          );

          // Proteger ediciones locales pendientes para entidades preexistentes
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

          memoryInventory = merged;
          await LocalStorage.saveInventory(merged);
          setItems(merged);
        }
      } catch (networkErr: any) {
        // En modo offline conservamos la caché local sin romper la UI
        console.warn('[useInventory] Modo offline/fallback: usando datos locales', networkErr?.message);
        if (!localData || localData.length === 0) {
          if (!memoryInventory) setItems([]);
        }
      } finally {
        isSyncingInventory = false;
      }

      setStatus('success');
    } catch (err: any) {
      if (LocalStorage.getCurrentUserId() === startUserId) {
        setError(err?.message || 'Error al cargar el inventario');
        setStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    loadItems();

    // Suscripción reactiva al almacenamiento local
    const unsubscribeStorage = LocalStorage.subscribe(() => {
      LocalStorage.getInventory().then((data) => {
        memoryInventory = data;
        setItems(data);
      }).catch(() => {});
    });

    // Suscripción a renovación o hidratación de sesión para reanudar sincronización de inventario
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

  const addItem = async (item: Ingredient) => {
    const startUserId = LocalStorage.getCurrentUserId();
    if (!startUserId) throw new Error('No hay usuario autenticado');

    try {
      // Optimista: guarda en local primero e impacta UI inmediatamente
      await LocalStorage.addIngredient(item);
      await loadItems();

      // Encolar mutación durable de creación en Outbox
      const mutation: OutboxMutation<Ingredient> = {
        operationId: generateOperationId(),
        userId: startUserId,
        entity: 'inventory',
        action: 'create',
        entityId: item.id,
        payload: item,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'pending',
        attemptCount: 0,
        nextAttemptAt: 0,
      };
      await LocalStorage.enqueueOutboxMutation(mutation);

      // Disparar sincronización secuencial FIFO en segundo plano
      flushOutbox().catch(() => {});
    } catch (err: any) {
      setError(err?.message || 'Error al agregar el alimento');
      throw err;
    }
  };

  const updateItem = async (item: Ingredient) => {
    const startUserId = LocalStorage.getCurrentUserId();
    if (!startUserId) throw new Error('No hay usuario autenticado');

    try {
      // Optimista: actualiza en local primero
      await LocalStorage.updateIngredient(item);
      await loadItems();

      // Compactación segura: si existe un 'create' previo que NUNCA salió a red (attemptCount === 0),
      // actualizar directamente el payload del create sin encolar un update redundante.
      const queue = LocalStorage.getOutboxQueue();
      const pendingCreate = queue.find(
        (m) =>
          m.entity === 'inventory' &&
          m.entityId === item.id &&
          m.action === 'create' &&
          m.attemptCount === 0 &&
          m.status === 'pending'
      );

      if (pendingCreate) {
        await LocalStorage.updateOutboxMutation(pendingCreate.operationId, {
          payload: item,
        });
      } else {
        const mutation: OutboxMutation<Ingredient> = {
          operationId: generateOperationId(),
          userId: startUserId,
          entity: 'inventory',
          action: 'update',
          entityId: item.id,
          payload: item,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'pending',
          attemptCount: 0,
          nextAttemptAt: 0,
        };
        await LocalStorage.enqueueOutboxMutation(mutation);
      }

      flushOutbox().catch(() => {});
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el alimento');
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    const startUserId = LocalStorage.getCurrentUserId();
    if (!startUserId) throw new Error('No hay usuario autenticado');

    try {
      // Optimista: elimina en local y marca en pendingDeletedInventory
      await LocalStorage.deleteIngredient(id);
      await loadItems();

      // Compactación segura:
      // Si la entidad tiene un 'create' pendiente con attemptCount === 0 (nunca salió al backend),
      // purgar el 'create' (y cualquier 'update') sin enviar DELETE a la red, y limpiar pendingDeleted.
      const queue = LocalStorage.getOutboxQueue();
      const pendingCreate = queue.find(
        (m) =>
          m.entity === 'inventory' &&
          m.entityId === id &&
          m.action === 'create' &&
          m.attemptCount === 0 &&
          m.status === 'pending'
      );

      if (pendingCreate) {
        for (const m of queue) {
          if (m.entity === 'inventory' && m.entityId === id) {
            await LocalStorage.removeOutboxMutation(m.operationId);
          }
        }
        await LocalStorage.removePendingDeletedInventory(id).catch(() => {});
      } else {
        // Si ya existía o fue intentado (attemptCount > 0), encolar mutación de delete en el outbox
        const mutation: OutboxMutation<{ id: string }> = {
          operationId: generateOperationId(),
          userId: startUserId,
          entity: 'inventory',
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
        flushOutbox().catch(() => {});
      }
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el alimento');
      throw err;
    }
  };

  const deleteMultipleItems = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await deleteItem(id);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar los alimentos');
      throw err;
    }
  };

  const consumeItem = async (id: string) => {
    return deleteItem(id);
  };

  return {
    items,
    status,
    error,
    reload: loadItems,
    addItem,
    updateItem,
    deleteItem,
    deleteMultipleItems,
    consumeItem,
  };
}
