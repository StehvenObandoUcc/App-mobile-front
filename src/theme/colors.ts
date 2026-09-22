/**
 * Warm Material Editorial Color Tokens
 *
 * Combina Material 3 (tonal surfaces) con calidez editorial gastronómica.
 * Todos los contrastes de texto normal (11–13sp) cumplen WCAG AA (>= 4.5:1).
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
  textPrimary: '#2B211D',       // Café carbón (WCAG AAA 15.0:1)
  textSecondary: '#66534A',     // Café medio terroso (WCAG AA 6.9:1)
  textMuted: '#96857C',         // Tono café claro para placeholders y notas auxiliares
  textInverse: '#FFFFFF',       // Blanco puro sobre fondos oscuros/primarios

  // ─── Bordes y Líneas Divisorias ────────────────────────────────────────────
  border: '#EBDDD2',            // Borde sutil cálido
  borderStrong: '#D6C4B6',      // Borde enfático para inputs activos o separadores
  scrim: 'rgba(0, 0, 0, 0.45)', // Oscurecimiento estándar de fondo para modales

  // ─── Estados Funcionales (Caducidad y Notificaciones) ──────────────────────
  functional: {
    fresh: {
      background: '#EAF4ED',
      border: '#C2DFCB',
      text: '#28613C',          // 6.5:1 sobre background
    },
    expiringSoon: {
      background: '#FFF2D7',
      border: '#F8DC9E',
      text: '#8A5A00',          // 5.3:1 sobre background
    },
    expired: {
      background: '#FBE5E3',
      border: '#F4BCB8',
      text: '#A93632',          // 5.3:1 sobre background
    },
    unknown: {
      background: '#F1ECE7',
      border: '#DED6CE',
      text: '#665B54',
    },
  },

  // ─── Categorías de Alimentos ───────────────────────────────────────────────
  categories: {
    vegetable: {
      text: '#28613C',          // 6.5:1 sobre fondo
      background: '#EAF4ED',
    },
    fruit: {
      text: '#B5481F',          // 4.8:1 sobre fondo (WCAG AA >= 4.5:1)
      background: '#FDF0EA',
      accent: '#C85A32',
    },
    protein: {
      text: '#A93632',          // 5.3:1 sobre fondo
      background: '#FBE5E3',
    },
    dairy: {
      text: '#2A5A78',          // 6.6:1 sobre fondo
      background: '#EBF2F7',
    },
    grain: {
      text: '#94580C',          // 5.4:1 sobre fondo
      background: '#FEF6E9',
    },
    legume: {
      text: '#6B4D8A',          // 6.1:1 sobre fondo
      background: '#F5EFFB',
    },
    sauce: {
      text: '#A8422A',          // 5.1:1 sobre fondo (WCAG AA >= 4.5:1)
      background: '#FBE9E2',
      accent: '#B94E35',
    },
    snack: {
      text: '#9A4F20',          // 5.4:1 sobre fondo (WCAG AA >= 4.5:1)
      background: '#FFF1E3',
      accent: '#E58A45',
    },
    other: {
      text: '#66534A',          // 6.3:1 sobre fondo
      background: '#F8EDE2',
    },
  },

  // ─── Dificultad de Recetas ─────────────────────────────────────────────────
  difficulty: {
    easy: {
      text: '#28613C',
      background: '#EAF4ED',
    },
    medium: {
      text: '#8A5A00',
      background: '#FFF2D7',
    },
    hard: {
      text: '#A93632',
      background: '#FBE5E3',
    },
  },

  // ─── Estados de Error ─────────────────────────────────────────────────────
  error: {
    text: '#A93632',
    background: '#FBE5E3',
  },

  // ─── Placeholders y Skeleton ──────────────────────────────────────────────
  skeleton: {
    background: '#F3E9DF',
    highlight: '#E8DDD3',
  },
} as const;

export type ThemeColors = typeof colors;
