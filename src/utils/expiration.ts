import { ExpirationStatus } from '../types';

/**
 * Calcula el estado de caducidad y etiqueta legible a partir de una fecha ISO.
 * Función pura desacoplada de la interfaz gráfica.
 */
export function getExpirationStatus(dateStr: string | null): {
  status: ExpirationStatus;
  label: string;
} {
  if (!dateStr) {
    return { status: 'unknown', label: 'Sin fecha' };
  }
  const diffDays = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
