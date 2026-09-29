import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

/**
 * HeroArt — ilustración grande de las pantallas completas (Escaneo-Estados / Recetas-Estados):
 * mancha orgánica 170×150, dos puntos decorativos y una baldosa de 80 con el icono.
 * La usan AiProgressScreen (IA trabajando) y StatusScreen (límite, error, permisos).
 */
export type HeroArtProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  blobColor: string;
  tileColor: string;
  iconColor: string;
  dotTopColor?: string;
  dotBottomColor?: string;
};

export function HeroArt({
  iconName,
  blobColor,
  tileColor,
  iconColor,
  dotTopColor = colors.primaryContainer,
  dotBottomColor = colors.secondaryContainer,
}: HeroArtProps) {
  return (
    <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.blob, { backgroundColor: blobColor }]} />
      <View style={[styles.dotTop, { backgroundColor: dotTopColor }]} />
      <View style={[styles.dotBottom, { backgroundColor: dotBottomColor }]} />
      <View style={[styles.tile, { backgroundColor: tileColor }]}>
        <Ionicons name={iconName} size={38} color={iconColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  art: {
    width: 190,
    height: 170,
  },
  blob: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: 170,
    height: 150,
    borderTopLeftRadius: 76,
    borderTopRightRadius: 88,
    borderBottomRightRadius: 70,
    borderBottomLeftRadius: 92,
  },
  dotTop: {
    position: 'absolute',
    right: 4,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  dotBottom: {
    position: 'absolute',
    left: 0,
    bottom: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  tile: {
    position: 'absolute',
    left: 55,
    top: 45,
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

