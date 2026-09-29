import { Ingredient, OutboxMutation } from '../types';
import { LocalStorage } from '../storage/local-storage';
import { generateOperationId } from '../utils/uuid';
import { flushOutbox } from './outbox-dispatcher';

/**
 * Cambios de la despensa que deben llegar al servidor (cola Outbox).
 * Los usan useInventory (editar/borrar desde la Despensa) y recipe-service (descontar al preparar una receta).
 * Sin este paso el cambio solo vive en el teléfono y la siguiente sincronización lo revierte.
 */
function requireUser(): string {
  const userId = LocalStorage.getCurrentUserId();
  if (!userId) throw new Error('No hay usuario autenticado');
  return userId;
}

function baseMutation<T>(userId: string, action: 'create' | 'update' | 'delete', entityId: string, payload: T): OutboxMutation<T> {
  return {
    operationId: generateOperationId(),
    userId,
    entity: 'inventory',
    action,
    entityId,
    payload,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'pending',
    attemptCount: 0,
    nextAttemptAt: 0,
  };
}

/** Busca un «create» que nunca salió a la red: se puede compactar sin llamar al servidor. */
function findUnsentCreate(id: string) {
  return LocalStorage.getOutboxQueue().find(
    (m) =>
      m.entity === 'inventory' &&
      m.entityId === id &&
      m.action === 'create' &&
      m.attemptCount === 0 &&
      m.status === 'pending'
  );
}

export async function updateIngredientSynced(item: Ingredient, options: { flush?: boolean } = {}): Promise<void> {
  const userId = requireUser();
  await LocalStorage.updateIngredient(item);
  const pendingCreate = findUnsentCreate(item.id);
  if (pendingCreate) {
    await LocalStorage.updateOutboxMutation(pendingCreate.operationId, { payload: item });
  } else {
    await LocalStorage.enqueueOutboxMutation(baseMutation(userId, 'update', item.id, item));
  }
  if (options.flush !== false) flushOutbox().catch(() => {});
}

export async function deleteIngredientSynced(id: string, options: { flush?: boolean } = {}): Promise<void> {
  const userId = requireUser();
  await LocalStorage.deleteIngredient(id);
  const pendingCreate = findUnsentCreate(id);
  if (pendingCreate) {
    // Nunca llegó al servidor: se purga la cola de ese alimento y no se envía DELETE.
    for (const m of LocalStorage.getOutboxQueue()) {
      if (m.entity === 'inventory' && m.entityId === id) {
        await LocalStorage.removeOutboxMutation(m.operationId);
      }
    }
    await LocalStorage.removePendingDeletedInventory(id).catch(() => {});
  } else {
    await LocalStorage.enqueueOutboxMutation(baseMutation(userId, 'delete', id, { id }));
  }
  if (options.flush !== false) flushOutbox().catch(() => {});
}

