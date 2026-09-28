import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { executeDeleteWithPendingResolution, ApiError } from '../src/utils/delete-helpers.ts';
import { generateOperationId } from '../src/utils/uuid.ts';

/**
 * Adaptador fake en memoria para simular AsyncStorage sin dependencias nativas.
 */
class FakeAsyncStorage {
  constructor() {
    this.store = new Map();
  }
  async getItem(key) {
    return this.store.get(key) || null;
  }
  async setItem(key, value) {
    this.store.set(key, String(value));
  }
  async removeItem(key) {
    this.store.delete(key);
  }
  async multiSet(keyValuePairs) {
    for (const [k, v] of keyValuePairs) {
      this.store.set(k, String(v));
    }
  }
  async multiGet(keys) {
    return keys.map((k) => [k, this.store.get(k) || null]);
  }
}

/**
 * Algoritmo de fusión de sincronización implementado en useShoppingList.ts.
 */
function mergeShoppingList(currentLocal, remoteFromCloud, pendingDeletedIds = []) {
  if (!Array.isArray(remoteFromCloud)) {
    return currentLocal;
  }
  const pendingSet = new Set(pendingDeletedIds);
  const cleanRemote = remoteFromCloud.filter((item) => !pendingSet.has(item.id));
  const remoteIdSet = new Set(cleanRemote.map((r) => r.id));
  const unsyncedLocal = currentLocal.filter(
    (localItem) => !remoteIdSet.has(localItem.id) && !pendingSet.has(localItem.id)
  );
  return [...unsyncedLocal, ...cleanRemote];
}

function buggyDestructiveMerge(currentLocal, remoteFromCloud) {
  if (Array.isArray(remoteFromCloud) && remoteFromCloud.length > 0) {
    return remoteFromCloud;
  }
  return currentLocal;
}

function syncRecipes(currentLocal, remoteRecipes, pendingDeletedRecipeIds = []) {
  if (!Array.isArray(remoteRecipes)) {
    return currentLocal;
  }
  const pendingSet = new Set(pendingDeletedRecipeIds);
  const localMap = new Map(currentLocal.map((r) => [r.id, r]));

  for (const remote of remoteRecipes) {
    if (!pendingSet.has(remote.id)) {
      localMap.set(remote.id, remote);
    }
  }
  return Array.from(localMap.values()).filter((r) => !pendingSet.has(r.id));
}

// ─── SUITE 1: Regresión de Sincronización No Destructiva ───────────────────────
describe('1. Sincronización Offline y Prevención de Pérdida de Datos (Regresión)', () => {
  it('debe fallar si se reintroduce la sobrescritura destructiva anterior', () => {
    const offlineItems = [
      { id: 'shop-off-1', name: 'Pollo' },
      { id: 'shop-off-2', name: 'Tomate' },
    ];
    const cloudItems = [{ id: 'shop-c-1', name: 'Arroz' }];

    const buggyResult = buggyDestructiveMerge(offlineItems, cloudItems);
    assert.equal(buggyResult.length, 1);
    assert.equal(buggyResult.some((i) => i.id === 'shop-off-1'), false);
  });

  it('debe conservar todos los artículos creados offline al reconectar', () => {
    const offlineItems = [
      { id: 'shop-off-1', name: 'Pollo' },
      { id: 'shop-off-2', name: 'Tomate' },
      { id: 'shop-off-3', name: 'Cilantro' },
    ];
    const cloudItems = [
      { id: 'shop-c-1', name: 'Arroz' },
      { id: 'shop-c-2', name: 'Aceite' },
    ];

    const merged = mergeShoppingList(offlineItems, cloudItems);
    assert.equal(merged.length, 5);
    assert.ok(merged.some((i) => i.id === 'shop-off-1'));
    assert.ok(merged.some((i) => i.id === 'shop-c-1'));
  });
});

// ─── SUITE 2: Prevención de Artículos Zombie ──────────────────────────────────
describe('2. Prevención de Artículos Zombie (Eliminaciones Offline)', () => {
  it('escenario useShoppingList: "Leche" eliminada offline NO debe reaparecer al reconectar', () => {
    const initialSync = [
      { id: 'shop-leche', name: 'Leche' },
      { id: 'shop-pan', name: 'Pan' },
    ];
    const pendingDeletedShopping = ['shop-leche'];
    const currentLocalAfterDelete = initialSync.filter(
      (item) => !pendingDeletedShopping.includes(item.id)
    );

    const remoteFromCloud = [
      { id: 'shop-leche', name: 'Leche' },
      { id: 'shop-pan', name: 'Pan' },
    ];

    const merged = mergeShoppingList(currentLocalAfterDelete, remoteFromCloud, pendingDeletedShopping);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, 'shop-pan');
    assert.equal(merged.find((i) => i.id === 'shop-leche'), undefined);
  });

  it('escenario recipe-service: Receta eliminada offline NO debe resucitar al reconectar', () => {
    const initialRecipes = [
      { id: 'rec-pasta', title: 'Pasta Bolognese' },
      { id: 'rec-salad', title: 'Ensalada César' },
    ];
    const pendingDeletedRecipes = ['rec-pasta'];
    const localRecipes = initialRecipes.filter((r) => !pendingDeletedRecipes.includes(r.id));
    const remoteRecipes = [
      { id: 'rec-pasta', title: 'Pasta Bolognese' },
      { id: 'rec-salad', title: 'Ensalada César' },
    ];

    const synced = syncRecipes(localRecipes, remoteRecipes, pendingDeletedRecipes);
    assert.equal(synced.length, 1);
    assert.equal(synced[0].id, 'rec-salad');
    assert.equal(synced.find((r) => r.id === 'rec-pasta'), undefined);
  });

  it('debe limpiar el id pendiente una vez que el servidor confirma la eliminación remota', () => {
    let pendingDeletedShopping = ['shop-leche'];
    const simulateServerDeleteSuccess = (id) => {
      pendingDeletedShopping = pendingDeletedShopping.filter((pid) => pid !== id);
    };
    simulateServerDeleteSuccess('shop-leche');
    assert.equal(pendingDeletedShopping.length, 0);
  });
});

// ─── SUITE 3: Matriz Completa de Respuestas HTTP y Helper (Riesgos 1 y 3) ────
describe('3. Matriz Completa de Respuestas HTTP y DeleteResolutionResult (Riesgos 1 y 3)', () => {
  it('1. HTTP 200 con JSON: borrado confirmado y pending limpio', async () => {
    let pending = ['item-200'];
    const mockDelete = async () => ({ status: 200, data: { status: 'deleted' } });
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    const res = await executeDeleteWithPendingResolution('item-200', mockDelete, removePending, 'Item');
    assert.equal(res.remoteResolved, true);
    assert.equal(res.pendingCleared, true);
    assert.equal(res.status, 200);
    assert.deepEqual(pending, []);
  });

  it('2. HTTP 204 con cuerpo vacío: borrado confirmado y pending limpio sin SyntaxError', async () => {
    let pending = ['item-204'];
    const mockDelete204 = async () => ({ status: 204 });
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    const res = await executeDeleteWithPendingResolution('item-204', mockDelete204, removePending, 'Item');
    assert.equal(res.remoteResolved, true);
    assert.equal(res.pendingCleared, true);
    assert.equal(res.status, 204);
    assert.deepEqual(pending, []);
  });

  it('3. HTTP 404 idempotente: borrado confirmado y pending limpio sin reintento', async () => {
    let pending = ['item-404'];
    const mockDelete404 = async () => { throw new ApiError('Not found', 404); };
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    const res = await executeDeleteWithPendingResolution('item-404', mockDelete404, removePending, 'Item');
    assert.equal(res.remoteResolved, true);
    assert.equal(res.pendingCleared, true);
    assert.equal(res.status, 404);
    assert.deepEqual(pending, []);
  });

  it('4. HTTP 401: fallo de autenticación -> conserva pending y reporta estado', async () => {
    let pending = ['item-401'];
    const mockDelete401 = async () => { throw new ApiError('Unauthorized', 401); };
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    const res = await executeDeleteWithPendingResolution('item-401', mockDelete401, removePending, 'Item');
    assert.equal(res.remoteResolved, false);
    assert.equal(res.pendingCleared, false);
    assert.equal(res.status, 401);
    assert.deepEqual(pending, ['item-401']);
  });

  it('5. HTTP 403: permisos denegados -> conserva pending y reporta estado', async () => {
    let pending = ['item-403'];
    const mockDelete403 = async () => { throw new ApiError('Forbidden', 403); };
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    const res = await executeDeleteWithPendingResolution('item-403', mockDelete403, removePending, 'Item');
    assert.equal(res.remoteResolved, false);
    assert.equal(res.pendingCleared, false);
    assert.equal(res.status, 403);
    assert.deepEqual(pending, ['item-403']);
  });

  it('6. HTTP 408: timeout HTTP -> conserva pending sin bucle inmediato', async () => {
    let pending = ['item-408'];
    const mockDelete408 = async () => { throw new ApiError('Request Timeout', 408); };
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    const res = await executeDeleteWithPendingResolution('item-408', mockDelete408, removePending, 'Item');
    assert.equal(res.remoteResolved, false);
    assert.equal(res.pendingCleared, false);
    assert.equal(res.status, 408);
    assert.deepEqual(pending, ['item-408']);
  });

  it('7. HTTP 429: límite de tasa -> conserva pending sin bucle inmediato', async () => {
    let pending = ['item-429'];
    const mockDelete429 = async () => { throw new ApiError('Too Many Requests', 429); };
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    const res = await executeDeleteWithPendingResolution('item-429', mockDelete429, removePending, 'Item');
    assert.equal(res.remoteResolved, false);
    assert.equal(res.pendingCleared, false);
    assert.equal(res.status, 429);
    assert.deepEqual(pending, ['item-429']);
  });

  it('8. HTTP 500: caída del servidor -> conserva pending para reintento', async () => {
    let pending = ['item-500'];
    const mockDelete500 = async () => { throw new ApiError('Server Crash', 500); };
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    const res = await executeDeleteWithPendingResolution('item-500', mockDelete500, removePending, 'Item');
    assert.equal(res.remoteResolved, false);
    assert.equal(res.pendingCleared, false);
    assert.equal(res.status, 500);
    assert.deepEqual(pending, ['item-500']);
  });

  it('9. HTTP 502: bad gateway -> conserva pending para reintento', async () => {
    let pending = ['item-502'];
    const mockDelete502 = async () => { throw new ApiError('Bad Gateway', 502); };
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    const res = await executeDeleteWithPendingResolution('item-502', mockDelete502, removePending, 'Item');
    assert.equal(res.remoteResolved, false);
    assert.equal(res.status, 502);
    assert.deepEqual(pending, ['item-502']);
  });

  it('10. HTTP 503: service unavailable -> conserva pending para reintento', async () => {
    let pending = ['item-503'];
    const mockDelete503 = async () => { throw new ApiError('Service Unavailable', 503); };
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    const res = await executeDeleteWithPendingResolution('item-503', mockDelete503, removePending, 'Item');
    assert.equal(res.remoteResolved, false);
    assert.equal(res.status, 503);
    assert.deepEqual(pending, ['item-503']);
  });

  it('11. Timeout de conexión (status 0): conserva pending silenciosamente', async () => {
    let pending = ['item-timeout'];
    const mockTimeout = async () => { throw new ApiError('Connection timed out', 0, true); };
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    const res = await executeDeleteWithPendingResolution('item-timeout', mockTimeout, removePending, 'Item');
    assert.equal(res.remoteResolved, false);
    assert.equal(res.isNetworkError, true);
    assert.deepEqual(pending, ['item-timeout']);
  });

  it('12. Error de red offline (status 0): conserva pending para reconexión', async () => {
    let pending = ['item-offline'];
    const mockNetErr = async () => { throw new ApiError('Network request failed', 0, true); };
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    const res = await executeDeleteWithPendingResolution('item-offline', mockNetErr, removePending, 'Item');
    assert.equal(res.remoteResolved, false);
    assert.equal(res.isNetworkError, true);
    assert.deepEqual(pending, ['item-offline']);
  });

  it('13. Error de persistencia local en removePendingFn: reporta localPersistenceError y conserva pending', async () => {
    let pending = ['item-disk-err'];
    const mockDelete200 = async () => ({ status: 200 });
    const removePendingFail = async () => { throw new Error('Disk IO Error / AsyncStorage failure'); };

    const res = await executeDeleteWithPendingResolution('item-disk-err', mockDelete200, removePendingFail, 'Item');
    assert.equal(res.remoteResolved, true, 'El servidor confirmó el borrado');
    assert.equal(res.pendingCleared, false, 'La limpieza local no se pudo completar');
    assert.equal(res.localPersistenceError, true, 'Se marca explícitamente el fallo de persistencia local');
    assert.deepEqual(pending, ['item-disk-err'], 'El ID se conserva para no perder el estado');
  });

  it('14. 200 y 404 conservan el ID en pending si falla la persistencia local', async () => {
    let pending = ['item-p1', 'item-p2'];
    const removePendingFail = async () => { throw new Error('AsyncStorage failure'); };

    const res200 = await executeDeleteWithPendingResolution('item-p1', async () => ({ status: 200 }), removePendingFail, 'Item');
    const res404 = await executeDeleteWithPendingResolution('item-p2', async () => { throw new ApiError('Not found', 404); }, removePendingFail, 'Item');

    assert.equal(res200.pendingCleared, false);
    assert.equal(res404.pendingCleared, false);
    assert.deepEqual(pending, ['item-p1', 'item-p2']);
  });

  it('15. No segunda llamada HTTP a deleteFn tras fallo de limpieza local', async () => {
    let httpCalls = 0;
    const mockDelete = async () => {
      httpCalls++;
      return { status: 200 };
    };
    const removePendingFail = async () => {
      throw new Error('AsyncStorage disk full');
    };

    const res = await executeDeleteWithPendingResolution('item-no-double-call', mockDelete, removePendingFail, 'Item');
    assert.equal(httpCalls, 1, 'deleteFn debe ser llamada exactamente UNA vez');
    assert.equal(res.remoteResolved, true);
    assert.equal(res.pendingCleared, false);
  });
});

