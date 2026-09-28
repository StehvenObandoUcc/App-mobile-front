import { LocalStorage } from '../storage/local-storage';
import { OutboxMutation } from '../types';
import {
  createInventoryItemWithApi,
  updateInventoryItemWithApi,
  deleteInventoryItemWithApi,
  fetchInventoryFromApi,
  createShoppingItemWithApi,
  updateShoppingItemWithApi,
  deleteShoppingItemWithApi,
  fetchShoppingListFromApi,
} from './api-client';
import { AuthService } from './auth-service';

const MAX_ATTEMPTS = 5;
let isFlushing = false;

interface DispatchResult {
  success?: boolean;
  isAuth?: boolean;
  isConflict?: boolean;
  isFatal?: boolean;
  isTransient?: boolean;
  error?: string;
  status?: number;
}

/**
 * Ejecuta la llamada HTTP correspondiente para una mutación individual.
 */
async function dispatchMutation(mutation: OutboxMutation): Promise<DispatchResult> {
  const { entity, action, entityId, payload } = mutation;

  try {
    if (entity === 'inventory') {
      if (action === 'create') {
        try {
          await createInventoryItemWithApi(payload);
          return { success: true };
        } catch (createErr: any) {
          const errMsg = String(createErr?.message || '').toLowerCase();
          const isDuplicate =
            errMsg.includes('already exists') ||
            errMsg.includes('duplicate') ||
            errMsg.includes('unique') ||
            createErr?.status === 409;

          if (isDuplicate) {
            // Verificar si el recurso ya fue insertado previamente (timeout en respuesta previa)
            try {
              const currentInv = await fetchInventoryFromApi();
              if (Array.isArray(currentInv) && currentInv.some((item) => item.id === entityId)) {
                return { success: true }; // Éxito idempotente
              }
            } catch {
              // Si no se puede verificar, re-lanzar error original
            }
          }
          throw createErr;
        }
      }

      if (action === 'update') {
        try {
          await updateInventoryItemWithApi(entityId, payload);
          return { success: true };
        } catch (updateErr: any) {
          if (updateErr?.status === 404) {
            // 404 en UPDATE: conflicto por eliminación remota
            return {
              isConflict: true,
              status: 404,
              error: 'HTTP 404: El recurso no existe en el servidor. Posible conflicto de eliminación remota.',
            };
          }
          throw updateErr;
        }
      }

      if (action === 'delete') {
        try {
          await deleteInventoryItemWithApi(entityId);
        } catch (delErr: any) {
          if (delErr?.status === 404) {
            // 404 en DELETE: idempotente, ya no existe en el servidor
          } else {
            throw delErr;
          }
        }
        await LocalStorage.removePendingDeletedInventory(entityId).catch(() => {});
        return { success: true };
      }
    }

    if (entity === 'shopping') {
      if (action === 'create') {
        try {
          await createShoppingItemWithApi(payload);
          return { success: true };
        } catch (createErr: any) {
          const errMsg = String(createErr?.message || '').toLowerCase();
          const isDuplicate =
            errMsg.includes('already exists') ||
            errMsg.includes('duplicate') ||
            errMsg.includes('unique') ||
            createErr?.status === 409;

          if (isDuplicate) {
            // Verificar si el recurso ya fue insertado previamente con datos idénticos (200 o timeout en respuesta previa)
            try {
              const currentShop = await fetchShoppingListFromApi();
              if (Array.isArray(currentShop) && currentShop.some((item) => item.id === entityId)) {
                return { success: true }; // Éxito idempotente
              }
            } catch {
              // Si no se puede verificar, re-lanzar error original
            }
          }
          throw createErr;
        }
      }

      if (action === 'update') {
        try {
          await updateShoppingItemWithApi(entityId, payload);
          return { success: true };
        } catch (updateErr: any) {
          if (updateErr?.status === 404) {
            // 404 en UPDATE: conflicto por eliminación remota
            return {
              isConflict: true,
              status: 404,
              error: 'HTTP 404: El artículo de compras no existe en el servidor. Posible conflicto de eliminación remota.',
            };
          }
          throw updateErr;
        }
      }

      if (action === 'delete') {
        try {
          await deleteShoppingItemWithApi(entityId);
        } catch (delErr: any) {
          if (delErr?.status === 404) {
            // 404 en DELETE: idempotente, ya no existe en el servidor
          } else {
            throw delErr;
          }
        }
        await LocalStorage.removePendingDeletedShopping(entityId).catch(() => {});
        return { success: true };
      }
    }

    // Entidad no implementada
    return { isFatal: true, error: `Entidad ${entity} no soportada en el despachador Outbox` };
  } catch (err: any) {
    const status = err?.status ?? 0;
    const errMsg = err?.message || 'Error de red o servidor';

    if (status === 401 || status === 403) {
      return { isAuth: true, status, error: `Fallo de autorización (${status}). Sesión suspendida.` };
    }

    if (status === 409) {
      return { isConflict: true, status, error: `Conflicto HTTP 409: ${errMsg}` };
    }

    if (status === 400 || status === 422) {
      return { isFatal: true, status, error: `Error de validación del cliente (${status}): ${errMsg}` };
    }

    // Errores transitorios: 408, 429, 5xx, status 0 (offline)
    return { isTransient: true, status, error: errMsg };
  }
}

