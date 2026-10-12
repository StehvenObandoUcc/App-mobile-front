/**
 * Credenciales de un registro/inicio de sesión que espera verificación de correo.
 * Viven SOLO en memoria (variable de módulo): nunca en SecureStore, AsyncStorage, parámetros de ruta ni logs.
 * Si la app se reinicia se pierden y la pantalla de verificación vuelve a pedir la contraseña.
 */
type Pending = { email: string; password: string };

let pending: Pending | null = null;

function norm(email: string): string {
  return String(email ?? '').trim().toLowerCase();
}

export function setPending(email: string, password: string): void {
  pending = { email: norm(email), password };
}

/** Devuelve la contraseña pendiente solo si el correo coincide; si no, null. */
export function getPending(email: string): { email: string; password: string } | null {
  if (!pending || pending.email !== norm(email)) return null;
  return { ...pending };
}

export function clearPending(): void {
  pending = null;
}