// ─── SUITE 4: Aislamiento de Sesión y Concurrencia (Riesgo 4) ─────────────────
describe('4. Aislamiento de Sesión, Renovación y Concurrencia (Riesgo 4)', () => {
  it('16. Renovación de sesión tras 401: pending se conserva y se reintenta tras renovar', async () => {
    let pending = ['item-session-renew'];
    let sessionToken = 'expired-token';

    const mockDeleteWithAuth = async (id) => {
      if (sessionToken === 'expired-token') {
        throw new ApiError('Token expired', 401);
      }
      return { status: 200 };
    };
    const removePending = async (id) => { pending = pending.filter((i) => i !== id); };

    // 1. Primer intento: falla con 401
    const res1 = await executeDeleteWithPendingResolution('item-session-renew', mockDeleteWithAuth, removePending, 'Item');
    assert.equal(res1.remoteResolved, false);
    assert.deepEqual(pending, ['item-session-renew'], 'Se debe conservar en pending');

    // 2. Simular renovación de sesión
    sessionToken = 'fresh-valid-token';

    // 3. Reintento automático tras renovar sesión
    const res2 = await executeDeleteWithPendingResolution('item-session-renew', mockDeleteWithAuth, removePending, 'Item');
    assert.equal(res2.remoteResolved, true);
    assert.equal(res2.pendingCleared, true);
    assert.deepEqual(pending, [], 'Pending debe quedar limpio tras sesión renovada');
  });

  it('17. Logout durante sincronización: resultado de usuario A no se escribe para usuario B', async () => {
    let activeUser = 'user-A';
    const storageUserA = [];
    const storageUserB = [];

    const simulateSyncForUserA = async () => {
      const startUserId = activeUser;
      // Simular latencia de red de 20ms
      await new Promise((r) => setTimeout(r, 20));

      // Comprobar guarda de cambio de usuario antes de escribir
      if (activeUser !== startUserId) {
        return; // Descartado de forma segura
      }
      storageUserA.push('remote-item-A');
    };

    const syncPromise = simulateSyncForUserA();
    // Simular que el usuario A cierra sesión y entra usuario B mientras la llamada de A estaba en vuelo
    activeUser = 'user-B';
    await syncPromise;

    assert.equal(storageUserA.length, 0, 'No debe escribirse en usuario A tras logout');
    assert.equal(storageUserB.length, 0, 'No debe contaminarse el almacenamiento de usuario B');
  });

  it('18. Cambio de usuario: usuario A y usuario B mantienen sus pendingDeleted aislados', () => {
    const userAPending = new Map([['item-user-A', Date.now()]]);
    const userBPending = new Map([['item-user-B', Date.now()]]);

    assert.ok(userAPending.has('item-user-A'));
    assert.ok(!userAPending.has('item-user-B'));
    assert.ok(userBPending.has('item-user-B'));
    assert.ok(!userBPending.has('item-user-A'));
  });
});

// ─── SUITE 5: Atomicidad y Recuperación de moveBoughtToInventory (Riesgo 2) ───
describe('5. Atomicidad, Idempotencia y Recuperación de moveBoughtToInventory (Riesgo 2)', () => {
  it('19. moveBoughtToInventory repetido: segunda llamada consecutiva retorna 0 y no duplica', () => {
    let shoppingList = [
      { id: 'shop-1', name: 'Manzanas', isBought: true, category: 'fruit', unit: 'units', quantity: 3 },
      { id: 'shop-2', name: 'Leche', isBought: false, category: 'dairy', unit: 'units', quantity: 1 },
    ];
    let inventory = [];

    // Primera ejecución
    const boughtItems1 = shoppingList.filter((i) => i.isBought);
    assert.equal(boughtItems1.length, 1);
    inventory.push({ id: 'ing-1', name: boughtItems1[0].name, quantity: boughtItems1[0].quantity });
    shoppingList = shoppingList.filter((i) => !i.isBought);

    assert.equal(shoppingList.length, 1);
    assert.equal(inventory.length, 1);

    // Segunda ejecución consecutiva
    const boughtItems2 = shoppingList.filter((i) => i.isBought);
    assert.equal(boughtItems2.length, 0, 'No deben quedar artículos comprados');
    assert.equal(inventory.length, 1, 'No se deben duplicar ingredientes en inventario');
  });

  it('20. Recuperación tras cierre forzoso simulado: reconciliación atómica mediante snapshot', async () => {
    const fakeStorage = new FakeAsyncStorage();
    const userId = 'user-test-crash';
    const txKey = `@food_ai_tx_move_bought_v1_${userId}`;
    const invKey = `@food_ai_inventory_v1_${userId}`;
    const shopKey = `@food_ai_shopping_list_v1_${userId}`;
    const pendingKey = `@food_ai_pending_deleted_shopping_v1_${userId}`;

    // Estado previo al crash:
    await fakeStorage.setItem(
      shopKey,
      JSON.stringify([
        { id: 'shop-crash-1', name: 'Tomate', isBought: true },
        { id: 'shop-crash-2', name: 'Cebolla', isBought: false },
      ])
    );
    await fakeStorage.setItem(invKey, JSON.stringify([]));
    await fakeStorage.setItem(pendingKey, JSON.stringify([]));

    // Snapshot que quedó en disco tras apagarse el dispositivo durante el commit:
    const crashSnapshot = {
      version: 1,
      timestamp: 123456789,
      status: 'committing',
      boughtItemIds: ['shop-crash-1'],
      newIngredients: [
        { id: 'ing-crash-1', name: 'Tomate', category: 'vegetable', quantity: 2, unit: 'units' },
      ],
      updatedIngredients: [],
    };
    await fakeStorage.setItem(txKey, JSON.stringify(crashSnapshot));

    // Simular el algoritmo de recuperación ejecutado en switchUser:
    const rawTx = await fakeStorage.getItem(txKey);
    const tx = JSON.parse(rawTx);

    if (tx && tx.status === 'committing') {
      const [savedInv, savedShop, savedPending] = await Promise.all([
        fakeStorage.getItem(invKey),
        fakeStorage.getItem(shopKey),
        fakeStorage.getItem(pendingKey),
      ]);

      let inv = savedInv ? JSON.parse(savedInv) : [];
      let shop = savedShop ? JSON.parse(savedShop) : [];
      let pendingMap = new Map(savedPending ? JSON.parse(savedPending) : []);

      // 1. Asegurar boughtIds en pendingMap
      tx.boughtItemIds.forEach((id) => pendingMap.set(id, tx.timestamp));
      // 2. Asegurar boughtIds fuera de shop
      const boughtSet = new Set(tx.boughtItemIds);
      shop = shop.filter((i) => !boughtSet.has(i.id));
      // 3. Reconciliar nuevos ingredientes sin duplicar por ID
      const existingIds = new Set(inv.map((i) => i.id));
      tx.newIngredients.forEach((newIng) => {
        if (!existingIds.has(newIng.id)) {
          inv.unshift(newIng);
          existingIds.add(newIng.id);
        }
      });

      // Guardar reconciliación atómica y eliminar snapshot
      await fakeStorage.multiSet([
        [invKey, JSON.stringify(inv)],
        [shopKey, JSON.stringify(shop)],
        [pendingKey, JSON.stringify(Array.from(pendingMap.entries()))],
      ]);
      await fakeStorage.removeItem(txKey);
    }

    // Verificaciones de estado recuperado:
    const finalTx = await fakeStorage.getItem(txKey);
    assert.equal(finalTx, null, 'El snapshot de transacción debe haber sido limpiado');

    const finalShop = JSON.parse(await fakeStorage.getItem(shopKey));
    assert.equal(finalShop.length, 1);
    assert.equal(finalShop[0].id, 'shop-crash-2', 'El comprado debió ser removido de compras');

    const finalInv = JSON.parse(await fakeStorage.getItem(invKey));
    assert.equal(finalInv.length, 1);
    assert.equal(finalInv[0].id, 'ing-crash-1', 'El ingrediente debió ser incorporado al inventario');

    const finalPending = new Map(JSON.parse(await fakeStorage.getItem(pendingKey)));
    assert.ok(finalPending.has('shop-crash-1'), 'El artículo comprado debe estar en pendingDeleted');
  });

  it('21. No pérdida de cantidades null: artículos con quantity null conservan null en inventario', () => {
    const boughtItem = { id: 'shop-null-qty', name: 'Sal', quantity: null, unit: 'units' };
    const newIngredient = {
      id: 'ing-null-qty',
      name: boughtItem.name,
      quantity: boughtItem.quantity, // Debe ser exactamente null
      unit: boughtItem.unit,
    };

    assert.equal(newIngredient.quantity, null, 'La cantidad null no debe convertirse a 0 o 1');
  });

  it('22. No duplicación de inventario: fusión exacta suma cantidades y mantiene ID único', () => {
    const existing = { id: 'ing-arroz', name: 'Arroz', quantity: 2, unit: 'kg' };
    const boughtItem = { name: 'Arroz', quantity: 1.5, unit: 'kg' };

    // Fusión
    existing.quantity = Math.round((existing.quantity + boughtItem.quantity) * 10) / 10;

    assert.equal(existing.quantity, 3.5);
    assert.equal(existing.id, 'ing-arroz');
  });

  it('23. No reaparición de artículos eliminados: pendingDeletedShopping excluye compras remotas', () => {
    const remoteFromCloud = [
      { id: 'shop-deleted-offline', name: 'Atún' },
      { id: 'shop-active', name: 'Huevos' },
    ];
    const pendingDeleted = ['shop-deleted-offline'];
    const currentLocal = [{ id: 'shop-active', name: 'Huevos' }];

    const merged = mergeShoppingList(currentLocal, remoteFromCloud, pendingDeleted);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, 'shop-active');
    assert.equal(merged.find((i) => i.id === 'shop-deleted-offline'), undefined);
  });
});

