import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';

/** CountTile — ficha de conteo (Compras: «Por comprar 5» durazno · «Comprados 3» salvia). Radio 28, cifra 40. */
export type CountTileProps = {
  label: string;
  value: number;
  tone: { background: string; text: string };
};

export function CountTile({ label, value, tone }: CountTileProps) {
  return (
    <View style={[styles.tile, { backgroundColor: tone.background }]} accessibilityRole="text" accessibilityLabel={`${label}: ${value}`}>
      <AppText weight="medium" color={tone.text} style={styles.label}>
        {label}
      </AppText>
      <AppText weight="medium" color={tone.text} style={styles.value}>
        {String(value)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 6,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
  },
  value: {
    fontSize: 40,
    lineHeight: 44,
  },
});
