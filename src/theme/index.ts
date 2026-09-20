import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SCREEN = { WIDTH: SCREEN_WIDTH, HEIGHT: SCREEN_HEIGHT };

// ─── Palette ──────────────────────────────────────────────────────────────────
export const COLORS = {
  // Brand greens
  primary:     '#1B4332',
  primaryMid:  '#2D6A4F',
  primaryLight:'#40916C',
  accent:      '#52B788',
  accentLight: '#74C69D',

  // Warm accent
  orange:  '#F4A261',
  orangeDeep: '#E76F51',

  // Neutrals
  bg:         '#F0F4F1',
  surface:    '#FFFFFF',
  surfaceAlt: '#EAF2EC',
  border:     '#D4E6D9',

  // Text
  textPrimary:   '#1A2E22',
  textSecondary: '#5A7468',
  textMuted:     '#9BB8A8',

  // Status
  success: '#34C759',
  warning: '#FF9500',
  danger:  '#FF3B30',

  // Gradients (start → end)
  gradientHero:    ['#1B4332', '#40916C'] as [string, string],
  gradientCard:    ['#2D6A4F', '#52B788'] as [string, string],
  gradientWarm:    ['#F4A261', '#E76F51'] as [string, string],
  gradientSurface: ['#FFFFFF', '#EAF2EC'] as [string, string],
};

// ─── Typography ──────────────────────────────────────────────────────────────
export const FONT = {
  sizes: {
    xs:  11,
    sm:  13,
    md:  15,
    lg:  17,
    xl:  20,
    xxl: 24,
    h1:  32,
    h2:  28,
  },
  weights: {
    regular: '400' as const,
    medium:  '500' as const,
    semibold:'600' as const,
    bold:    '700' as const,
    heavy:   '800' as const,
  },
};

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// ─── Radius ──────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  pill: 999,
};

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const SHADOW = {
  sm: {
    shadowColor: '#1B4332',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#1B4332',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  lg: {
    shadowColor: '#1B4332',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  }),
};