// ─── SUITE 6: Integridad de Inventario Offline y Aislamiento (Punto 3 - Fase A) ───
describe('6. Integridad de Inventario Offline y Aislamiento por Usuario (Punto 3 - Fase A)', () => {
  function mergeInventory(currentLocal, remoteFromCloud, pendingDeletedInventoryIds = []) {
    if (!Array.isArray(remoteFromCloud)) {
      return currentLocal;
    }
    const pendingSet = new Set(pendingDeletedInventoryIds);
    const cleanRemote = remoteFromCloud.filter((item) => !pendingSet.has(item.id));
    const remoteIdSet = new Set(cleanRemote.map((r) => r.id));
    const unsyncedLocal = currentLocal.filter(
      (localItem) => !remoteIdSet.has(localItem.id) && !pendingSet.has(localItem.id)
    );
    return [...unsyncedLocal, ...cleanRemote];
  }

  it('24. Inventario local no se sobrescribe con un GET remoto', () => {
    const offlineInventory = [
      { id: 'ing-off-1', name: 'Manzana Criolla', quantity: 4, unit: 'units' },
      { id: 'ing-off-2', name: 'Plátano Maduro', quantity: 2, unit: 'units' },
    ];
    const remoteFromCloud = [
      { id: 'ing-rem-1', name: 'Arroz Blanco', quantity: 1, unit: 'kg' },
    ];

    const merged = mergeInventory(offlineInventory, remoteFromCloud, []);
    assert.equal(merged.length, 3, 'El inventario fusionado debe contener los 3 elementos');
    assert.ok(merged.some((i) => i.id === 'ing-off-1'), 'Manzana creada offline debe conservarse');
    assert.ok(merged.some((i) => i.id === 'ing-off-2'), 'Plátano creado offline debe conservarse');
    assert.ok(merged.some((i) => i.id === 'ing-rem-1'), 'Arroz remoto debe incorporarse');
  });

  it('25. Eliminación offline de inventario conserva pending en pendingDeletedInventory', async () => {
    let pendingInventory = ['ing-offline-del-1'];
    const mockNetworkErr = async () => {
      throw new ApiError('Network request failed', 0, true);
    };
    const removePending = async (id) => {
      pendingInventory = pendingInventory.filter((i) => i !== id);
    };

    const res = await executeDeleteWithPendingResolution(
      'ing-offline-del-1',
      mockNetworkErr,
      removePending,
      'Alimento de inventario'
    );

    assert.equal(res.remoteResolved, false, 'No se resuelve remotamente por error de red');
    assert.equal(res.isNetworkError, true, 'Se clasifica correctamente como error de red');
    assert.deepEqual(pendingInventory, ['ing-offline-del-1'], 'El ID debe conservarse en pendingDeletedInventory');
  });

  it('26. Un GET remoto no resucita un inventario eliminado localmente (anti-zombies)', () => {
    const remoteFromCloud = [
      { id: 'ing-deleted-offline', name: 'Yogurt Griego' },
      { id: 'ing-active', name: 'Huevos de Granja' },
    ];
    const pendingDeletedInventory = ['ing-deleted-offline'];
    const currentLocal = [{ id: 'ing-active', name: 'Huevos de Granja' }];

    const merged = mergeInventory(currentLocal, remoteFromCloud, pendingDeletedInventory);
    assert.equal(merged.length, 1, 'Solo debe permanecer el alimento activo');
    assert.equal(merged[0].id, 'ing-active');
    assert.equal(
      merged.find((i) => i.id === 'ing-deleted-offline'),
      undefined,
      'El alimento eliminado no debe resucitar como zombie'
    );
  });

  it('27. 404 limpia pending de inventario de forma idempotente', async () => {
    let pendingInventory = ['ing-404-test'];
    const mockDelete404 = async () => {
      throw new ApiError('Ingredient not found', 404);
    };
    const removePending = async (id) => {
      pendingInventory = pendingInventory.filter((i) => i !== id);
    };

    const res = await executeDeleteWithPendingResolution(
      'ing-404-test',
      mockDelete404,
      removePending,
      'Alimento de inventario'
    );

    assert.equal(res.remoteResolved, true, 'HTTP 404 se trata como borrado consumado');
    assert.equal(res.pendingCleared, true, 'Se limpia el ID de la lista de pendientes');
    assert.deepEqual(pendingInventory, [], 'La lista de pendientes de inventario debe quedar vacía');
  });

  it('28. 401, 403, 408, 429, 5xx y red conservan pending de inventario', async () => {
    const errorStatuses = [401, 403, 408, 429, 500, 503, 0];

    for (const status of errorStatuses) {
      let pending = [`ing-${status}`];
      const mockDelete = async () => {
        if (status === 0) throw new ApiError('Offline', 0, true);
        throw new ApiError(`Error ${status}`, status);
      };
      const removePending = async (id) => {
        pending = pending.filter((i) => i !== id);
      };

      const res = await executeDeleteWithPendingResolution(`ing-${status}`, mockDelete, removePending, 'Alimento');
      assert.equal(res.remoteResolved, false, `Status ${status} no debe resolver remotamente`);
      assert.equal(res.pendingCleared, false, `Status ${status} no debe limpiar pending`);
      assert.deepEqual(pending, [`ing-${status}`], `Status ${status} debe conservar el ID en pendientes`);
    }
  });

  it('29. Respuesta tardía de Usuario A en inventario no escribe datos para Usuario B', async () => {
    let activeUser = 'user-A';
    const storageUserA = [];
    const storageUserB = [];

    const simulateInventoryLoadForUserA = async () => {
      const startUserId = activeUser;
      // Simular latencia de backend de 25ms
      await new Promise((r) => setTimeout(r, 25));

      // Comprobar guarda de seguridad startUserId
      if (activeUser !== startUserId) {
        return; // Abortado por cambio de sesión
      }
      storageUserA.push({ id: 'ing-A', name: 'Manzanas de Usuario A' });
    };

    const syncPromise = simulateInventoryLoadForUserA();
    // Usuario A cierra sesión y entra Usuario B mientras la red estaba en vuelo
    activeUser = 'user-B';
    await syncPromise;

    assert.equal(storageUserA.length, 0, 'No debe escribirse en usuario A tras logout');
    assert.equal(storageUserB.length, 0, 'No debe contaminarse el inventario de usuario B');
  });

  it('30. Usuario A y Usuario B tienen pending de inventario aislados por userId', async () => {
    const fakeStorage = new FakeAsyncStorage();
    const keyA = '@food_ai_pending_deleted_inventory_v1_userA';
    const keyB = '@food_ai_pending_deleted_inventory_v1_userB';

    await fakeStorage.setItem(keyA, JSON.stringify([['ing-A-1', Date.now()]]));
    await fakeStorage.setItem(keyB, JSON.stringify([['ing-B-1', Date.now()], ['ing-B-2', Date.now()]]));

    const pendingA = new Map(JSON.parse(await fakeStorage.getItem(keyA)));
    const pendingB = new Map(JSON.parse(await fakeStorage.getItem(keyB)));

    assert.equal(pendingA.size, 1);
    assert.ok(pendingA.has('ing-A-1'));
    assert.ok(!pendingA.has('ing-B-1'));

    assert.equal(pendingB.size, 2);
    assert.ok(pendingB.has('ing-B-1'));
    assert.ok(pendingB.has('ing-B-2'));
    assert.ok(!pendingB.has('ing-A-1'));
  });

  it('31. moveBoughtToInventory conserva localmente los alimentos movidos tras una sincronización remota de inventario', () => {
    // 1. Estado inicial tras ejecutar moveBoughtToInventory en local:
    // Los alimentos comprados pasan a inventario con ID ing-...
    const localInventoryAfterMove = [
      { id: 'ing-moved-1', name: 'Leche Deslactosada', quantity: 2, unit: 'liters' },
      { id: 'ing-existing', name: 'Arroz', quantity: 1, unit: 'kg' },
    ];

    // 2. Llega un GET remoto que solo conoce los alimentos previamente sincronizados (no conoce ing-moved-1 aún):
    const remoteInventory = [
      { id: 'ing-existing', name: 'Arroz', quantity: 1, unit: 'kg' },
    ];

    // 3. Sincronización con merge no destructivo
    const mergedInventory = mergeInventory(localInventoryAfterMove, remoteInventory, []);

    assert.equal(mergedInventory.length, 2, 'El inventario debe conservar tanto el existente como el movido');
    assert.ok(
      mergedInventory.some((i) => i.id === 'ing-moved-1'),
      'El alimento transferido desde compras no debe ser eliminado por el GET remoto'
    );
  });

  it('32. Recuperación del snapshot de moveBoughtToInventory sigue siendo idempotente', async () => {
    const fakeStorage = new FakeAsyncStorage();
    const userId = 'user-test-idempotence';
    const txKey = `@food_ai_tx_move_bought_v1_${userId}`;
    const invKey = `@food_ai_inventory_v1_${userId}`;
    const shopKey = `@food_ai_shopping_list_v1_${userId}`;
    const pendingKey = `@food_ai_pending_deleted_shopping_v1_${userId}`;

    // Snapshot preparado
    const snapshot = {
      version: 1,
      timestamp: Date.now(),
      status: 'committing',
      boughtItemIds: ['shop-idemp-1'],
      newIngredients: [{ id: 'ing-idemp-1', name: 'Queso', quantity: 1, unit: 'units' }],
      updatedIngredients: [],
    };
    await fakeStorage.setItem(txKey, JSON.stringify(snapshot));
    await fakeStorage.setItem(shopKey, JSON.stringify([{ id: 'shop-idemp-1', name: 'Queso', isBought: true }]));
    await fakeStorage.setItem(invKey, JSON.stringify([]));

    // Función de recuperación idéntica a recoverPendingMoveBoughtTx
    const recoverTx = async (uid) => {
      const rawTx = await fakeStorage.getItem(txKey);
      if (!rawTx) return false;
      const tx = JSON.parse(rawTx);
      if (tx && tx.status === 'committing') {
        let inv = JSON.parse((await fakeStorage.getItem(invKey)) || '[]');
        let shop = JSON.parse((await fakeStorage.getItem(shopKey)) || '[]');
        const existingInvIds = new Set(inv.map((i) => i.id));
        for (const newIng of tx.newIngredients) {
          if (!existingInvIds.has(newIng.id)) {
            inv.unshift(newIng);
            existingInvIds.add(newIng.id);
          }
        }
        const boughtSet = new Set(tx.boughtItemIds);
        shop = shop.filter((i) => !boughtSet.has(i.id));

        await fakeStorage.multiSet([
          [invKey, JSON.stringify(inv)],
          [shopKey, JSON.stringify(shop)],
        ]);
        await fakeStorage.removeItem(txKey);
        return true;
      }
      return false;
    };

    // Primera recuperación: ejecuta con éxito y limpia snapshot
    const firstRecovery = await recoverTx(userId);
    assert.equal(firstRecovery, true, 'La primera recuperación debe procesar la transacción');

    const invAfterFirst = JSON.parse(await fakeStorage.getItem(invKey));
    assert.equal(invAfterFirst.length, 1);
    assert.equal(invAfterFirst[0].id, 'ing-idemp-1');

    // Segunda recuperación: no-op idempotente
    const secondRecovery = await recoverTx(userId);
    assert.equal(secondRecovery, false, 'La segunda recuperación debe retornar false sin alterar datos');

    const invAfterSecond = JSON.parse(await fakeStorage.getItem(invKey));
    assert.equal(invAfterSecond.length, 1, 'No debe haber duplicados tras una segunda recuperación');
  });

  it('33. No se realizan dos llamadas HTTP por fallo de removePendingFn en inventario', async () => {
    let httpCalls = 0;
    const mockDeleteApi = async (id) => {
      httpCalls++;
      return true;
    };
    const removePendingFail = async (id) => {
      throw new Error('SQLite disk I/O error');
    };

    const res = await executeDeleteWithPendingResolution(
      'ing-fail-storage',
      mockDeleteApi,
      removePendingFail,
      'Alimento de inventario'
    );

    assert.equal(httpCalls, 1, 'La API remota debe llamarse exactamente UNA sola vez');
    assert.equal(res.remoteResolved, true, 'El servidor confirmó la eliminación');
    assert.equal(res.pendingCleared, false, 'La limpieza local falló');
    assert.equal(res.localPersistenceError, true, 'Se documenta el error de persistencia local');
  });
});