/**
 * Despachador global secuencial FIFO de la cola Outbox.
 * Procesa mutaciones en estricto orden cronológico.
 */
export async function flushOutbox(): Promise<{ processed: number; remaining: number }> {
  if (isFlushing) {
    return { processed: 0, remaining: LocalStorage.getOutboxQueue().length };
  }

  const startUserId = LocalStorage.getCurrentUserId();
  if (!startUserId) {
    return { processed: 0, remaining: 0 };
  }

  isFlushing = true;
  let processedCount = 0;

  try {
    // 1. Recuperar cualquier mutación que haya quedado en 'processing' tras cierre abrupto
    await LocalStorage.recoverProcessingOutbox();

    let queue = LocalStorage.getOutboxQueue();
    // 2. Ordenar cronológicamente (FIFO global estricto)
    queue.sort((a, b) => a.createdAt - b.createdAt);

    // Registro de entidades bloqueadas para evitar procesar mutaciones dependientes
    const blockedEntityIds = new Set<string>();

    for (const mutation of queue) {
      if (LocalStorage.getCurrentUserId() !== startUserId) break;

      // Ignorar mutaciones en estados terminales
      if (mutation.status === 'failed' || mutation.status === 'conflict') {
        blockedEntityIds.add(mutation.entityId);
        continue;
      }

      // Si la entidad previa falló o está en conflicto, bloquear mutaciones dependientes
      if (blockedEntityIds.has(mutation.entityId)) {
        if (mutation.status !== 'blocked') {
          await LocalStorage.updateOutboxMutation(mutation.operationId, {
            status: 'blocked',
            lastError: 'Bloqueado por fallo en mutación previa de la misma entidad',
          });
        }
        continue;
      }

      // Si está bloqueada por auth (401/403), suspender toda la cola
      if (mutation.status === 'blocked') {
        break;
      }

      // Si está pendiente, verificar elegibilidad temporal (backoff)
      if (mutation.status === 'pending') {
        if (Date.now() < mutation.nextAttemptAt) {
          // Aún en periodo de retroceso: pausar avance FIFO global
          break;
        }

        // Marcar como processing
        const currentAttempt = mutation.attemptCount + 1;
        await LocalStorage.updateOutboxMutation(mutation.operationId, {
          status: 'processing',
          attemptCount: currentAttempt,
        });

        const result = await dispatchMutation(mutation);
        if (LocalStorage.getCurrentUserId() !== startUserId) break;

        if (result.success) {
          // Éxito confirmado: purgar de la cola
          await LocalStorage.removeOutboxMutation(mutation.operationId);
          processedCount++;
        } else if (result.isAuth) {
          // 401/403: marcar blocked y suspender cola
          await LocalStorage.updateOutboxMutation(mutation.operationId, {
            status: 'blocked',
            lastError: result.error,
          });
          break;
        } else if (result.isConflict) {
          // 404 en UPDATE: marcar conflict, no reintentar automáticamente
          await LocalStorage.updateOutboxMutation(mutation.operationId, {
            status: 'conflict',
            lastError: result.error,
          });
          blockedEntityIds.add(mutation.entityId);
        } else if (result.isFatal || currentAttempt >= MAX_ATTEMPTS) {
          // Error fatal o límite de reintentos excedido: marcar failed
          await LocalStorage.updateOutboxMutation(mutation.operationId, {
            status: 'failed',
            lastError: result.error || `Excedido límite de ${MAX_ATTEMPTS} reintentos`,
          });
          blockedEntityIds.add(mutation.entityId);
        } else {
          // Error transitorio: calcular backoff exponencial con jitter
          const delay = Math.min(1000 * Math.pow(2, currentAttempt), 60000) + Math.floor(Math.random() * 500);
          await LocalStorage.updateOutboxMutation(mutation.operationId, {
            status: 'pending',
            nextAttemptAt: Date.now() + delay,
            lastError: result.error,
          });
          // Suspender avance FIFO hasta que transcurra el backoff
          break;
        }
      }
    }
  } finally {
    isFlushing = false;
  }

  return {
    processed: processedCount,
    remaining: LocalStorage.getOutboxQueue().filter(
      (m) => m.status === 'pending' || m.status === 'processing'
    ).length,
  };
}

// Suscripción automática a renovación de sesión para desbloquear mutaciones suspendidas por 401/403
AuthService.subscribe((session) => {
  if (session?.accessToken && session?.user?.id) {
    const activeUserId = LocalStorage.getCurrentUserId();
    if (activeUserId && session.user.id === activeUserId) {
      const queue = LocalStorage.getOutboxQueue();
      const blockedAuthMutations = queue.filter(
        (m) =>
          m.status === 'blocked' &&
          m.userId === activeUserId &&
          (m.lastError?.includes('401') ||
            m.lastError?.includes('403') ||
            m.lastError?.includes('autorización'))
      );

      if (blockedAuthMutations.length > 0) {
        Promise.all(
          blockedAuthMutations.map((m) =>
            LocalStorage.updateOutboxMutation(m.operationId, {
              status: 'pending',
              nextAttemptAt: Date.now(),
            })
          )
        ).then(() => {
          flushOutbox().catch(() => {});
        });
      }
    }
  }
});
