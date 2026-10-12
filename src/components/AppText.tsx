import React, { createContext, useContext } from 'react';
import { Text, TextProps, StyleProp, TextStyle } from 'react-native';
import { typography } from '../theme';
import { useTheme, makeStyles } from '../theme/ThemeProvider';
import { fontFamilyFor } from '../utils/brand-font';

/**
 * Átomo de texto — escala tipográfica de Fundamentos.dc.html (Outfit).
 *
 * En Android una familia personalizada no interpola `fontWeight`: cada peso es un archivo.
 * Por eso el peso se resuelve a `fontFamily` (Outfit-Light, Outfit-SemiBold…) y solo si la
 * fuente no cargó se manda `fontWeight` para que la del sistema mantenga la jerarquía.
 *
 * Títulos con contraste de peso (mockups): <AppText variant="screenTitle">Mi <AppText weight="semibold">Despensa</AppText></AppText>
 */
export type TextVariant =
  | 'displayNumber'
  | 'ticketNumber'
  | 'screenTitle'
  | 'headline'
  | 'sectionTitle'
  | 'cardTitle'
  | 'body'
  | 'bodySmall'
  | 'metadata'
  | 'label'
  | 'caption'
  | 'micro';

export type TextWeight = keyof typeof typography.weights;

type VariantSpec = { size: number; lineHeight: number; weight: TextWeight; letterSpacing?: number };

const VARIANTS: Record<TextVariant, VariantSpec> = {
  displayNumber: { size: typography.sizes.displayNumber, lineHeight: typography.lineHeights.displayNumber, weight: 'medium' },
  ticketNumber: { size: typography.sizes.ticketNumber, lineHeight: typography.lineHeights.ticketNumber, weight: 'medium' },
  screenTitle: { size: typography.sizes.screenTitle, lineHeight: typography.lineHeights.screenTitle, weight: 'light' },
  headline: { size: typography.sizes.headline, lineHeight: typography.lineHeights.headline, weight: 'medium' },
  sectionTitle: { size: typography.sizes.sectionTitle, lineHeight: typography.lineHeights.sectionTitle, weight: 'semibold' },
  cardTitle: { size: typography.sizes.cardTitle, lineHeight: typography.lineHeights.cardTitle, weight: 'semibold' },
  body: { size: typography.sizes.body, lineHeight: typography.lineHeights.body, weight: 'regular' },
  bodySmall: { size: typography.sizes.bodySmall, lineHeight: typography.lineHeights.bodySmall, weight: 'regular' },
  metadata: { size: typography.sizes.metadata, lineHeight: typography.lineHeights.metadata, weight: 'medium' },
  label: {
    size: typography.sizes.label,
    lineHeight: typography.lineHeights.label,
    weight: 'semibold',
    letterSpacing: typography.letterSpacing.label,
  },
  caption: { size: typography.sizes.caption, lineHeight: typography.lineHeights.caption, weight: 'regular' },
  micro: { size: typography.sizes.micro, lineHeight: typography.lineHeights.micro, weight: 'bold' },
};

/**
 * true dentro de un texto: los textos anidados heredan el color del padre (énfasis en un título).
 * Un texto de primer nivel sin color recibe `textPrimary` del tema, nunca el negro por defecto
 * de Android (que en modo oscuro quedaría invisible).
 */
export const InsideText = createContext(false);

/** Estilo de fuente para un peso: familia Outfit si cargó; si no, fontWeight del sistema. */
export function fontStyle(weight: TextWeight): TextStyle {
  const family = fontFamilyFor(weight);
  return family ? { fontFamily: family, fontWeight: 'normal' } : { fontWeight: typography.weights[weight] };
}

export type AppTextProps = TextProps & {
  /** Si se omite, el texto hereda tamaño del padre (útil para énfasis dentro de un título). */
  variant?: TextVariant;
  weight?: TextWeight;
  color?: string;
  align?: TextStyle['textAlign'];
  uppercase?: boolean;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
};

export function AppText({
  variant,
  weight,
  color,
  align,
  uppercase,
  style,
  children,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const nested = useContext(InsideText);
  const spec = variant ? VARIANTS[variant] : undefined;
  const resolvedWeight = weight ?? spec?.weight;

  // includeFontPadding: evita el relleno extra de Android que descuadra el centrado en botones y chips.
  const base: TextStyle = { includeFontPadding: false };
  if (spec) {
    base.fontSize = spec.size;
    base.lineHeight = spec.lineHeight;
    if (spec.letterSpacing) base.letterSpacing = spec.letterSpacing;
    base.color = colors.textPrimary;
  }
  if (!spec && !color && !nested) base.color = colors.textPrimary;
  if (color) base.color = color;
  if (align) base.textAlign = align;
  if (uppercase) base.textTransform = 'uppercase';

  return (
    <Text
      {...rest}
      style={[base, resolvedWeight ? fontStyle(resolvedWeight) : null, style]}
    >
      <InsideText.Provider value={true}>{children}</InsideText.Provider>
    </Text>
  );
}
