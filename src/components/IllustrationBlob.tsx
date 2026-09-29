import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme';

/**
 * Ilustración de estados (Componentes.dc.html · EmptyState / ErrorState).
 * Mancha pastel orgánica + círculo blanco con icono + puntos decorativos.
 * tone: fresh (salvia) · neutral (avena) · ai (frambuesa) · error (chile) · brand (durazno)
 */
export type BlobTone = 'fresh' | 'neutral' | 'ai' | 'error' | 'brand';

const TONES: Record<BlobTone, { blob: string; icon: string; dots: boolean }> = {
  fresh: { blob: colors.secondaryContainer, icon: colors.onSecondaryContainer, dots: true },
  neutral: { blob: colors.m3.surfaceContainer, icon: colors.functional.unknown.text, dots: false },
  ai: { blob: colors.tertiaryContainer, icon: colors.tertiary, dots: true },
  error: { blob: colors.error.background, icon: colors.error.text, dots: false },
  brand: { blob: colors.primaryContainer, icon: colors.primary, dots: true },
};

export type IllustrationBlobProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  tone?: BlobTone;
  /** 'md' = 120×104 (estados dentro de lista) · 'lg' = 150×128 (pantalla completa) */
  size?: 'md' | 'lg';
};

export function IllustrationBlob({ iconName, tone = 'fresh', size = 'md' }: IllustrationBlobProps) {
  const t = TONES[tone];
  const lg = size === 'lg';
  const k = lg ? 1.25 : 1;
  return (
    <View style={{ width: 120 * k, height: 104 * k }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View
        style={[
          styles.blob,
          {
            left: 6 * k,
            top: 8 * k,
            width: 104 * k,
            height: 88 * k,
            backgroundColor: t.blob,
            // Forma orgánica: radios distintos por esquina (44 52 40 56 en el mockup)
            borderTopLeftRadius: (tone === 'error' ? 52 : 44) * k,
            borderTopRightRadius: (tone === 'error' ? 40 : 52) * k,
            borderBottomRightRadius: (tone === 'error' ? 56 : 40) * k,
            borderBottomLeftRadius: (tone === 'error' ? 44 : 56) * k,
          },
        ]}
      />
      {t.dots && (
        <>
          <View style={[styles.dot, { right: 0, top: 0, width: 34 * k, height: 34 * k, backgroundColor: colors.categories.grain.background }]} />
          {lg && <View style={[styles.dot, { left: 4, bottom: 6, width: 26, height: 26, backgroundColor: colors.primaryContainer }]} />}
        </>
      )}
      <View style={[styles.iconCircle, { left: 32 * k, top: 24 * k, width: 56 * k, height: 56 * k }]}>
        <Ionicons name={iconName} size={28 * k} color={t.icon} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute' },
  dot: { position: 'absolute', borderRadius: radii.circular },
  iconCircle: {
    position: 'absolute',
    borderRadius: radii.circular,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
