import { useState, useEffect, useCallback } from 'react';
import { ShoppingItem, RecipeIngredient, IngredientUnit, IngredientCategory } from '../types';
import { LocalStorage } from '../storage/local-storage';
import { findSimilarItem, normalizeItemUnitAndQty } from '../utils/text-matching';

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      const data = await LocalStorage.getShoppingList();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
    const unsubscribe = LocalStorage.subscribe(() => {
      LocalStorage.getShoppingList().then(setItems).catch(() => {});
    });
    return unsubscribe;
  }, [loadItems]);

  const pendingItems = items.filter((item) => !item.isBought);
  const boughtItems = items.filter((item) => item.isBought);

  /**
   * Agrega un nuevo ítem a la lista de compras.
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
    return newItem;
  };

  /**
   * Procesa la adición inteligente de ingredientes faltantes desde una receta:
   * - Si hay coincidencia exacta (o singular/plural, ej. "Tomate" y "Tomates"): fusiona sumando cantidades.
   * - Si la coincidencia es ambigua (ej. "Leche entera" vs "Leche deslactosada"): no fusiona automáticamente para no mezclar productos distintos.
   */
  const addFromRecipe = async (
    missingIngredients: RecipeIngredient[],
    recipeTitle: string
  ): Promise<{ addedCount: number; mergedCount: number }> => {
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
        mergedCount++;
      } else {
        // Coincidencia ambigua o inexistente: crear ítem separado
        const newItem: ShoppingItem = {
          id: `shop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: missing.name,
          quantity: cleanQty, // Conserva null si es desconocida
          unit: cleanUnit,
          category: 'other',
          isBought: false,
          recipeSource: recipeTitle,
          createdAt: new Date().toISOString(),
        };
        currentList = [newItem, ...currentList];
        await LocalStorage.addShoppingItem(newItem);
        addedCount++;
      }
    }

    await loadItems();
    return { addedCount, mergedCount };
  };

  const toggleBought = async (id: string) => {
    await LocalStorage.toggleBoughtItem(id);
    await loadItems();
  };

  const deleteItem = async (id: string) => {
    await LocalStorage.deleteShoppingItem(id);
    await loadItems();
  };

  const clearBought = async () => {
    await LocalStorage.deleteBoughtItems();
    await loadItems();
  };

  const moveBoughtToInventory = async (): Promise<number> => {
    const moved = await LocalStorage.moveBoughtToInventory();
    await loadItems();
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