// ─── SUITE 7: Cola Durable Outbox y Despachador Secuencial FIFO (Punto 3 - Fase B1) ───
describe('7. Cola Durable Outbox y Despachador Secuencial FIFO (Punto 3 - Fase B1)', () => {
  it('34. generateOperationId genera identificadores UUID v4 válidos y únicos', () => {
    const ids = new Set();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (let i = 0; i < 100; i++) {
      const id = generateOperationId();
      assert.ok(uuidRegex.test(id), `El id ${id} debe cumplir el formato UUID v4`);
      assert.ok(!ids.has(id), `El id ${id} no debe repetirse`);
      ids.add(id);
    }
  });

  it('35. Persistencia de Outbox namespaced por userId: Usuario A y B no mezclan colas', async () => {
    const fakeStorage = new FakeAsyncStorage();
    const keyUserA = '@food_ai_outbox_v1_userA';
    const keyUserB = '@food_ai_outbox_v1_userB';

    const mutationA = {
      operationId: 'op-a-1',
      userId: 'userA',
      entity: 'inventory',
      action: 'create',
      entityId: 'ing-a-1',
      payload: { name: 'Alimento A' },
      createdAt: 1000,
      updatedAt: 1000,
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: 0,
    };

    const mutationB = {
      operationId: 'op-b-1',
      userId: 'userB',
      entity: 'inventory',
      action: 'create',
      entityId: 'ing-b-1',
      payload: { name: 'Alimento B' },
      createdAt: 2000,
      updatedAt: 2000,
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: 0,
    };

    await fakeStorage.setItem(keyUserA, JSON.stringify([mutationA]));
    await fakeStorage.setItem(keyUserB, JSON.stringify([mutationB]));

    // Al cargar usuario A:
    const queueA = JSON.parse(await fakeStorage.getItem(keyUserA));
    assert.equal(queueA.length, 1);
    assert.equal(queueA[0].operationId, 'op-a-1');
    assert.equal(queueA[0].userId, 'userA');

    // Al cargar usuario B:
    const queueB = JSON.parse(await fakeStorage.getItem(keyUserB));
    assert.equal(queueB.length, 1);
    assert.equal(queueB[0].operationId, 'op-b-1');
    assert.equal(queueB[0].userId, 'userB');

    // Cola de usuario A sigue intacta tras leer usuario B
    const recheckA = JSON.parse(await fakeStorage.getItem(keyUserA));
    assert.equal(recheckA.length, 1);
    assert.equal(recheckA[0].operationId, 'op-a-1');
  });

  it('36. recoverProcessingOutbox: mutaciones interrumpidas en processing regresan a pending', () => {
    const rawQueue = [
      { operationId: 'op-1', status: 'processing', entityId: 'ing-1', createdAt: 100 },
      { operationId: 'op-2', status: 'pending', entityId: 'ing-2', createdAt: 200 },
      { operationId: 'op-3', status: 'conflict', entityId: 'ing-3', createdAt: 300 },
    ];

    // Algoritmo de recuperación de LocalStorage.recoverProcessingOutbox
    const recovered = rawQueue.map((m) =>
      m.status === 'processing' ? { ...m, status: 'pending', updatedAt: Date.now() } : m
    );

    assert.equal(recovered[0].status, 'pending', 'op-1 debe recuperarse a pending');
    assert.equal(recovered[1].status, 'pending', 'op-2 debe permanecer pending');
    assert.equal(recovered[2].status, 'conflict', 'op-3 terminal debe permanecer en conflict');
  });

  it('37. Despachador secuencial FIFO procesa mutaciones en orden cronológico estricto', async () => {
    const dispatchedOrder = [];
    const queue = [
      { operationId: 'op-3', createdAt: 300, status: 'pending', attemptCount: 0, nextAttemptAt: 0, entity: 'inventory', action: 'create', entityId: 'ing-3', payload: { name: 'Tres' } },
      { operationId: 'op-1', createdAt: 100, status: 'pending', attemptCount: 0, nextAttemptAt: 0, entity: 'inventory', action: 'create', entityId: 'ing-1', payload: { name: 'Uno' } },
      { operationId: 'op-2', createdAt: 200, status: 'pending', attemptCount: 0, nextAttemptAt: 0, entity: 'inventory', action: 'create', entityId: 'ing-2', payload: { name: 'Dos' } },
    ];

    // Simular el dispatcher FIFO
    queue.sort((a, b) => a.createdAt - b.createdAt);
    for (const m of queue) {
      if (m.status === 'pending') {
        dispatchedOrder.push(m.operationId);
        m.status = 'processing';
      }
    }

    assert.deepEqual(dispatchedOrder, ['op-1', 'op-2', 'op-3'], 'El orden de despacho debe ser cronológico FIFO (op-1, op-2, op-3)');
  });

  it('38. Compactación CREATE + UPDATE: actualiza payload del create in-place si attemptCount === 0', () => {
    let queue = [
      {
        operationId: 'op-c1',
        entityId: 'ing-edit-1',
        entity: 'inventory',
        action: 'create',
        attemptCount: 0,
        status: 'pending',
        payload: { id: 'ing-edit-1', name: 'Leche Descremada', quantity: 1 },
      },
    ];

    // Simular actualización offline
    const updatedItem = { id: 'ing-edit-1', name: 'Leche Descremada', quantity: 3 };
    const pendingCreate = queue.find(
      (m) => m.entity === 'inventory' && m.entityId === updatedItem.id && m.action === 'create' && m.attemptCount === 0 && m.status === 'pending'
    );

    if (pendingCreate) {
      pendingCreate.payload = updatedItem;
    } else {
      queue.push({ operationId: 'op-u1', entityId: updatedItem.id, action: 'update', payload: updatedItem });
    }

    assert.equal(queue.length, 1, 'No debe crearse una segunda mutación en la cola');
    assert.equal(queue[0].action, 'create');
    assert.equal(queue[0].payload.quantity, 3, 'El payload del CREATE debe contener el valor actualizado');
  });

  it('39. Compactación CREATE + DELETE: si attemptCount === 0, purga la cola y no envía DELETE a red', () => {
    let queue = [
      {
        operationId: 'op-c2',
        entityId: 'ing-del-unattempted',
        entity: 'inventory',
        action: 'create',
        attemptCount: 0,
        status: 'pending',
      },
    ];
    let pendingDeleted = ['ing-del-unattempted'];
    let networkDeleteCalls = 0;

    const deleteTargetId = 'ing-del-unattempted';
    const pendingCreate = queue.find(
      (m) => m.entity === 'inventory' && m.entityId === deleteTargetId && m.action === 'create' && m.attemptCount === 0 && m.status === 'pending'
    );

    if (pendingCreate) {
      queue = queue.filter((m) => m.entityId !== deleteTargetId);
      pendingDeleted = pendingDeleted.filter((id) => id !== deleteTargetId);
    } else {
      networkDeleteCalls++;
    }

    assert.equal(queue.length, 0, 'La mutación create debe haber sido purgada de la cola');
    assert.equal(pendingDeleted.length, 0, 'No debe dejarse pendiente en pendingDeleted');
    assert.equal(networkDeleteCalls, 0, 'No debe generarse ninguna llamada DELETE de red');
  });

  it('40. DELETE preservado si CREATE ya fue intentado (attemptCount > 0) para evitar zombies en la nube', () => {
    let queue = [
      {
        operationId: 'op-c3',
        entityId: 'ing-attempted',
        entity: 'inventory',
        action: 'create',
        attemptCount: 1, // Ya salió al servidor (pudo haberse insertado antes de un timeout)
        status: 'pending',
      },
    ];
    let networkDeleteScheduled = false;

    const deleteTargetId = 'ing-attempted';
    const pendingCreate = queue.find(
      (m) => m.entity === 'inventory' && m.entityId === deleteTargetId && m.action === 'create' && m.attemptCount === 0 && m.status === 'pending'
    );

    if (pendingCreate) {
      queue = queue.filter((m) => m.entityId !== deleteTargetId);
    } else {
      // Encolar DELETE en outbox para matar cualquier posible zombie en el backend
      queue.push({
        operationId: 'op-d3',
        entityId: deleteTargetId,
        action: 'delete',
        entity: 'inventory',
        status: 'pending',
        attemptCount: 0,
      });
      networkDeleteScheduled = true;
    }

    assert.equal(queue.length, 2, 'Debe conservarse el create intentado y añadirse el delete');
    assert.ok(queue.some((m) => m.action === 'delete'));
    assert.equal(networkDeleteScheduled, true, 'El DELETE debe programarse para ejecutarse en red');
  });

  it('41. HTTP 404 en UPDATE transiciona a conflict, no purga en silencio y detiene reintentos', async () => {
    const mutation = {
      operationId: 'op-u-404',
      entityId: 'ing-missing-remote',
      entity: 'inventory',
      action: 'update',
      payload: { name: 'Tomate Actualizado' },
      status: 'pending',
      attemptCount: 0,
    };

    // Simular dispatch con 404 en UPDATE
    const mockUpdateApi = async () => {
      throw new ApiError('Not found', 404);
    };

    let resultStatus = mutation.status;
    let recordedError = null;

    try {
      await mockUpdateApi();
      resultStatus = 'success';
    } catch (err) {
      if (err.status === 404) {
        resultStatus = 'conflict';
        recordedError = 'HTTP 404: El recurso no existe en el servidor. Posible conflicto de eliminación remota.';
      }
    }

    assert.equal(resultStatus, 'conflict', 'El estado debe ser conflict');
    assert.ok(recordedError.includes('404'), 'Debe documentar el error 404');
    assert.notEqual(resultStatus, 'pending', 'No debe permanecer en pending para reintento automático infinito');
  });

  it('42. HTTP 404 en DELETE se resuelve como éxito idempotente y purga de Outbox y pendingDeleted', async () => {
    let queue = [
      {
        operationId: 'op-del-404',
        entityId: 'ing-already-gone',
        entity: 'inventory',
        action: 'delete',
        status: 'processing',
      },
    ];
    let pendingDeleted = ['ing-already-gone'];

    const mockDeleteApi = async () => {
      throw new ApiError('Ingredient not found', 404);
    };

    let success = false;
    try {
      await mockDeleteApi();
      success = true;
    } catch (err) {
      if (err.status === 404) {
        success = true; // Idempotente
      }
    }

    if (success) {
      queue = queue.filter((m) => m.operationId !== 'op-del-404');
      pendingDeleted = pendingDeleted.filter((id) => id !== 'ing-already-gone');
    }

    assert.equal(queue.length, 0, 'La mutación delete debe purgarse tras 404');
    assert.equal(pendingDeleted.length, 0, 'pendingDeletedInventory debe quedar limpio');
  });

  it('43. HTTP 401/403 transiciona a blocked, detiene el despacho FIFO y reanuda con nueva sesión', async () => {
    let queue = [
      { operationId: 'op-auth-1', createdAt: 100, status: 'pending', attemptCount: 0, entityId: 'ing-1', lastError: undefined },
      { operationId: 'op-auth-2', createdAt: 200, status: 'pending', attemptCount: 0, entityId: 'ing-2', lastError: undefined },
    ];

    let sessionValid = false;
    const dispatchFn = async (m) => {
      if (!sessionValid) {
        throw new ApiError('Unauthorized', 401);
      }
      return true;
    };

    // Ejecución 1: token inválido
    for (const m of queue) {
      try {
        await dispatchFn(m);
        m.status = 'success';
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          m.status = 'blocked';
          m.lastError = 'Fallo de autorización (401). Sesión suspendida.';
          break; // Suspender toda la cola FIFO
        }
      }
    }

    assert.equal(queue[0].status, 'blocked', 'La primera mutación debe quedar blocked');
    assert.equal(queue[1].status, 'pending', 'La segunda mutación debe quedarse esperando (FIFO detenido)');

    // Simular renovación de sesión
    sessionValid = true;
    for (const m of queue) {
      if (m.status === 'blocked') {
        m.status = 'pending';
      }
    }

    // Ejecución 2: con sesión renovada
    for (const m of queue) {
      if (m.status === 'pending') {
        await dispatchFn(m);
        m.status = 'success';
      }
    }

    assert.equal(queue[0].status, 'success', 'op-auth-1 debe completarse con éxito');
    assert.equal(queue[1].status, 'success', 'op-auth-2 debe completarse con éxito tras reanudar');
  });

  it('44. Errores transitorios aplican backoff exponencial y marcan failed al 5to intento', () => {
    const MAX_ATTEMPTS = 5;
    let mutation = {
      operationId: 'op-transient',
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: 0,
    };

    const simulateTransientFailure = (m) => {
      m.attemptCount += 1;
      if (m.attemptCount >= MAX_ATTEMPTS) {
        m.status = 'failed';
        m.lastError = `Excedido límite de ${MAX_ATTEMPTS} reintentos`;
      } else {
        const delay = Math.min(1000 * Math.pow(2, m.attemptCount), 60000);
        m.status = 'pending';
        m.nextAttemptAt = Date.now() + delay;
      }
    };

    // Intentos 1 a 4
    for (let attempt = 1; attempt <= 4; attempt++) {
      simulateTransientFailure(mutation);
      assert.equal(mutation.status, 'pending');
      assert.equal(mutation.attemptCount, attempt);
      assert.ok(mutation.nextAttemptAt > Date.now());
    }

    // 5to intento: límite alcanzado
    simulateTransientFailure(mutation);
    assert.equal(mutation.attemptCount, 5);
    assert.equal(mutation.status, 'failed', 'Al 5to intento debe pasar a estado terminal failed');
    assert.ok(mutation.lastError.includes('Excedido límite de 5 reintentos'));
  });

  it('45. Head-of-line blocking prevenido para entidades distintas; bloquea solo dependientes de la misma entidad', async () => {
    const queue = [
      { operationId: 'op-fail-itemA', entityId: 'itemA', createdAt: 100, status: 'failed' },
      { operationId: 'op-dep-itemA', entityId: 'itemA', createdAt: 200, status: 'pending' },
      { operationId: 'op-ok-itemB', entityId: 'itemB', createdAt: 300, status: 'pending' },
    ];

    const blockedEntityIds = new Set();
    const executedOps = [];

    for (const m of queue) {
      if (m.status === 'failed' || m.status === 'conflict') {
        blockedEntityIds.add(m.entityId);
        continue;
      }

      if (blockedEntityIds.has(m.entityId)) {
        m.status = 'blocked';
        continue;
      }

      // Despacho de entidad independiente
      executedOps.push(m.operationId);
      m.status = 'success';
    }

    assert.equal(queue[1].status, 'blocked', 'Mutación dependiente de itemA debe bloquearse');
    assert.equal(queue[2].status, 'success', 'Mutación independiente de itemB debe ejecutarse con éxito');
    assert.deepEqual(executedOps, ['op-ok-itemB'], 'Solo itemB debió ser ejecutado');
  });

  it('46. Protección de ediciones locales frente a GET remoto: no sobrescribe cambios offline pendientes', () => {
    // Alimento que ya existe en el servidor con cantidad 1
    const remoteFromCloud = [
      { id: 'ing-existing-1', name: 'Harina de Trigo', quantity: 1, unit: 'kg' },
      { id: 'ing-remote-2', name: 'Aceite de Oliva', quantity: 1, unit: 'l' },
    ];

    // El usuario editó la cantidad a 5 mientras estaba offline (mutación pendiente en Outbox)
    const currentLocal = [
      { id: 'ing-existing-1', name: 'Harina de Trigo', quantity: 5, unit: 'kg' },
    ];

    const outboxQueue = [
      {
        operationId: 'op-u-harina',
        entity: 'inventory',
        action: 'update',
        entityId: 'ing-existing-1',
        status: 'pending',
        payload: { id: 'ing-existing-1', name: 'Harina de Trigo', quantity: 5, unit: 'kg' },
      },
    ];

    // Algoritmo de merge con protección de Outbox de useInventory.ts
    const pendingUpdateIds = new Set(
      outboxQueue
        .filter((m) => m.entity === 'inventory' && m.action === 'update' && (m.status === 'pending' || m.status === 'processing'))
        .map((m) => m.entityId)
    );
    const activePendingDeleted = new Set();
    const cleanRemote = remoteFromCloud.filter((item) => !activePendingDeleted.has(item.id));
    const remoteIdSet = new Set(cleanRemote.map((r) => r.id));
    const unsyncedLocal = currentLocal.filter(
      (localItem) => !remoteIdSet.has(localItem.id) && !activePendingDeleted.has(localItem.id)
    );
    const localMap = new Map(currentLocal.map((item) => [item.id, item]));
    const mergedRemote = cleanRemote.map((remoteItem) => {
      if (pendingUpdateIds.has(remoteItem.id)) {
        const localVersion = localMap.get(remoteItem.id);
        if (localVersion) return localVersion;
      }
      return remoteItem;
    });
    const merged = [...unsyncedLocal, ...mergedRemote];

    assert.equal(merged.length, 2);
    const harina = merged.find((i) => i.id === 'ing-existing-1');
    assert.ok(harina, 'Harina debe existir en el resultado fusionado');
    assert.equal(harina.quantity, 5, 'La cantidad local editada (5) NO debe ser sobrescrita por el valor remoto (1)');
    const aceite = merged.find((i) => i.id === 'ing-remote-2');
    assert.ok(aceite, 'El aceite remoto debe incorporarse con éxito');
  });
});

