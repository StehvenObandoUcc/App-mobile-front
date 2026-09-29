import React, { forwardRef } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  TextProps,
  TextInputProps,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { fontStyle, TextWeight } from './AppText';

/**
 * Text y TextInput de la app (reemplazan a los de react-native en pantallas y componentes).
 *
 * Por qué existen: en Android una fuente personalizada NO interpola `fontWeight`; cada peso es
 * un archivo distinto (Outfit-Light, Outfit-SemiBold…). Estos envoltorios leen el `fontWeight`
 * del estilo y lo convierten en la familia Outfit correcta. Así todos los textos existentes
 * usan la fuente de marca sin reescribir sus estilos. Si Outfit no cargó, se usa la del sistema.
 */
function weightFromStyle(style: TextStyle['fontWeight'] | undefined): TextWeight | undefined {
  if (style === undefined || style === null) return undefined;
  const w = String(style);
  if (w === 'normal') return 'regular';
  if (w === 'bold') return 'bold';
  const n = parseInt(w, 10);
  if (Number.isNaN(n)) return undefined;
  if (n <= 300) return 'light';
  if (n <= 400) return 'regular';
  if (n <= 500) return 'medium';
  if (n <= 600) return 'semibold';
  return 'bold';
}

function resolveFont(style: TextProps['style'], fallback?: TextWeight): TextStyle | null {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  if (flat?.fontFamily) return null; // estilo con familia explícita: respetarlo
  const weight = weightFromStyle(flat?.fontWeight) ?? fallback;
  return weight ? fontStyle(weight) : null;
}

export function Text({ style, ...rest }: TextProps) {
  // Sin peso explícito se usa Outfit Regular (los textos anidados heredan la familia del padre
  // solo si tampoco declaran peso; por eso aquí no se fuerza nada cuando no hay estilo).
  const font = resolveFont(style, style ? 'regular' : undefined);
  return <RNText {...rest} style={font ? [style, font] : style} />;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  const font = resolveFont(style, 'regular');
  return <RNTextInput ref={ref} {...rest} style={font ? [style, font] : style} />;
});
