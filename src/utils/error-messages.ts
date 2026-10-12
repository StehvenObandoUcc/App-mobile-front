import { t } from '../i18n';
import { misc as esMisc } from '../i18n/es/misc';
import { misc as enMisc } from '../i18n/en/misc';

export type ErrorContext = 'scan' | 'recipes';

/** Texto de falta de conexión en español (referencia). Para comprobarlo en cualquier idioma usa isNetworkErrorMessage. */
export const NETWORK_ERROR_MESSAGE = esMisc.errors.network;

/** true si el mensaje (ya traducido, en español o inglés) es el de falta de conexión. */
export function isNetworkErrorMessage(message: string | null | undefined): boolean {
  return message === esMisc.errors.network || message === enMisc.errors.network;
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
    return t('misc.errors.network');
  }

  const status = error?.status;
  const code = typeof error?.code === 'string' ? error.code : null;

  if (code === 'daily_recipe_limit') {
    return t('misc.errors.dailyRecipeLimit');
  }

  if (code === 'no_coherent_recipe') {
    return t('misc.errors.noCoherentRecipe');
  }

  if (status === 429) {
    return t('misc.errors.rateLimit');
  }

  if (context === 'scan') {
    if (status === 504) {
      return t('misc.errors.scanTimeout');
    }
    if (status === 502) {
      return t('misc.errors.scanBadGateway');
    }
    return t('misc.errors.scanGeneric');
  }

  if (context === 'recipes') {
    if (status === 502 || status === 504) {
      return t('misc.errors.recipesGenerate');
    }
    return t('misc.errors.recipesGenerate');
  }

  return t('misc.errors.unexpected');
}