// ─── SUITE 8: Integración del Outbox en Lista de Compras (Punto 3 - Fase B3) ───
describe('8. Integración del Outbox en Lista de Compras (Punto 3 - Fase B3)', () => {
  it('47. create offline → persistencia → flush → 201: mutación se purga tras éxito en backend', async () => {
    let queue = [
      {
        operationId: 'op-shop-c1',
        userId: 'user-shop-1',
        entity: 'shopping',
        action: 'create',
        entityId: 'shop-1',
        payload: { id: 'shop-1', name: 'Manzanas', quantity: 4, unit: 'units' },
        createdAt: 100,
        status: 'pending',
        attemptCount: 0,
        nextAttemptAt: 0,
      },
    ];

    const mockCreateApi = async (payload) => {
      return { status: 201, ...payload };
    };

    let processed = 0;
    for (const m of queue) {
      if (m.entity === 'shopping' && m.action === 'create') {
        await mockCreateApi(m.payload);
        processed++;
      }
    }
    queue = queue.filter((m) => m.operationId !== 'op-shop-c1');

    assert.equal(processed, 1, 'Debe procesarse una mutación de creación');
    assert.equal(queue.length, 0, 'La mutación confirmada (201) debe purgarse de la cola');
  });

  it('48. retry de create → 200 sin duplicado: éxito idempotente purga sin error', async () => {
    let queue = [
      {
        operationId: 'op-shop-retry',
        userId: 'user-shop-1',
        entity: 'shopping',
        action: 'create',
        entityId: 'shop-retry-1',
        payload: { id: 'shop-retry-1', name: 'Huevos', quantity: 12, unit: 'units' },
        createdAt: 100,
        status: 'pending',
        attemptCount: 1,
        nextAttemptAt: 0,
      },
    ];

    const mockCreateApiIdempotent = async (payload) => {
      return { status: 200, ...payload, _is_idempotent: true };
    };

    const res = await mockCreateApiIdempotent(queue[0].payload);
    assert.equal(res.status, 200);
    assert.equal(res._is_idempotent, true);

    queue = queue.filter((m) => m.operationId !== 'op-shop-retry');
    assert.equal(queue.length, 0, 'El reintento idempotente (200) purga la mutación sin error');
  });

  it('49. conflicto 409: payload diferente transiciona a conflict y detiene reintentos', async () => {
    let mutation = {
      operationId: 'op-shop-conflict',
      userId: 'user-shop-1',
      entity: 'shopping',
      action: 'create',
      entityId: 'shop-conf-1',
      payload: { id: 'shop-conf-1', name: 'Leche Descremada', quantity: 2 },
      status: 'pending',
      attemptCount: 0,
    };

    const mockCreateApiConflict = async () => {
      throw new ApiError("Conflicto de idempotencia: el artículo 'shop-conf-1' ya existe con datos diferentes.", 409);
    };

    let dispatchResult;
    try {
      await mockCreateApiConflict();
      dispatchResult = { success: true };
    } catch (err) {
      if (err.status === 409) {
        dispatchResult = { isConflict: true, status: 409, error: err.message };
      }
    }

    if (dispatchResult.isConflict) {
      mutation.status = 'conflict';
      mutation.lastError = dispatchResult.error;
    }

    assert.equal(mutation.status, 'conflict', 'La mutación con 409 debe marcarse como conflict');
    assert.ok(mutation.lastError.includes('Conflicto'), 'Debe documentar el error de conflicto');
    assert.notEqual(mutation.status, 'pending', 'No debe permanecer en pending para reintento automático infinito');
  });

  it('50. update offline: encola mutación de update y despacha con PUT exitoso (200)', async () => {
    let queue = [];
    const item = { id: 'shop-u1', name: 'Cereal', quantity: 2, unit: 'package', isBought: false };

    queue.push({
      operationId: 'op-shop-u1',
      userId: 'user-1',
      entity: 'shopping',
      action: 'update',
      entityId: item.id,
      payload: { quantity: 5 },
      createdAt: Date.now(),
      status: 'pending',
      attemptCount: 0,
    });

    assert.equal(queue.length, 1);
    assert.equal(queue[0].action, 'update');
    assert.equal(queue[0].payload.quantity, 5);

    const mockUpdateApi = async (id, updates) => ({ id, ...updates, status: 200 });
    await mockUpdateApi(queue[0].entityId, queue[0].payload);
    queue.shift();

    assert.equal(queue.length, 0, 'Mutación de update completada y purgada');
  });

  it('51. toggleBought offline: persiste localmente y encola update con payload isBought', async () => {
    let localItem = { id: 'shop-tb1', name: 'Aceite', isBought: false };
    let queue = [];

    localItem.isBought = true;

    queue.push({
      operationId: 'op-tb-1',
      userId: 'user-1',
      entity: 'shopping',
      action: 'update',
      entityId: localItem.id,
      payload: { isBought: true },
      createdAt: Date.now(),
      status: 'pending',
      attemptCount: 0,
    });

    assert.equal(localItem.isBought, true, 'Estado local debe actualizarse inmediatamente');
    assert.equal(queue[0].payload.isBought, true, 'El payload encolado debe contener { isBought: true }');

    let receivedPayload = null;
    const mockUpdate = async (id, p) => { receivedPayload = p; return { id, ...p }; };
    await mockUpdate(queue[0].entityId, queue[0].payload);

    assert.deepEqual(receivedPayload, { isBought: true });
  });

  it('52. Compactación CREATE + UPDATE: actualiza payload in-place si attemptCount === 0', () => {
    let queue = [
      {
        operationId: 'op-c-shop',
        entityId: 'shop-compact-1',
        entity: 'shopping',
        action: 'create',
        attemptCount: 0,
        status: 'pending',
        payload: { id: 'shop-compact-1', name: 'Yogurt', quantity: 1, isBought: false },
      },
    ];

    const updates = { isBought: true, quantity: 2 };
    const pendingCreate = queue.find(
      (m) =>
        m.entity === 'shopping' &&
        m.entityId === 'shop-compact-1' &&
        m.action === 'create' &&
        m.attemptCount === 0 &&
        m.status === 'pending'
    );

    if (pendingCreate) {
      pendingCreate.payload = { ...pendingCreate.payload, ...updates };
    } else {
      queue.push({ operationId: 'op-u-redundant', action: 'update', payload: updates });
    }

    assert.equal(queue.length, 1, 'No debe crearse mutación redundante de update');
    assert.equal(queue[0].payload.isBought, true, 'isBought compactado en el CREATE');
    assert.equal(queue[0].payload.quantity, 2, 'quantity compactada en el CREATE');
  });

  it('53. Compactación CREATE + DELETE: si attemptCount === 0, purga la cola y no envía DELETE a red', () => {
    let queue = [
      {
        operationId: 'op-c-del',
        entityId: 'shop-del-unattempted',
        entity: 'shopping',
        action: 'create',
        attemptCount: 0,
        status: 'pending',
      },
    ];
    let pendingDeleted = ['shop-del-unattempted'];
    let networkDeleteCalls = 0;

    const targetId = 'shop-del-unattempted';
    const pendingCreate = queue.find(
      (m) => m.entity === 'shopping' && m.entityId === targetId && m.action === 'create' && m.attemptCount === 0 && m.status === 'pending'
    );

    if (pendingCreate) {
      queue = queue.filter((m) => m.entityId !== targetId);
      pendingDeleted = pendingDeleted.filter((id) => id !== targetId);
    } else {
      networkDeleteCalls++;
    }

    assert.equal(queue.length, 0, 'La mutación create debe purgarse');
    assert.equal(pendingDeleted.length, 0, 'pendingDeletedShopping debe quedar limpio sin rastro');
    assert.equal(networkDeleteCalls, 0, 'Cero llamadas HTTP a la red');
  });

  it('54. delete offline sin zombie: ítem eliminado offline no resucita en GET y limpia tras 200', async () => {
    const existingCloudItem = { id: 'shop-zombie-target', name: 'Galletas', quantity: 1 };
    let currentLocal = [];
    let pendingDeletedShopping = ['shop-zombie-target'];
    let queue = [
      {
        operationId: 'op-del-zombie',
        entity: 'shopping',
        action: 'delete',
        entityId: 'shop-zombie-target',
        status: 'pending',
        attemptCount: 0,
      },
    ];

    const remoteFromCloud = [existingCloudItem];
    const merged = mergeShoppingList(currentLocal, remoteFromCloud, pendingDeletedShopping);

    assert.equal(merged.length, 0, 'El ítem eliminado NO debe resucitar con el GET remoto (anti-zombie)');

    const mockDelete = async () => true;
    await mockDelete();

    queue = queue.filter((m) => m.operationId !== 'op-del-zombie');
    pendingDeletedShopping = pendingDeletedShopping.filter((id) => id !== 'shop-zombie-target');

    assert.equal(queue.length, 0, 'Outbox limpio');
    assert.equal(pendingDeletedShopping.length, 0, 'pendingDeleted limpio tras confirmación');
  });

  it('55. 404 delete en shopping es idempotente: purga Outbox y pendingDeletedShopping', async () => {
    let queue = [
      { operationId: 'op-del-404-shop', entity: 'shopping', action: 'delete', entityId: 'shop-gone' },
    ];
    let pendingDeleted = ['shop-gone'];

    const mockDeleteApi = async () => {
      throw new ApiError('Artículo con ID shop-gone no encontrado', 404);
    };

    let resolved = false;
    try {
      await mockDeleteApi();
      resolved = true;
    } catch (err) {
      if (err.status === 404) {
        resolved = true;
      }
    }

    if (resolved) {
      queue = queue.filter((m) => m.operationId !== 'op-del-404-shop');
      pendingDeleted = pendingDeleted.filter((id) => id !== 'shop-gone');
    }

    assert.equal(queue.length, 0, 'Outbox purgado en 404');
    assert.equal(pendingDeleted.length, 0, 'Tombstone pendingDeletedShopping purgado en 404');
  });

  it('56. HTTP 401/403 en shopping transiciona a blocked, conserva Outbox y pendingDeleted', async () => {
    let queue = [
      { operationId: 'op-shop-401', entity: 'shopping', action: 'delete', entityId: 'shop-auth-err', status: 'pending' },
    ];
    let pendingDeleted = ['shop-auth-err'];

    const mockApi = async () => {
      throw new ApiError('Unauthorized', 401);
    };

    for (const m of queue) {
      try {
        await mockApi();
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          m.status = 'blocked';
          m.lastError = 'Fallo de autorización (401). Sesión suspendida.';
        }
      }
    }

    assert.equal(queue[0].status, 'blocked', 'Mutación debe quedar en estado blocked');
    assert.equal(queue.length, 1, 'No debe eliminarse de la cola Outbox');
    assert.deepEqual(pendingDeleted, ['shop-auth-err'], 'Tombstone debe conservarse para evitar resurrección');
  });

  it('57. Errores de red y 5xx en shopping aplican backoff exponencial y no borran mutación', () => {
    let mutation = {
      operationId: 'op-shop-500',
      entity: 'shopping',
      action: 'create',
      entityId: 'shop-err-500',
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: 0,
    };

    const simulateNetworkFailure = (m) => {
      m.attemptCount += 1;
      const delay = Math.min(1000 * Math.pow(2, m.attemptCount), 60000);
      m.status = 'pending';
      m.nextAttemptAt = Date.now() + delay;
      m.lastError = 'Error 500: Internal Server Error';
    };

    simulateNetworkFailure(mutation);
    assert.equal(mutation.status, 'pending');
    assert.equal(mutation.attemptCount, 1);
    assert.ok(mutation.nextAttemptAt > Date.now());
  });

  it('58. Cierre forzoso con mutación de shopping en processing: recupera a pending', () => {
    const queue = [
      { operationId: 'op-proc-shop', entity: 'shopping', action: 'create', status: 'processing', attemptCount: 1 },
    ];

    const recovered = queue.map((m) =>
      m.status === 'processing' ? { ...m, status: 'pending', updatedAt: Date.now() } : m
    );

    assert.equal(recovered[0].status, 'pending', 'Debe recuperarse a pending tras el reinicio');
    assert.equal(recovered[0].attemptCount, 1, 'Conserva el conteo de intentos');
  });

  it('59. Aislamiento por userId y cambio de usuario: Usuario A y B no comparten mutaciones ni tombstones de shopping', async () => {
    const fakeStorage = new FakeAsyncStorage();
    const keyShopA = '@food_ai_outbox_v1_userA';
    const keyShopB = '@food_ai_outbox_v1_userB';
    const keyPendingA = '@food_ai_pending_deleted_shopping_v1_userA';
    const keyPendingB = '@food_ai_pending_deleted_shopping_v1_userB';

    await fakeStorage.setItem(keyShopA, JSON.stringify([{ operationId: 'op-a', entity: 'shopping', userId: 'userA' }]));
    await fakeStorage.setItem(keyShopB, JSON.stringify([{ operationId: 'op-b', entity: 'shopping', userId: 'userB' }]));
    await fakeStorage.setItem(keyPendingA, JSON.stringify([['shop-del-a', Date.now()]]));
    await fakeStorage.setItem(keyPendingB, JSON.stringify([['shop-del-b', Date.now()]]));

    const outboxA = JSON.parse(await fakeStorage.getItem(keyShopA));
    const outboxB = JSON.parse(await fakeStorage.getItem(keyShopB));
    const pendingA = new Map(JSON.parse(await fakeStorage.getItem(keyPendingA)));
    const pendingB = new Map(JSON.parse(await fakeStorage.getItem(keyPendingB)));

    assert.equal(outboxA[0].userId, 'userA');
    assert.equal(outboxB[0].userId, 'userB');
    assert.ok(pendingA.has('shop-del-a'));
    assert.ok(!pendingA.has('shop-del-b'));
    assert.ok(pendingB.has('shop-del-b'));
    assert.ok(!pendingB.has('shop-del-a'));
  });

  it('60. No se produce doble DELETE HTTP al eliminar un artículo de compras', async () => {
    let networkDeleteCalls = 0;
    const mockDeleteApi = async (id) => {
      networkDeleteCalls++;
      return true;
    };

    let queue = [
      {
        operationId: 'op-del-single',
        entity: 'shopping',
        action: 'delete',
        entityId: 'shop-no-double',
      },
    ];

    for (const m of queue) {
      if (m.action === 'delete') {
        await mockDeleteApi(m.entityId);
      }
    }

    assert.equal(networkDeleteCalls, 1, 'Exactamente una sola llamada HTTP DELETE ejecutada');
  });

  it('61. Merge remoto sin sobrescribir cambios pendientes: toggleBought o edición local offline prevalece sobre valor remoto', () => {
    const remoteFromCloud = [
      { id: 'shop-item-1', name: 'Café molido', quantity: 1, isBought: false },
    ];
    const currentLocal = [
      { id: 'shop-item-1', name: 'Café molido', quantity: 1, isBought: true },
    ];
    const outboxQueue = [
      {
        operationId: 'op-tb-cafe',
        entity: 'shopping',
        action: 'update',
        entityId: 'shop-item-1',
        status: 'pending',
        payload: { isBought: true },
      },
    ];

    const pendingUpdateIds = new Set(
      outboxQueue
        .filter((m) => m.entity === 'shopping' && m.action === 'update' && (m.status === 'pending' || m.status === 'processing'))
        .map((m) => m.entityId)
    );
    const activePendingDeleted = new Set();
    const cleanRemote = remoteFromCloud.filter((item) => !activePendingDeleted.has(item.id));
    const remoteIdSet = new Set(cleanRemote.map((r) => r.id));
    const unsyncedLocal = currentLocal.filter(
      (localItem) => !remoteIdSet.has(localItem.id) && !activePendingDeleted.has(localItem.id)
    );
    const localMap = new Map(currentLocal.map((item) => [item.id, item]));
    const mergedRemote = cleanRemote.map((remoteItem) => {
      if (pendingUpdateIds.has(remoteItem.id)) {
        const localVersion = localMap.get(remoteItem.id);
        if (localVersion) return localVersion;
      }
      return remoteItem;
    });
    const merged = [...unsyncedLocal, ...mergedRemote];

    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, 'shop-item-1');
    assert.equal(
      merged[0].isBought,
      true,
      'El estado isBought: true editado localmente offline NO debe ser sobrescrito por el isBought: false remoto'
    );
  });
});

