import { useState, useEffect, useCallback } from 'react';
import { AsyncStatus, Ingredient } from '../types';
import { LocalStorage } from '../storage/local-storage';
import {
  fetchInventoryFromApi,
  createInventoryItemWithApi,
  updateInventoryItemWithApi,
  deleteInventoryItemWithApi,
  batchDeleteInventoryItemsWithApi,
} from '../services/api-client';

let memoryInventory: Ingredient[] | null = null;

export function useInventory() {
  const [items, setItems] = useState<Ingredient[]>(memoryInventory || []);
  const [status, setStatus] = useState<AsyncStatus>(memoryInventory && memoryInventory.length > 0 ? 'success' : 'loading');
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setError(null);
    try {
      // 1. Carga inmediata desde caché local para respuesta instantánea (0ms)
      const localData = await LocalStorage.getInventory();
      if (localData && localData.length > 0) {
        memoryInventory = localData;
        setItems(localData);
        setStatus('success');
      } else if (!memoryInventory) {
        setStatus('loading');
      }

      // 2. Sincronización en red con la base de datos (Supabase a través de FastAPI)
      try {
        const remoteData = await fetchInventoryFromApi();
        if (Array.isArray(remoteData)) {
          memoryInventory = remoteData;
          await LocalStorage.saveInventory(remoteData);
          setItems(remoteData);
        }
      } catch (networkErr: any) {
        // Si no hay red o el backend está iniciando, conservamos la caché local offline
        console.warn('[useInventory] Modo offline/fallback: usando datos locales', networkErr?.message);
        if (!localData || localData.length === 0) {
          // Solo si tampoco hay datos locales reportamos advertencia
          if (!memoryInventory) setItems([]);
        }
      }

      setStatus('success');
    } catch (err: any) {
      setError(err?.message || 'Error al cargar el inventario');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadItems();

    // Suscripción a cambios reactivos locales
    const unsubscribe = LocalStorage.subscribe(() => {
      LocalStorage.getInventory().then((data) => {
        memoryInventory = data;
        setItems(data);
      }).catch(() => {});
    });

    return unsubscribe;
  }, [loadItems]);

  const addItem = async (item: Ingredient) => {
    try {
      // Optimista: guarda en local primero
      await LocalStorage.addIngredient(item);
      await loadItems();

      // Sincroniza con Supabase en la nube
      try {
        const createdRemote = await createInventoryItemWithApi(item);
        if (createdRemote && createdRemote.id !== item.id) {
          await LocalStorage.updateIngredient(createdRemote);
        }
      } catch (remoteErr: any) {
        console.warn('[useInventory] No se pudo sincronizar nuevo alimento con Supabase:', remoteErr?.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al agregar el alimento');
      throw err;
    }
  };

  const updateItem = async (item: Ingredient) => {
    try {
      // Optimista: actualiza en local primero
      await LocalStorage.updateIngredient(item);
      await loadItems();

      // Sincroniza con Supabase en la nube
      try {
        await updateInventoryItemWithApi(item.id, item);
      } catch (remoteErr: any) {
        console.warn('[useInventory] No se pudo sincronizar actualización con Supabase:', remoteErr?.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el alimento');
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      // Optimista: elimina en local primero
      await LocalStorage.deleteIngredient(id);
      await loadItems();

      // Sincroniza eliminación con Supabase en la nube
      try {
        await deleteInventoryItemWithApi(id);
      } catch (remoteErr: any) {
        console.warn('[useInventory] No se pudo sincronizar eliminación con Supabase:', remoteErr?.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el alimento');
      throw err;
    }
  };

  const deleteMultipleItems = async (ids: string[]) => {
    try {
      // Optimista: elimina lote en local primero
      await LocalStorage.deleteIngredients(ids);
      await loadItems();

      // Sincroniza lote con Supabase en la nube
      try {
        await batchDeleteInventoryItemsWithApi(ids);
      } catch (remoteErr: any) {
        console.warn('[useInventory] No se pudo sincronizar borrado por lote con Supabase:', remoteErr?.message);
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
