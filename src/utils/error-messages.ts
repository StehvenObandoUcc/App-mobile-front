export type ErrorContext = 'scan' | 'recipes';

export interface AppError {
  message?: string;
  status?: number;
  isNetworkError?: boolean;
}

/**
 * Traduce errores de red y respuestas HTTP del backend a mensajes
 * estandarizados y amigables para el usuario (BUG-05).
 * Cero códigos numéricos ni mensajes crudos en la interfaz.
 */
export function getFriendlyErrorMessage(
  error: any,
  context: ErrorContext
): string {
  const isNetwork =
    error?.isNetworkError === true ||
    (error instanceof TypeError && String(error.message).toLowerCase().includes('network')) ||
    String(error?.message || '').toLowerCase().includes('network request failed');

  if (isNetwork) {
    return 'No hay conexión a internet. Revisa tu red e intenta de nuevo.';
  }

  const status = error?.status;

  if (status === 429) {
    return 'Estamos procesando muchas solicitudes. Espera un momento y vuelve a intentar.';
  }

  if (context === 'scan') {
    if (status === 504) {
      return 'El análisis tardó demasiado. Verifica tu conexión e intenta de nuevo.';
    }
    if (status === 502) {
      return 'No pudimos analizar tu foto. Intenta de nuevo en unos segundos.';
    }
    return 'No pudimos analizar tu foto. Intenta con mejor iluminación o más de cerca.';
  }

  if (context === 'recipes') {
    if (status === 502 || status === 504) {
      return 'No pudimos generar tus recetas en este momento. Intenta con menos recetas o vuelve a intentarlo.';
    }
    return 'No pudimos generar tus recetas en este momento. Intenta con menos recetas o vuelve a intentarlo.';
  }

  return 'Ocurrió un error inesperado. Por favor intenta de nuevo.';
}
