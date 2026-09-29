import type { ExpirationStatus } from '../types';
import { daysUntil } from './dates';

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
    return { status: 'unknown', label: 'Sin fecha' };
  }
  if (diffDays < 0) {
    return { status: 'expired', label: 'Vencido' };
  }
  if (diffDays === 0) {
    return { status: 'expiringSoon', label: 'Vence hoy' };
  }
  if (diffDays <= 3) {
    return { status: 'expiringSoon', label: `Vence en ${diffDays}d` };
  }
  return { status: 'fresh', label: `${diffDays}d restantes` };
}

/**
 * Días que faltan para vencer (días de calendario, hora local).
 * null si no hay fecha. Negativo si ya venció. Se usa en la cifra grande del ticket de IngredientCard.
 */
export function getDaysLeft(dateStr: string | null): number | null {
  return daysUntil(dateStr);
}
