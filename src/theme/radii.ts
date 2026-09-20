/**
 * Warm Material Editorial Radii and Elevation Tokens
 *
 * Escala de formas orgánicas y elevaciones sutiles para Android.
 * Evita esquinas agresivas y sombras con halos artificiales de colores.
 */

export const radii = {
  // ─── Escala de Formas M3 ──────────────────────────────────────────────────
  chips: 10,        // 8–12dp: Chips de estado, etiquetas y filtros
  buttons: 14,      // 12–16dp: Botones de acción primaria y secundaria
  cards: 16,        // 14–18dp: Tarjetas de recetas, ingredientes e items
  containers: 22,   // 20–24dp: Contenedores principales y modales
  circular: 999,    // Circular completo para el botón de escaneo y avatares
} as const;

export const elevations = {
  // ─── Tonal Elevation y Sombras Neutras ─────────────────────────────────────
  none: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  sm: {
    elevation: 1,
    shadowColor: '#2B211D',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  md: {
    elevation: 2,
    shadowColor: '#2B211D',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  lg: {
    elevation: 4,
    shadowColor: '#2B211D',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
} as const;

export type ThemeRadii = typeof radii;
export type ThemeElevations = typeof elevations;
