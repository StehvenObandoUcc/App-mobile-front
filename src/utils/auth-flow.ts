/**
 * Utilidades puras del flujo de cuenta (verificar correo, recuperar contraseña).
 * Sin imports de react-native/expo para poder probarlas en Node (tests/auth_flow.test.mjs).
 */

export const CODE_LENGTH = 6;
export const MIN_PASSWORD_LENGTH = 8;
export const RESEND_SECONDS = 60;

export type ParsedAuthError = {
  status: number;
  code?: string;
  message: string;
};

/**
 * Normaliza el cuerpo de error del backend. Acepta `detail: {code, message}` (nuevo),
 * `detail: "texto"` (modo local) o cuerpos vacíos / no JSON. Si no hay mensaje usa `fallback`.
 */
export function parseAuthError(status: number, body: unknown, fallback: string = ''): ParsedAuthError {
  const detail = body && typeof body === 'object' ? (body as { detail?: unknown }).detail : undefined;
  let code: string | undefined;
  let message = '';

  if (typeof detail === 'string') {
    message = detail.trim();
  } else if (detail && typeof detail === 'object') {
    const d = detail as { code?: unknown; message?: unknown };
    if (typeof d.code === 'string' && d.code.trim()) code = d.code.trim();
    if (typeof d.message === 'string') message = d.message.trim();
  }

  const result: ParsedAuthError = { status, message: message || fallback };
  if (code) result.code = code;
  return result;
}

/** Deja solo dígitos y corta a 6. */
export function sanitizeCode(input: string): string {
  return String(input ?? '').replace(/\D/g, '').slice(0, CODE_LENGTH);
}

/** Código válido: exactamente 6 dígitos. */
export function isValidCode(code: string): boolean {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(String(code ?? ''));
}

/** Contraseña con al menos 8 caracteres. */
export function isStrongEnough(password: string): boolean {
  return String(password ?? '').length >= MIN_PASSWORD_LENGTH;
}

/** Segundos que faltan hasta `untilMs` (nunca negativo), redondeado hacia arriba. */
export function secondsLeft(untilMs: number, nowMs: number): number {
  const diff = untilMs - nowMs;
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.ceil(diff / 1000);
}
