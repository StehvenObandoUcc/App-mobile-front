/**
 * Lógica pura del deslizamiento horizontal (login: «Iniciar sesión» ↔ «Crear cuenta»).
 * Sin dependencias de React Native para poder probarla con `node --test`.
 */

/** Movimiento mínimo (dp) antes de reclamar el gesto. */
export const SWIPE_ACTIVATE_DX = 12;
/** |dx| debe superar |dy| × este factor para no robar el scroll vertical. */
export const SWIPE_AXIS_RATIO = 1.5;
/** Fracción del ancho que confirma el cambio al soltar. */
export const SWIPE_COMMIT_FRACTION = 0.25;
/** Velocidad (dp/ms) que confirma el cambio aunque el recorrido sea corto. */
export const SWIPE_COMMIT_VELOCITY = 0.5;
/** El contenido sigue al dedo con resistencia y un tope. */
export const SWIPE_RESISTANCE = 0.35;
export const SWIPE_MAX_TRANSLATE = 60;

/** +1 = hacia la izquierda (pasa al siguiente) · -1 = hacia la derecha (vuelve al anterior). */
export type SwipeDirection = -1 | 1;

/** ¿El movimiento ya es un deslizamiento horizontal que debe reclamar el gesto? */
export function shouldCaptureHorizontal(dx: number, dy: number): boolean {
  return Math.abs(dx) > SWIPE_ACTIVATE_DX && Math.abs(dx) > Math.abs(dy) * SWIPE_AXIS_RATIO;
}

/** Dirección de un desplazamiento dx (negativo = izquierda = +1). 0 si no hay movimiento. */
export function directionOf(dx: number): SwipeDirection | 0 {
  if (dx < 0) return 1;
  if (dx > 0) return -1;
  return 0;
}

/** Traslación del contenido mientras el dedo arrastra: dx × 0.35 con tope ±60. */
export function dragTranslate(dx: number): number {
  const v = dx * SWIPE_RESISTANCE;
  return Math.max(-SWIPE_MAX_TRANSLATE, Math.min(SWIPE_MAX_TRANSLATE, v));
}

/**
 * Al soltar: ¿cambia de modo? Devuelve la dirección (+1 siguiente, -1 anterior) o 0 si vuelve al sitio.
 * Cambia si |dx| supera (estrictamente) el 25 % del ancho o la velocidad |vx| supera 0.5.
 */
export function resolveSwipe(dx: number, vx: number, width: number): SwipeDirection | 0 {
  const dir = directionOf(dx);
  if (dir === 0) return 0;
  const farEnough = width > 0 && Math.abs(dx) > width * SWIPE_COMMIT_FRACTION;
  const fastEnough = Math.abs(vx) > SWIPE_COMMIT_VELOCITY;
  return farEnough || fastEnough ? dir : 0;
}
