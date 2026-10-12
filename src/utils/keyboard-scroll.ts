/**
 * Cuánto hay que desplazar un ScrollView para que un campo enfocado quede visible
 * por encima del teclado, con un margen. Lógica pura (sin React Native).
 */

/** Margen entre el campo y el borde del área visible. */
export const FIELD_VISIBLE_MARGIN = 24;

export type FieldBox = {
  /** Posición superior del campo respecto al borde superior del área visible (puede ser negativa). */
  top: number;
  height: number;
  /** Alto del área visible (ya sin el teclado). */
  viewportHeight: number;
  margin?: number;
};

/** Desplazamiento a sumar al scroll actual: positivo baja el contenido, negativo lo sube, 0 si ya se ve. */
export function computeScrollDelta({ top, height, viewportHeight, margin = FIELD_VISIBLE_MARGIN }: FieldBox): number {
  if (viewportHeight <= 0) return 0;
  if (top < margin) return top - margin;
  const overflow = top + height + margin - viewportHeight;
  if (overflow <= 0) return 0;
  // Un campo más alto que el área visible prioriza su parte superior.
  return Math.min(overflow, top - margin);
}
