/**
 * Warm Material Editorial Color Tokens
 *
 * Combina Material 3 (tonal surfaces) con calidez editorial gastronómica.
 * El verde queda restringido estrictamente a estados funcionales de frescura.
 */

export const colors = {
  // ─── Superficies y Fondos ──────────────────────────────────────────────────
  background: '#FFF9F2',        // Crema cálido general
  surface: '#FFFFFF',           // Blanco puro para tarjetas prioritarias
  surfaceVariant: '#F8EDE2',    // Tono arena suave para agrupaciones y contenedores
  surfaceSubtle: '#FBF4ED',     // Tono intermedio muy suave para fondos secundarios

  // ─── Marca y Acciones Principales ──────────────────────────────────────────
  primary: '#B94E35',           // Terracota cálido (acción principal)
  primaryDark: '#863626',       // Terracota profundo (estados presionados, títulos)
  primaryContainer: '#FBE9E2',  // Durazno / Contenedor contextual primario

  // ─── Acentos Secundarios ───────────────────────────────────────────────────
  secondary: '#E58A45',         // Naranja cálido / Melocotón tostado
  secondaryDark: '#B26223',     // Tono tostado profundo
  secondaryContainer: '#FFF1E3',// Crema durazno suave para sugerencias

  // ─── Textos de Alto Contraste ──────────────────────────────────────────────
  textPrimary: '#2B211D',       // Café carbón (WCAG AAA > 12:1)
  textSecondary: '#66534A',     // Café medio terroso (WCAG AA > 4.6:1)
  textMuted: '#96857C',         // Tono café claro para placeholders y notas auxiliares
  textInverse: '#FFFFFF',       // Blanco puro sobre fondos oscuros/primarios

  // ─── Bordes y Líneas Divisorias ────────────────────────────────────────────
  border: '#EBDDD2',            // Borde sutil cálido
  borderStrong: '#D6C4B6',      // Borde enfático para inputs activos o separadores

  // ─── Estados Funcionales (Caducidad y Notificaciones) ──────────────────────
  functional: {
    fresh: {
      background: '#EAF4ED',
      border: '#C2DFCB',
      text: '#28613C',
    },
    expiringSoon: {
      background: '#FFF2D7',
      border: '#F8DC9E',
      text: '#8A5A00',
    },
    expired: {
      background: '#FBE5E3',
      border: '#F4BCB8',
      text: '#A93632',
    },
    unknown: {
      background: '#F1ECE7',
      border: '#DED6CE',
      text: '#665B54',
    },
  },
} as const;

export type ThemeColors = typeof colors;