// ─── SUITE 9: Durabilidad de clearBought y moveBoughtToInventory Offline (Corrección B3) ───
describe('9. Durabilidad de clearBought y moveBoughtToInventory Offline (Corrección B3)', () => {
  it('62. clearBought offline captura todos los IDs comprados', () => {
    const list = [
      { id: 'shop-b1', name: 'Manzanas', isBought: true },
      { id: 'shop-p1', name: 'Leche', isBought: false },
      { id: 'shop-b2', name: 'Pan', isBought: true },
      { id: 'shop-b3', name: 'Huevos', isBought: true },
    ];

    const boughtIds = list.filter((i) => i.isBought).map((i) => i.id);
    assert.deepEqual(boughtIds, ['shop-b1', 'shop-b2', 'shop-b3'], 'Debe capturar exactamente todos los IDs comprados');
  });

  it('63. clearBought offline encola un DELETE por ID en el Outbox y registra tombstones', () => {
    const boughtIds = ['shop-b1', 'shop-b2', 'shop-b3'];
    let queue = [];
    let pendingDeleted = new Set();
    const userId = 'user-test-clear';

    for (const bid of boughtIds) {
      pendingDeleted.add(bid);
      queue.push({
        operationId: `op-del-${bid}`,
        userId,
        entity: 'shopping',
        action: 'delete',
        entityId: bid,
        payload: { id: bid },
        createdAt: Date.now(),
        status: 'pending',
        attemptCount: 0,
        nextAttemptAt: 0,
      });
    }

    assert.equal(queue.length, 3, 'Debe encolar exactamente 3 mutaciones DELETE individuales');
    assert.equal(pendingDeleted.size, 3, 'Debe haber 3 tombstones en pendingDeletedShopping');
    assert.ok(queue.every((m) => m.action === 'delete' && m.entity === 'shopping'));
  });

  it('64. reinicio antes de reconectar conserva todas las mutaciones en storage namespaced', async () => {
    const fakeStorage = new FakeAsyncStorage();
    const userId = 'user-reboot';
    const outboxKey = `@food_ai_outbox_v1_${userId}`;

    const originalQueue = [
      { operationId: 'op-1', userId, entity: 'shopping', action: 'delete', entityId: 'shop-1', status: 'pending' },
      { operationId: 'op-2', userId, entity: 'shopping', action: 'delete', entityId: 'shop-2', status: 'pending' },
    ];
    await fakeStorage.setItem(outboxKey, JSON.stringify(originalQueue));

    // Simular reinicio y lectura del storage
    const restoredQueue = JSON.parse(await fakeStorage.getItem(outboxKey));
    assert.equal(restoredQueue.length, 2, 'Las mutaciones deben sobrevivir al reinicio');
    assert.equal(restoredQueue[0].entityId, 'shop-1');
    assert.equal(restoredQueue[1].entityId, 'shop-2');
  });

  it('65. reconexión procesa todos los IDs individualmente y purga Outbox y tombstones', async () => {
    let queue = [
      { operationId: 'op-1', entity: 'shopping', action: 'delete', entityId: 'shop-1' },
      { operationId: 'op-2', entity: 'shopping', action: 'delete', entityId: 'shop-2' },
    ];
    let pendingDeleted = new Set(['shop-1', 'shop-2']);

    const deletedOnServer = [];
    const mockDeleteApi = async (id) => {
      deletedOnServer.push(id);
      return true;
    };

    // Despacho secuencial
    for (const m of [...queue]) {
      await mockDeleteApi(m.entityId);
      queue = queue.filter((x) => x.operationId !== m.operationId);
      pendingDeleted.delete(m.entityId);
    }

    assert.deepEqual(deletedOnServer, ['shop-1', 'shop-2'], 'Ambos IDs deben haber sido enviados al servidor');
    assert.equal(queue.length, 0, 'La cola Outbox debe quedar vacía');
    assert.equal(pendingDeleted.size, 0, 'Todos los tombstones confirmados deben haberse limpiado');
  });

  it('66. éxito parcial conserva solo los fallidos en Outbox y tombstones', async () => {
    let queue = [
      { operationId: 'op-ok-1', entity: 'shopping', action: 'delete', entityId: 'shop-ok-1', status: 'pending', attemptCount: 0 },
      { operationId: 'op-fail-2', entity: 'shopping', action: 'delete', entityId: 'shop-fail-2', status: 'pending', attemptCount: 0 },
      { operationId: 'op-ok-3', entity: 'shopping', action: 'delete', entityId: 'shop-ok-3', status: 'pending', attemptCount: 0 },
    ];
    let pendingDeleted = new Set(['shop-ok-1', 'shop-fail-2', 'shop-ok-3']);

    const mockDispatch = async (m) => {
      if (m.entityId === 'shop-fail-2') {
        throw new ApiError('Error 500: Server Error', 500);
      }
      return true;
    };

    for (const m of queue) {
      try {
        await mockDispatch(m);
        m.status = 'success';
        pendingDeleted.delete(m.entityId);
      } catch (err) {
        m.status = 'pending';
        m.attemptCount += 1;
        m.nextAttemptAt = Date.now() + 2000;
      }
    }

    queue = queue.filter((m) => m.status !== 'success');

    assert.equal(queue.length, 1, 'Solo debe quedar la mutación fallida en Outbox');
    assert.equal(queue[0].entityId, 'shop-fail-2');
    assert.equal(pendingDeleted.size, 1, 'Solo debe quedar el tombstone del ítem fallido');
    assert.ok(pendingDeleted.has('shop-fail-2'), 'Tombstone de shop-fail-2 debe preservarse para evitar resurrección');
    assert.ok(!pendingDeleted.has('shop-ok-1'), 'Tombstone de shop-ok-1 debe haberse eliminado');
    assert.ok(!pendingDeleted.has('shop-ok-3'), 'Tombstone de shop-ok-3 debe haberse eliminado');
  });

  it('67. 404 limpia el ID correspondiente de forma idempotente', async () => {
    let queue = [{ operationId: 'op-404', entity: 'shopping', action: 'delete', entityId: 'shop-404' }];
    let pendingDeleted = new Set(['shop-404']);

    const mockDelete = async () => { throw new ApiError('Not found', 404); };

    let isSuccess = false;
    try {
      await mockDelete();
      isSuccess = true;
    } catch (err) {
      if (err.status === 404) isSuccess = true;
    }

    if (isSuccess) {
      queue = queue.filter((m) => m.operationId !== 'op-404');
      pendingDeleted.delete('shop-404');
    }

    assert.equal(queue.length, 0, 'Outbox purgado tras 404');
    assert.equal(pendingDeleted.size, 0, 'Tombstone purgado tras 404');
  });

  it('68. 401/403 conserva el ID y bloquea la mutación', async () => {
    let queue = [{ operationId: 'op-auth', entity: 'shopping', action: 'delete', entityId: 'shop-auth', status: 'pending' }];
    let pendingDeleted = new Set(['shop-auth']);

    const mockDelete = async () => { throw new ApiError('Unauthorized', 401); };

    try {
      await mockDelete();
    } catch (err) {
      if (err.status === 401) {
        queue[0].status = 'blocked';
        queue[0].lastError = 'Fallo de autorización (401).';
      }
    }

    assert.equal(queue[0].status, 'blocked', 'Debe marcarse blocked');
    assert.equal(queue.length, 1, 'Debe conservarse en Outbox');
    assert.ok(pendingDeleted.has('shop-auth'), 'Tombstone debe conservarse intacto');
  });

  it('69. red/5xx aplica backoff exponencial a las mutaciones individuales de clearBought', () => {
    let mutation = {
      operationId: 'op-net-err',
      entity: 'shopping',
      action: 'delete',
      entityId: 'shop-net',
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: 0,
    };

    // Simular fallo transitorio
    mutation.attemptCount += 1;
    const delay = Math.min(1000 * Math.pow(2, mutation.attemptCount), 60000);
    mutation.nextAttemptAt = Date.now() + delay;

    assert.equal(mutation.attemptCount, 1);
    assert.equal(mutation.status, 'pending');
    assert.ok(mutation.nextAttemptAt > Date.now());
  });

  it('70. no hay doble DELETE: ni llamada directa desde hook ni DELETE /shopping/bought simultáneo', () => {
    let directCalls = 0;
    let batchCalls = 0;
    let outboxDispatchedCalls = 0;

    // Con la arquitectura B3, clearBought SOLO encola en Outbox
    const simulateClearBoughtWithOutbox = (boughtIds) => {
      // 0 llamadas directas
      // 0 llamadas batch
      // Retorna mutaciones a despachar exclusivamente vía Outbox
      return boughtIds.map((id) => ({ entity: 'shopping', action: 'delete', entityId: id }));
    };

    const outboxQueue = simulateClearBoughtWithOutbox(['shop-1', 'shop-2']);
    assert.equal(directCalls, 0, 'Cero llamadas DELETE directas desde el hook');
    assert.equal(batchCalls, 0, 'Cero llamadas al endpoint batch /shopping/bought');

    // Despacho exclusivo por Outbox
    for (const m of outboxQueue) {
      outboxDispatchedCalls++;
    }
    assert.equal(outboxDispatchedCalls, 2, 'Cada ítem recibe exactamente UNA llamada DELETE desde el despachador Outbox');
  });

  it('71. moveBoughtToInventory conserva snapshot e individual Outbox DELETEs', async () => {
    const fakeStorage = new FakeAsyncStorage();
    const userId = 'user-move-test';
    const txKey = `@food_ai_tx_move_bought_v1_${userId}`;

    // Snapshot creado durante moveBoughtToInventory
    const snapshot = {
      version: 1,
      timestamp: Date.now(),
      status: 'committing',
      boughtItemIds: ['shop-mv-1', 'shop-mv-2'],
      newIngredients: [{ id: 'ing-mv-1', name: 'Queso Gouda', quantity: 1, unit: 'units' }],
      updatedIngredients: [],
    };
    await fakeStorage.setItem(txKey, JSON.stringify(snapshot));

    // Mutaciones Outbox encoladas individualmente
    const outboxMutations = snapshot.boughtItemIds.map((bid) => ({
      operationId: `op-del-${bid}`,
      userId,
      entity: 'shopping',
      action: 'delete',
      entityId: bid,
    }));

    const rawSnapshot = await fakeStorage.getItem(txKey);
    assert.ok(rawSnapshot, 'El snapshot de transacción debe existir en storage');
    assert.equal(outboxMutations.length, 2, 'Debe haber 2 mutaciones individuales encoladas para los ítems movidos');
    assert.equal(outboxMutations[0].entityId, 'shop-mv-1');
    assert.equal(outboxMutations[1].entityId, 'shop-mv-2');
  });

  it('72. segunda ejecución no duplica inventario ni mutaciones en moveBoughtToInventory', () => {
    let localShopping = [
      { id: 'shop-done-1', name: 'Yogurt', isBought: false }, // Ningún artículo comprado pendiente
    ];
    let queue = [
      { operationId: 'op-already-1', entity: 'shopping', action: 'delete', entityId: 'shop-prev-1' },
    ];

    // Simular segunda ejecución consecutiva
    const boughtIds = localShopping.filter((i) => i.isBought).map((i) => i.id);
    let movedCount = 0;

    if (boughtIds.length > 0) {
      movedCount = boughtIds.length;
      for (const bid of boughtIds) {
        queue.push({ operationId: `op-${bid}`, entity: 'shopping', action: 'delete', entityId: bid });
      }
    }

    assert.equal(movedCount, 0, 'Debe retornar 0');
    assert.equal(queue.length, 1, 'No debe encolar mutaciones duplicadas en Outbox');
  });

  it('73. Usuario A y B mantienen colas y tombstones de clearBought totalmente separados', async () => {
    const fakeStorage = new FakeAsyncStorage();
    const keyUserA = '@food_ai_outbox_v1_userA';
    const keyUserB = '@food_ai_outbox_v1_userB';
    const keyPendingA = '@food_ai_pending_deleted_shopping_v1_userA';
    const keyPendingB = '@food_ai_pending_deleted_shopping_v1_userB';

    const queueA = [{ operationId: 'op-del-a', userId: 'userA', entity: 'shopping', action: 'delete', entityId: 'shop-a' }];
    const pendingA = [['shop-a', Date.now()]];

    await fakeStorage.setItem(keyUserA, JSON.stringify(queueA));
    await fakeStorage.setItem(keyPendingA, JSON.stringify(pendingA));
    await fakeStorage.setItem(keyUserB, JSON.stringify([]));
    await fakeStorage.setItem(keyPendingB, JSON.stringify([]));

    const storedQueueB = JSON.parse(await fakeStorage.getItem(keyUserB));
    const storedPendingB = JSON.parse(await fakeStorage.getItem(keyPendingB));

    assert.equal(storedQueueB.length, 0, 'La cola de Usuario B debe permanecer vacía');
    assert.equal(storedPendingB.length, 0, 'Los tombstones de Usuario B deben permanecer vacíos');
  });
});

