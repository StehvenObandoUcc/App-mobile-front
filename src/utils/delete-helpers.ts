/**
 * delete-helpers.ts - Utilidades para resolución de eliminaciones pendientes (Anti-Zombies y HTTP 404).
 */

export class ApiError extends Error {
  status: number;
  isNetworkError: boolean;

  constructor(message: string, status: number, isNetworkError: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

export type DeleteResolutionResult =
  | {
      remoteResolved: true;
      pendingCleared: true;
      status: 200 | 204 | 404;
    }
  | {
      remoteResolved: true;
      pendingCleared: false;
      status: 200 | 204 | 404;
      localPersistenceError: true;
    }
  | {
      remoteResolved: false;
      pendingCleared: false;
      status?: number;
      isNetworkError?: boolean;
    };

/**
 * Ejecuta una operación de eliminación en la API y resuelve el conjunto de eliminaciones pendientes:
 * - HTTP 200/204: Éxito -> remueve el ID de pendientes.
 * - HTTP 404: Idempotente (el recurso ya no existe en el servidor) -> remueve el ID de pendientes y no reintenta.
 * - HTTP 401/403: No autorizado -> conserva en pendientes y emite advertencia de sesión.
 * - HTTP 408/429: Timeout HTTP / Límite de tasa -> conserva en pendientes sin bucle inmediato.
 * - HTTP 5xx: Error del servidor -> conserva en pendientes para reintento posterior.
 * - Error de red / Timeout: conserva en pendientes para reintento en reconexión.
 * - Fallo en removePendingFn: conserva en pendientes y no re-invoca la API en el mismo ciclo.
 *
 * @returns DeleteResolutionResult distinguiendo resolución remota y limpieza local.
 */
export async function executeDeleteWithPendingResolution(
  id: string,
  deleteFn: (id: string) => Promise<any>,
  removePendingFn: (id: string) => Promise<void>,
  entityLabel: string = 'Recurso'
): Promise<DeleteResolutionResult> {
  let remoteConfirmedStatus: 200 | 204 | 404 | null = null;

  try {
    const res = await deleteFn(id);
    remoteConfirmedStatus = res?.status === 204 ? 204 : 200;
  } catch (err: any) {
    const status = typeof err?.status === 'number' ? err.status : null;

    if (status === 404) {
      // HTTP 404: El recurso ya no existe en el servidor. Tratar como borrado confirmado (idempotente).
      remoteConfirmedStatus = 404;
    } else {
      if (status === 401 || status === 403) {
        console.warn(
          `[Sync] ${entityLabel} (${id}): Fallo de autorización (${status}). Se conserva pendiente hasta renovar sesión.`
        );
        return { remoteResolved: false, pendingCleared: false, status, isNetworkError: false };
      }

      if (status === 408 || status === 429) {
        console.warn(
          `[Sync] ${entityLabel} (${id}): Límite de tasa o timeout HTTP (${status}). Se conserva pendiente sin reintento inmediato.`
        );
        return { remoteResolved: false, pendingCleared: false, status, isNetworkError: false };
      }

      if (status !== null && status >= 500) {
        console.warn(
          `[Sync] ${entityLabel} (${id}): Error del servidor (${status}). Se conserva pendiente para reintento.`
        );
        return { remoteResolved: false, pendingCleared: false, status, isNetworkError: false };
      }

      if (err?.isNetworkError || status === 0) {
        // Error de red / timeout: conservar en pendientes silenciosamente para la próxima reconexión
        return { remoteResolved: false, pendingCleared: false, status: 0, isNetworkError: true };
      }

      console.warn(
        `[Sync] ${entityLabel} (${id}): Error inesperado (${status ?? 'red'}). Se conserva pendiente.`
      );
      return {
        remoteResolved: false,
        pendingCleared: false,
        status: status ?? undefined,
        isNetworkError: !!err?.isNetworkError,
      };
    }
  }

  // Servidor confirmó borrado (200, 204 o 404).
  // Procedemos a limpiar localmente el pending. Si falla la persistencia local,
  // NO volvemos a invocar deleteFn y conservamos el ID en pendientes.
  try {
    await removePendingFn(id);
    return {
      remoteResolved: true,
      pendingCleared: true,
      status: remoteConfirmedStatus,
    };
  } catch (localErr: any) {
    console.warn(
      `[Sync] ${entityLabel} (${id}): Servidor confirmó borrado (${remoteConfirmedStatus}), pero falló la limpieza local de pendientes. Se conserva ID para recuperación.`
    );
    return {
      remoteResolved: true,
      pendingCleared: false,
      status: remoteConfirmedStatus,
      localPersistenceError: true,
    };
  }
}
