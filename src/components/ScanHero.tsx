import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radii } from '../theme';

/**
 * ScanHero — tarjeta principal del Inicio (Inicio.dc.html).
 * Fondo cacao, anillo decorativo, chip «IA de visión», título 26/32 300 + 600 y botón squircle tomate 64.
 * Toda la tarjeta abre el escáner.
 */
export type ScanHeroProps = {
  onPress: () => void;
};

export function ScanHero({ onPress }: ScanHeroProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Escanear alimentos con la cámara. Toma una foto para detectar ingredientes y actualizar tu despensa."
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.ring} pointerEvents="none" />

      <View style={styles.badge}>
        <Ionicons name="sparkles" size={14} color={colors.m3.inversePrimary} />
        <AppText variant="label" uppercase color={colors.m3.inversePrimary} style={styles.badgeText}>
          IA de visión
        </AppText>
      </View>

      <View style={styles.row}>
        <View style={styles.texts}>
          <AppText weight="light" color={colors.textInverse} style={styles.title}>
            Escanea tus <AppText weight="semibold">alimentos</AppText>
          </AppText>
          <AppText variant="bodySmall" color="#E4D9D0">
            Toma una foto para detectar ingredientes y actualizar tu despensa al instante.
          </AppText>
        </View>
        <View style={styles.fab}>
          <Ionicons name="scan-outline" size={30} color={colors.ink} />
          <View style={styles.fabLens} />
        </View>
      </View>
    </Pressable>
  );
}

const RING = '#603A2E'; // tono cacao más claro del mockup (decorativo)

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.tiles,
    backgroundColor: colors.ink,
    padding: 22,
    gap: 10,
    overflow: 'hidden',
  },
  pressed: {
    backgroundColor: colors.inkPressed,
  },
  ring: {
    position: 'absolute',
    right: -36,
    top: -36,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 22,
    borderColor: RING,
  },
  badge: {
    alignSelf: 'flex-start',
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: radii.pill,
    backgroundColor: RING,
  },
  badgeText: {
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  texts: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLens: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
