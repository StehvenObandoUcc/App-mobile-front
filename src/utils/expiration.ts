import type { ExpirationStatus } from '../types';
import { daysUntil } from './dates';
import { t } from '../i18n';

/**
 * Calcula el estado de caducidad y etiqueta legible a partir de una fecha 'YYYY-MM-DD'.
 * Usa días de calendario en hora LOCAL (utils/dates.ts): «mañana» es 1 aunque sean las 11 p. m.
 * Función pura desacoplada de la interfaz gráfica.
 */
export function getExpirationStatus(dateStr: string | null): {
  status: ExpirationStatus;
  label: string;
} {
  const diffDays = daysUntil(dateStr);
  if (diffDays === null) {
    return { status: 'unknown', label: t('misc.expiration.noDate') };
  }
  if (diffDays < 0) {
    return { status: 'expired', label: t('misc.expiration.expired') };
  }
  if (diffDays === 0) {
    return { status: 'expiringSoon', label: t('misc.expiration.expiresToday') };
  }
  if (diffDays <= 3) {
    return { status: 'expiringSoon', label: t('misc.expiration.expiresSoon', { days: diffDays }) };
  }
  return { status: 'fresh', label: t('misc.expiration.daysLeft', { days: diffDays }) };
}

/**
 * Días que faltan para vencer (días de calendario, hora local).
 * null si no hay fecha. Negativo si ya venció. Se usa en la cifra grande del ticket de IngredientCard.
 */
export function getDaysLeft(dateStr: string | null): number | null {
  return daysUntil(dateStr);
}
