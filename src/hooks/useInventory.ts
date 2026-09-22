import { useState, useEffect, useCallback } from 'react';
import { AsyncStatus, Ingredient } from '../types';
import { LocalStorage } from '../storage/local-storage';

export function useInventory() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const data = await LocalStorage.getInventory();
      setItems(data);
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
      LocalStorage.getInventory().then(setItems).catch(() => {});
    });

    return unsubscribe;
  }, [loadItems]);

  const addItem = async (item: Ingredient) => {
    try {
      await LocalStorage.addIngredient(item);
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Error al agregar el alimento');
      throw err;
    }
  };

  const updateItem = async (item: Ingredient) => {
    try {
      await LocalStorage.updateIngredient(item);
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el alimento');
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await LocalStorage.deleteIngredient(id);
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el alimento');
      throw err;
    }
  };

  const deleteMultipleItems = async (ids: string[]) => {
    try {
      await LocalStorage.deleteIngredients(ids);
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar los alimentos');
      throw err;
    }
  };

  const consumeItem = async (id: string) => {
    try {
      await LocalStorage.deleteIngredient(id);
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Error al marcar como consumido');
      throw err;
    }
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
