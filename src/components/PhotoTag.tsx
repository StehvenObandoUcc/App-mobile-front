import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radii } from '../theme';

/**
 * PhotoTag — etiqueta sobre una foto con línea guía y punto (Bienvenida-Fotos.dc.html).
 * Las coordenadas vienen del mockup (lienzo de 390 dp) y se multiplican por `scale`.
 * tone 'ai' = píldora frambuesa con destello (dato de la IA).
 */
export type PhotoTagSpec = {
  label: string;
  pill: [number, number];
  /** Línea guía: x, y, alto. Sin línea = solo la píldora. */
  line?: [number, number, number];
  tone?: 'plain' | 'ai';
};

export function PhotoTag({ spec, scale }: { spec: PhotoTagSpec; scale: number }) {
  const ai = spec.tone === 'ai';
  return (
    <>
      {spec.line && (
        <>
          <View
            style={[
              styles.line,
              { left: spec.line[0] * scale, top: spec.line[1] * scale, height: spec.line[2] * scale },
            ]}
          />
          <View
            style={[
              styles.dotRing,
              { left: (spec.line[0] - 8) * scale, top: (spec.line[1] + spec.line[2] - 9) * scale },
            ]}
          >
            <View style={styles.dot} />
          </View>
        </>
      )}
      <View style={[styles.pill, ai && styles.pillAi, { left: spec.pill[0] * scale, top: spec.pill[1] * scale }]}>
        {ai && <Ionicons name="sparkles" size={15} color={colors.onTertiaryContainer} />}
        <AppText
          weight="semibold"
          color={ai ? colors.onTertiaryContainer : colors.textPrimary}
          style={ai ? styles.textAi : styles.text}
          numberOfLines={1}
        >
          {spec.label}
        </AppText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    width: 2,
    backgroundColor: colors.textInverse,
  },
  // Punto blanco de 12 con anillo tomate de 3 (box-shadow del mockup)
  dotRing: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.textInverse,
  },
  pill: {
    position: 'absolute',
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  pillAi: {
    paddingLeft: 10,
    paddingRight: 14,
    backgroundColor: colors.tertiaryContainer,
  },
  text: {
    fontSize: 13,
    lineHeight: 17,
  },
  textAi: {
    fontSize: 14,
    lineHeight: 18,
  },
});
